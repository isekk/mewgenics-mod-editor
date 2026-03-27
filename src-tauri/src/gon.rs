#![allow(dead_code)]
use indexmap::IndexMap;
use std::fs;

#[derive(Debug, Clone, PartialEq)]
pub enum GonValue {
    Null,
    String(String),
    Number(f64),
    Bool(bool),
    Object(IndexMap<String, GonObject>),
    Array(Vec<GonObject>),
}

#[derive(Debug, Clone, PartialEq)]
pub struct GonObject {
    pub name: String,
    pub value: GonValue,
}

impl GonObject {
    pub fn new(name: &str, value: GonValue) -> Self {
        Self {
            name: name.to_string(),
            value,
        }
    }

    pub fn null() -> Self {
        Self::new("", GonValue::Null)
    }

    // Accessors

    pub fn as_f64(&self, default: f64) -> f64 {
        match &self.value {
            GonValue::Number(n) => *n,
            GonValue::String(s) => s.parse().unwrap_or(default),
            _ => default,
        }
    }

    pub fn as_i32(&self, default: i32) -> i32 {
        self.as_f64(default as f64) as i32
    }

    pub fn as_str(&self, default: &str) -> String {
        match &self.value {
            GonValue::String(s) => s.clone(),
            GonValue::Number(n) => n.to_string(),
            GonValue::Bool(b) => b.to_string(),
            _ => default.to_string(),
        }
    }

    pub fn as_bool(&self, default: bool) -> bool {
        match &self.value {
            GonValue::Bool(b) => *b,
            GonValue::String(s) => s.parse().unwrap_or(default),
            _ => default,
        }
    }

    pub fn get(&self, key: &str) -> &GonObject {
        if let GonValue::Object(map) = &self.value {
            map.get(key).unwrap_or(&GON_NULL)
        } else {
            &GON_NULL
        }
    }

    pub fn get_index(&self, index: usize) -> &GonObject {
        match &self.value {
            GonValue::Array(arr) => arr.get(index).unwrap_or(&GON_NULL),
            GonValue::Object(map) => map.get_index(index).map(|(_, v)| v).unwrap_or(&GON_NULL),
            _ => &GON_NULL,
        }
    }

    // Parser

