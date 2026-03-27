mod gon;

use gon::GonObject;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::fs::File;
use csv::ReaderBuilder;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
struct FileTreeNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Vec<FileTreeNode>,
}

#[derive(Debug, Clone, Serialize)]
struct GonFilePayload {
    text: String,
    json: serde_json::Value,
}

fn build_tree(path: &Path) -> Result<FileTreeNode, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let is_dir = metadata.is_dir();

    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    if !is_dir {
        return Ok(FileTreeNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir: false,
            children: vec![],
        });
    }

    let mut children = Vec::new();

    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let child_path = entry.path();

        let keep = child_path.is_dir()
            || child_path.extension().and_then(|s| s.to_str()) == Some("gon");

        if !keep {
            continue;
        }

        children.push(build_tree(&child_path)?);
    }

    children.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(FileTreeNode {
        name,
        path: path.to_string_lossy().to_string(),
        is_dir: true,
        children,
    })
}

#[tauri::command]
fn list_gon_tree(root_dir: String) -> Result<FileTreeNode, String> {
    let root = PathBuf::from(root_dir);

    if !root.exists() {
        return Err(format!("目录不存在: {}", root.display()));
    }
    if !root.is_dir() {
        return Err(format!("不是目录: {}", root.display()));
    }

    build_tree(&root)
}

#[tauri::command]
fn read_gon_as_json(file_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    if path.extension().and_then(|s| s.to_str()) != Some("gon") {
        return Err("只能读取 .gon 文件".to_string());
    }

    let root = GonObject::load(path.to_string_lossy().as_ref())?;
    Ok(root.to_json_value())
}

#[tauri::command]
fn read_gon_text(file_path: String) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_json_to_gon(json_text: String, output_path: String) -> Result<(), String> {
    GonObject::save_json_as_gon(&json_text, &output_path).map_err(|e| e.to_string())
}
#[tauri::command]
fn read_gon_file(file_path: String) -> Result<GonFilePayload, String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    if path.extension().and_then(|s| s.to_str()) != Some("gon") {
        return Err("只能读取 .gon 文件".to_string());
    }

    let text = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let root = GonObject::load(path.to_string_lossy().as_ref())?;
    let json = root.to_json_value();

    Ok(GonFilePayload { text, json })
}

#[tauri::command]
async fn load_game_localization(path: String, langs: Vec<String>) -> Result<HashMap<String, HashMap<String, String>>, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    
    // 创建 CSV 读取器
    let mut rdr = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);
    // 获取表头，找到 KEY 和 目标语言所在的列索引
    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    
    let key_idx = headers.iter().position(|h| h == "KEY")
        .ok_or("CSV missing KEY column")?;
    // 映射： 语言名称 -> 索引
    let mut lang_map = HashMap::new();
    for lang in langs {
        if let Some(idx) = headers.iter().position(|h| h == lang) {
            lang_map.insert(lang, idx);
        }
    }
    // 存储结果: { "pt-br": { "KEY": "Value" }, "en": { "KEY": "Value" } }
    let mut result: HashMap<String, HashMap<String, String>> = HashMap::new();
    for lang in lang_map.keys() {
        result.insert(lang.to_string(), HashMap::new());
    }
    // 遍历每一行
    for record in rdr.records() {
        let record = record.map_err(|e| e.to_string())?;
        if let Some(key) = record.get(key_idx) {
            if key.is_empty() || key.starts_with("//") { continue; }
            for (lang, &idx) in &lang_map {
                if let Some(value) = record.get(idx) {
                    // 处理换行符转义
                    let formatted_value = value.replace("\\n", "\n");
                    result.get_mut(lang).unwrap().insert(key.to_string(), formatted_value);
                }
            }
        }
    }
    Ok(result)
}

