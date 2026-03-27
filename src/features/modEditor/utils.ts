// src/features/modEditor/utils.ts
import JSZip from "jszip";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import type { ModMeta } from "./types";
import type { StoreApi, UseBoundStore } from "zustand";

export function sanitizeFolderName(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "MewgenicsMod";
}

export function deepMergePlainObject(target: any, src: any) {
  if (!src || typeof src !== "object" || Array.isArray(src)) return target;
  if (!target || typeof target !== "object" || Array.isArray(target))
    return structuredClone(src);

  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      target[k] = deepMergePlainObject(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

export function deepMerge(target: any, src: any) {
  if (src === null || src === undefined) return target;
  if (typeof src !== "object" || Array.isArray(src)) return src;

  const out =
    target && typeof target === "object" && !Array.isArray(target)
      ? { ...target }
      : {};

  for (const k of Object.keys(src)) out[k] = deepMerge(out[k], src[k]);
  return out;
}

export function objectFromMap<V>(m: Map<string, V>): Record<string, V> {
  return Object.fromEntries(m.entries());
}

export async function exportModZip(
  meta: ModMeta,
  patchMap: Record<string, any>,
  sectionStates: any,
) {
  if (Object.keys(patchMap).length === 0) throw new Error("patchMap is empty");

  const zip = new JSZip();
  const folderName = sanitizeFolderName(meta.title);
  const folder = zip.folder(folderName)!;

  const descriptionJson = {
    title: meta.title,
    author: meta.author,
    version: meta.version,
    description: meta.desc,
    _editor_config: sectionStates,
  };
  folder.file("description.json", JSON.stringify(descriptionJson, null, 2));

  if (meta.previewPath) {
    const bytes = await readFile(meta.previewPath);
    folder.file("preview.png", bytes);
  }

  const gonTexts = await invoke<Record<string, string>>(
    "json_map_to_gon_texts",
    {
      patches: patchMap,
      compact: false,
    },
  );

  for (const [path, text] of Object.entries(gonTexts)) {
    folder.file(path, text);
  }

  const outPath = await save({
    title: "Export Mod Zip",
    defaultPath: `${folderName}.zip`,
    filters: [{ name: "Zip", extensions: ["zip"] }],
  });
  if (!outPath) return;

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  await writeFile(outPath, zipBytes);
}

type WithSelectors<S extends UseBoundStore<StoreApi<any>>> = S & {
  use: {
    [K in keyof ReturnType<S["getState"]>]: () => ReturnType<S["getState"]>[K];
  };
};

export function createSelectors<S extends UseBoundStore<StoreApi<any>>>(
  store: S,
) {
  const typedStore = store as WithSelectors<S>;
  typedStore.use = {} as any;

  for (const k of Object.keys(store.getState()) as Array<
    keyof ReturnType<S["getState"]>
  >) {
    (typedStore.use as any)[k] = () => store((s: any) => s[k]);
  }

  return typedStore;
}

export async function importModZip() {
  const p = await open({
    title: "Import Mod Zip",
    multiple: false,
    filters: [{ name: "Zip", extensions: ["zip"] }],
  });

  if (typeof p !== "string") return null;

  const bytes = await readFile(p);
  const zip = await JSZip.loadAsync(bytes);

  // 1. 尝试读取根目录或文件夹下的 description.json
  // 有些 zip 里面包了一层文件夹，这里做个兼容处理
  let descFile = zip.file("description.json");
  if (!descFile) {
    const files = Object.keys(zip.files);
    const nested = files.find((f) => f.endsWith("description.json"));
    if (nested) descFile = zip.file(nested);
  }

  if (!descFile) throw new Error("description.json not found in zip");

  const content = await descFile.async("string");
  const data = JSON.parse(content);

  return {
    meta: {
      title: data.title || "",
      author: data.author || "",
      version: data.version || "1.0.0",
      desc: data.description || "",
    },
    // 提取保存的状态
    config: data._editor_config || null,
  };
}

/**
 * 递归提取对象中所有的 key 路径 (参考 Python extract_all_paths)
 */
export function extractAllPaths(data: any, parentPath = ""): Set<string> {
  const paths = new Set<string>();

  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data)) {
      const currentPath = parentPath ? `${parentPath}/${k}` : k;
      paths.add(currentPath);
      // 递归
      const subPaths = extractAllPaths(v, currentPath);
      subPaths.forEach((p) => paths.add(p));
    }
  } else if (Array.isArray(data)) {
    // 如果是数组，根据 Python 逻辑，路径增加 "/*"
    // 但在最后处理时通常会去掉 "*/" 前缀
    for (const item of data) {
      const subPaths = extractAllPaths(
        item,
        parentPath ? `${parentPath}/*` : "*",
      );
      subPaths.forEach((p) => paths.add(p));
    }
  }

  return paths;
}

/**
 * 处理解包后的游戏数据，提取所有被动技能的属性路径
 */
export function generatePassivePaths(gameData: any): string[] {
  if (!gameData) return [];

  const passiveList: any[] = [{"HealRandomInjury": 1}];

  // 1. 遍历所有 passives/ 开头的文件
  for (const [key, fileContent] of Object.entries(gameData)) {
    if (key.startsWith("passives/")) {
      const fileObj = fileContent as Record<string, any>;
      // 2. 遍历文件内的每个技能
      for (const item of Object.values(fileObj)) {
        // 提取根部的 passives
        if (item.passives) passiveList.push(item.passives);
        // 提取等级 1 和 2 中的 passives
        if (item["1"]?.passives) passiveList.push(item["1"].passives);
        if (item["2"]?.passives) passiveList.push(item["2"].passives);
      }
    } else if (key.startsWith("items/")) {
      for (const item of Object.values(fileContent as Record<string, any>)) {
        if (item.passives) passiveList.push(item.passives);
      }
    }
  }

  // 3. 提取所有路径
  const allPathsSet = new Set<string>();
  passiveList.forEach((p) => {
    const paths = extractAllPaths(p);
    paths.forEach((path) => {
      // 模仿 Python 的 i.removeprefix('*/')
      const cleanPath = path.startsWith("*/") ? path.substring(2) : path;
      if (cleanPath !== "*") {
        allPathsSet.add(cleanPath);
      }
    });
  });

  // 4. 排序并返回
  return Array.from(allPathsSet).sort();
}

export function buildNestedFromPathMap(pathMap: Record<string, any>) {
  const out: any = {};
  for (const [path, value] of Object.entries(pathMap)) {
    const parts = path.split("/").filter(Boolean);
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (!(k in cur)) cur[k] = {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return out;
}