    pub fn load(path: &str) -> Result<Self, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        Self::from_str(&content)
    }

    pub fn from_str(input: &str) -> Result<Self, String> {
        let tokens = tokenize(input);
        let mut stream = TokenStream::new(tokens);
        let mut root_map = IndexMap::new();

        while stream.peek().is_some() {
            if let Some(name_token) = stream.next().cloned() {
                // 如果直接遇到 } 说明是空对象或者解析错位，这里做容错
                if name_token == "}" || name_token == "]" {
                    continue;
                }

                let val = parse_value(&mut stream)?;
                root_map.insert(name_token.clone(), GonObject::new(&name_token, val));
            }
        }

        Ok(GonObject::new("", GonValue::Object(root_map)))
    }

    // Merging

    pub fn patch_merge(&mut self, patch: &GonObject) {
        let (_patch_name, mode) = parse_suffix(&patch.name);

        match (&mut self.value, &patch.value) {
            (GonValue::Object(_), GonValue::Object(patch_map)) => {
                if mode == "overwrite" {
                    let mut new_patch = patch.clone();
                    new_patch.strip_suffixes();
                    *self = new_patch;
                } else {
                    // 先收集匿名键，避免借用冲突
                    let anonymous_keys: Vec<_> = patch_map
                        .iter()
                        .filter_map(|(k, v)| {
                            let (clean, m) = parse_suffix(k);
                            if clean.is_empty() && m != "default" {
                                Some(v.clone())
                            } else {
                                None
                            }
                        })
                        .collect();

                    // 处理匿名键
                    for anon_val in anonymous_keys {
                        self.patch_merge(&anon_val);
                    }

                    // 处理普通键
                    if let GonValue::Object(self_map) = &mut self.value {
                        for (p_key, p_val) in patch_map.iter() {
                            let (p_clean, p_mode) = parse_suffix(p_key);
                            
                            // 跳过匿名键（已处理）
                            if p_clean.is_empty() && p_mode != "default" {
                                continue;
                            }

                            if (mode == "merge" || mode == "default") && self_map.contains_key(&p_clean) {
                                self_map.get_mut(&p_clean).unwrap().patch_merge(p_val);
                            } else {
                                let mut new_obj = p_val.clone();
                                new_obj.strip_suffixes();
                                self_map.insert(p_clean, new_obj);
                            }
                        }
                    }
                }
            }
            (GonValue::Array(self_arr), GonValue::Array(patch_arr)) => {
                if mode == "append" || mode == "add" {
                    self_arr.extend(patch_arr.iter().cloned());
                } else if mode == "overwrite" {
                    let mut new_patch = patch.clone();
                    new_patch.strip_suffixes();
                    *self = new_patch;
                } else { // C++ 特性：数组按索引递归合并
                    for (i, p_item) in patch_arr.iter().enumerate() {
                        if i < self_arr.len() {
                            self_arr[i].patch_merge(p_item);
                        } else {
                            let mut new_item = p_item.clone();
                            new_item.strip_suffixes();
                            self_arr.push(new_item);
                        }
                    }
                }
            }
            (GonValue::Number(n), GonValue::Number(pn)) => match mode.as_str() {
                "add" => *n += pn,
                "multiply" => *n *= pn,
                _ => *n = *pn,
            },
            (GonValue::String(s), GonValue::String(ps)) => {
                if mode == "append" || mode == "add" { // C++ 特性：.add 在字符串上等于 .append
                    s.push_str(ps);
                } else {
                    *s = ps.clone();
                }
            }
            _ => { // 类型不匹配或原子覆盖
                let mut new_patch = patch.clone();
                new_patch.strip_suffixes();
                *self = new_patch;
            }
        }

    }

    pub fn strip_suffixes(&mut self) {
        let (clean, _) = parse_suffix(&self.name);
        self.name = clean;
        match &mut self.value {
            GonValue::Object(map) => {
                let mut new_map = IndexMap::new();
                let keys: Vec<String> = map.keys().cloned().collect();
                for k in keys {
                    if let Some(mut v) = map.shift_remove(&k) {
                        v.strip_suffixes();
                        new_map.insert(v.name.clone(), v);
                    }
                }
                self.value = GonValue::Object(new_map);
            }
            GonValue::Array(arr) => {
                for v in arr {
                    v.strip_suffixes();
                }
            }
            _ => {}
        }
    }

    // JSON
    pub fn to_json_value(&self) -> serde_json::Value {
        gon_value_to_json(&self.value)
    }

    pub fn from_json_value(val: &serde_json::Value) -> Self {
        Self::new("", json_to_gon_value(val))
    }


    pub fn save_to_str(&self, compact: bool) -> String {
        let tab = if compact { "" } else { "    " };
        let lb = if compact { " " } else { "\n" };

        // 顶层：无名字 + 是对象 => 不输出外层 {}
        if self.name.is_empty() {
            if let GonValue::Object(map) = &self.value {
                let mut s = String::new();
                for (_, child) in map {
                    s.push_str(&format!(
                        "{} {}",
                        escape_string(&child.name),
                        child.get_out_str(tab, lb, "")
                    ));
                    if !s.ends_with(lb) {
                        s.push_str(lb);
                    }
                }
                return s;
            }
        }

        // 其他情况：维持原逻辑（有名字的对象、数组、原子值等）
        if self.name.is_empty() {
            self.get_out_str(tab, lb, "")
        } else {
            format!(
                "{} {}",
                escape_string(&self.name),
                self.get_out_str(tab, lb, "")
            )
        }
    }

    fn get_out_str(&self, tab: &str, lb: &str, cur_tab: &str) -> String {
        match &self.value {
            GonValue::Object(map) => {
                let mut s = format!("{{{}", lb);
                for (_, child) in map {
                    s.push_str(&format!(
                        "{}{}{} {}",
                        cur_tab,
                        tab,
                        escape_string(&child.name),
                        child.get_out_str(tab, lb, &format!("{}{}", cur_tab, tab))
                    ));
                    if !s.ends_with(lb) {
                        s.push_str(lb);
                    }
                }
                s.push_str(&format!("{}}}{}", cur_tab, lb));
                s
            }
            GonValue::Array(arr) => {
                let short = arr.len() <= 2
                    && arr
                        .iter()
                        .all(|o| !matches!(o.value, GonValue::Object(_) | GonValue::Array(_)));
                if short {
                    let mut s = "[".to_string();
                    for (i, child) in arr.iter().enumerate() {
                        s.push_str(&child.get_out_str(tab, lb, &format!("{}{}", cur_tab, tab)));
                        if i < arr.len() - 1 {
                            s.push(' ');
                        }
                    }
                    s.push_str(&format!("]{}", lb));
                    s
                } else {
                    let mut s = format!("[{}", lb);
                    for child in arr {
                        s.push_str(&format!(
                            "{}{}{}",
                            cur_tab,
                            tab,
                            child.get_out_str(tab, lb, &format!("{}{}", cur_tab, tab))
                        ));
                        if !s.ends_with(lb) {
                            s.push_str(lb);
                        }
                    }
                    s.push_str(&format!("{}]{}", cur_tab, lb));
                    s
                }
            }
            GonValue::String(s) => escape_string(s),
            GonValue::Number(n) => {
                if n.fract() == 0.0 {
                    (*n as i64).to_string()
                } else {
                    n.to_string()
                }
            }

            GonValue::Bool(b) => (if *b { "true" } else { "false" }).to_string(),
            GonValue::Null => "null".to_string(),
        }
    }
    pub fn save(&self, output_path: &str) -> std::io::Result<()> {
        fs::write(output_path, self.save_to_str(false))
    }
    pub fn save_compact(&self, output_path: &str) -> std::io::Result<()> {
        fs::write(output_path, self.save_to_str(true))
    }

    pub fn save_json_as_gon(
        json_str: &str,
        output_path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let json_val: serde_json::Value = serde_json::from_str(json_str)?;
        let gon = Self::from_json_value(&json_val);
        gon.save(output_path)?;
        Ok(())
    }
}