#[tauri::command]
async fn load_all_csv_localization(
    dir_path: String, 
    langs: Vec<String>
) -> Result<HashMap<String, HashMap<String, String>>, String> {
    let mut total_map: HashMap<String, HashMap<String, String>> = HashMap::new();
    
    // 初始化语言容器
    for lang in &langs {
        total_map.insert(lang.clone(), HashMap::new());
    }
    let root = Path::new(&dir_path);
    if !root.is_dir() {
        return Err("提供的路径不是有效的目录".into());
    }
    // 遍历目录下所有文件
    for entry in WalkDir::new(root)
        .max_depth(2) // 根据需要调整深度，通常游戏文本都在一级或二级目录下
        .into_iter()
        .filter_map(|e| e.ok()) 
    {
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("csv") {
            
            // 开始读取单个 CSV
            let file = File::open(path).map_err(|e| e.to_string())?;
            let mut rdr = csv::ReaderBuilder::new()
                .has_headers(true)
                .flexible(true) // 允许某些行缺少列
                .from_reader(file);
            let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
            
            // 找到 KEY 列索引
            let key_idx = match headers.iter().position(|h| h == "KEY") {
                Some(idx) => idx,
                None => continue, // 如果这个 CSV 没有 KEY 列，跳过
            };
            // 找到目标语言的索引映射
            let mut current_lang_indices = Vec::new();
            for lang in &langs {
                if let Some(idx) = headers.iter().position(|h| h == lang) {
                    current_lang_indices.push((lang.clone(), idx));
                }
            }
            // 读取行
            for record in rdr.records() {
                let record = record.map_err(|e| e.to_string())?;
                if let Some(key) = record.get(key_idx) {
                    // 忽略注释行或空行
                    if key.is_empty() || key.starts_with("//") || key.starts_with('#') {
                        continue;
                    }
                    for (lang_name, idx) in &current_lang_indices {
                        if let Some(value) = record.get(*idx) {
                            if !value.is_empty() {
                                // 写入总表，处理换行符
                                let formatted_value = value.replace("\\n", "\n");
                                if let Some(inner_map) = total_map.get_mut(lang_name) {
                                    inner_map.insert(key.to_string(), formatted_value);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(total_map)
}

#[tauri::command]
fn read_all_gon_as_json(
    root_dir: String,
) -> Result<HashMap<String, HashMap<String, serde_json::Value>>, String> {
    let root = Path::new(&root_dir);
    if !root.exists() || !root.is_dir() {
        return Err("无效的根目录".to_string());
    }

    // 结果: { "目录": { "xxx.gon": {json} } }
    let mut result: HashMap<String, HashMap<String, serde_json::Value>> = HashMap::new();

    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();

        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("gon") {
            // 目录 key
            let parent = path.parent().unwrap_or(root);
            let rel_dir = parent.strip_prefix(root).map_err(|e| e.to_string())?;
            let dir_key = if rel_dir.as_os_str().is_empty() {
                ".".to_string()
            } else {
                rel_dir.to_string_lossy().replace("\\", "/")
            };

            // 文件名 key
            let file_name = path
                .file_name()
                .ok_or("无法获取文件名")?
                .to_string_lossy()
                .to_string();

            // 解析文件
            let gon = GonObject::load(path.to_str().ok_or("路径包含无效字符")?)?;
            let json_val = gon.to_json_value();

            // 写入 result[dir][file] = json
            result
                .entry(dir_key)
                .or_insert_with(HashMap::new)
                .insert(file_name, json_val);
        }
    }

    Ok(result)
}

#[tauri::command]
fn json_map_to_gon_texts(
    patches: HashMap<String, serde_json::Value>,
    compact: bool,
) -> Result<HashMap<String, String>, String> {
    let mut out: HashMap<String, String> = HashMap::new();
    for (path, json_val) in patches {
        let gon = GonObject::from_json_value(&json_val);
        let text = gon.save_to_str(compact);
        out.insert(path, text);
    }
    Ok(out)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_gon_tree,
            read_gon_as_json,
            read_gon_text,
            read_gon_file,
            save_json_to_gon,
            load_game_localization,
            load_all_csv_localization,
            read_all_gon_as_json,
            json_map_to_gon_texts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