fn escape_string(s: &str) -> String {
    let tokens = tokenize(s);
    let needs_quotes = tokens.len() != 1 || tokens[0] != s;

    let escaped: String = s
        .chars()
        .map(|c| match c {
            '\n' => "\\n".to_string(),
            '\\' => "\\\\".to_string(),
            '"' => "\\\"".to_string(),
            _ => c.to_string(),
        })
        .collect();

    if needs_quotes {
        format!("\"{}\"", escaped)
    } else {
        escaped
    }
}

fn json_to_gon_value(val: &serde_json::Value) -> GonValue {
    use serde_json::Value;
    match val {
        Value::Null => GonValue::Null,
        Value::Bool(b) => GonValue::Bool(*b),
        Value::Number(n) => GonValue::Number(n.as_f64().unwrap_or(0.0)),
        Value::String(s) => GonValue::String(s.clone()),
        Value::Array(arr) => GonValue::Array(
            arr.iter()
                .map(|v| GonObject::new("", json_to_gon_value(v)))
                .collect(),
        ),
        Value::Object(map) => {
            let mut gon_map = IndexMap::new();
            for (k, v) in map {
                gon_map.insert(k.clone(), GonObject::new(k, json_to_gon_value(v)));
            }
            GonValue::Object(gon_map)
        }
    }
}

fn gon_value_to_json(v: &GonValue) -> serde_json::Value {
    use serde_json::{Map, Value};
    match v {
        GonValue::Null => Value::Null,
        GonValue::String(s) => Value::String(s.clone()),
        GonValue::Number(n) => serde_json::Number::from_f64(*n)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        GonValue::Bool(b) => Value::Bool(*b),
        GonValue::Array(arr) => {
            Value::Array(arr.iter().map(|o| gon_value_to_json(&o.value)).collect())
        }
        GonValue::Object(map) => {
            let mut obj = Map::new();
            for (k, v) in map.iter() {
                obj.insert(k.clone(), gon_value_to_json(&v.value));
            }
            Value::Object(obj)
        }
    }
}

// 全局静态空对象
static GON_NULL: GonObject = GonObject {
    name: String::new(),
    value: GonValue::Null,
};

// --- 强化后的解析辅助函数 ---

struct TokenStream {
    tokens: Vec<String>,
    cursor: usize,
}

impl TokenStream {
    fn new(tokens: Vec<String>) -> Self {
        Self { tokens, cursor: 0 }
    }
    fn next(&mut self) -> Option<&String> {
        let res = self.tokens.get(self.cursor);
        self.cursor += 1;
        res
    }
    fn peek(&self) -> Option<&String> {
        self.tokens.get(self.cursor)
    }
}

fn tokenize(data: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = data.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        // 处理单行注释 // 或 #
        if (c == '/' && i + 1 < chars.len() && chars[i + 1] == '/') || c == '#' {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            continue;
        }

        // 处理多行注释 /* */
        if c == '/' && i + 1 < chars.len() && chars[i + 1] == '*' {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            i += 2;
            while i + 1 < chars.len() && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            i += 2;
            continue;
        }

        // 处理字符串
        if c == '"' {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            i += 1;
            let mut s = String::new();
            let mut escaped = false;
            while i < chars.len() {
                if escaped {
                    match chars[i] {
                        'n' => s.push('\n'),
                        'r' => s.push('\r'),
                        't' => s.push('\t'),
                        _ => s.push(chars[i]),
                    }
                    escaped = false;
                } else if chars[i] == '\\' {
                    escaped = true;
                } else if chars[i] == '"' {
                    break;
                } else {
                    s.push(chars[i]);
                }
                i += 1;
            }
            tokens.push(s);
            i += 1;
            continue;
        }

        match c {
            '{' | '}' | '[' | ']' => {
                if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
                tokens.push(c.to_string());
            }
            '=' | ':' | ',' | ' ' | '\t' | '\r' | '\n' => {
                if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(c),
        }
        i += 1;
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

fn parse_value(stream: &mut TokenStream) -> Result<GonValue, String> {
    match stream.peek().map(|s| s.as_str()) {
        Some("{") => {
            stream.next();
            let mut map = IndexMap::new();
            while let Some(tk) = stream.peek() {
                if tk == "}" {
                    break;
                }
                let name = stream.next().ok_or("Missing name in object")?.clone();
                let val = parse_value(stream)?;
                map.insert(name.clone(), GonObject::new(&name, val));
            }
            stream.next(); // consume }
            Ok(GonValue::Object(map))
        }
        Some("[") => {
            stream.next();
            let mut arr = Vec::new();
            while let Some(tk) = stream.peek() {
                if tk == "]" {
                    break;
                }
                let val = parse_value(stream)?;
                arr.push(GonObject::new("", val));
            }
            stream.next(); // consume ]
            Ok(GonValue::Array(arr))
        }
        Some(_) => {
            let s = stream.next().unwrap().clone();
            if s == "null" {
                Ok(GonValue::Null)
            } else if s == "true" {
                Ok(GonValue::Bool(true))
            } else if s == "false" {
                Ok(GonValue::Bool(false))
            } else if let Ok(n) = s.parse::<f64>() {
                Ok(GonValue::Number(n))
            } else if s.starts_with('.') {
                if let Ok(n) = format!("0{}", s).parse::<f64>() {
                    Ok(GonValue::Number(n))
                } else {
                    Ok(GonValue::String(s))
                }
            } else {
                Ok(GonValue::String(s))
            }
        }
        None => Err("Unexpected end of tokens".to_string()),
    }
}

fn parse_suffix(name: &str) -> (String, String) {
    let suffixes = [".overwrite", ".append", ".merge", ".add", ".multiply"];
    for sfx in &suffixes {
        if name.ends_with(sfx) {
            return (
                name[..name.len() - sfx.len()].to_string(),
                sfx[1..].to_string(),
            );
        }
    }
    (name.to_string(), "default".to_string())
}