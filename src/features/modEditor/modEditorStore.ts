import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ModMeta } from "./types";
import { createSelectors, generatePassivePaths } from "./utils";
import { current } from "immer";
import { SECTIONS } from "./registry";

type SectionStateMap = Record<string, any>;
export type PassiveFieldMeta = {
  title?: { zh?: string; en?: string };
  desc?: { zh?: string; en?: string };
  type?: "number" | "string" | "enum";
  placeholder?: string;
  defaultValue?: any;
  unit?: string;
  enum?: Array<{ value: any; zh?: string; en?: string }>;
};
type ModEditorStore = {
  meta: ModMeta;
  sectionStates: SectionStateMap;

  gameData: any | null;
  isLoadingData: boolean;
  loadGameData: () => Promise<void>;
  allPassivePaths: string[]; // 保存动态提取的路径

  passiveFieldMeta: Record<string, PassiveFieldMeta>;
  loadPassiveFieldMeta: () => Promise<void>;

  // 用于 reset 的默认值快照
  _defaults: SectionStateMap;

  setMeta: (patch: Partial<ModMeta>) => void;

  // 保留：你仍然可以用“整体替换/函数式返回”的方式更新
  setSectionState: (id: string, next: any | ((prev: any) => any)) => void;

  // 新增：Immer 风格更新（推荐你以后都用这个）
  mutateSection: <T = any>(id: string, recipe: (draft: T) => void) => void;

  resetSections: () => void;
};

export const useModEditorStore = createSelectors(
  create<ModEditorStore>()(
    immer((set, get) => ({
      // 初始化状态
      gameData: null,
      isLoadingData: false,
      allPassivePaths: [],

      passiveFieldMeta: {},
      loadPassiveFieldMeta: async () => {
        try {
          const res = await fetch("/passive_meta.json");
          const data = await res.json();
          set((s) => {
            s.passiveFieldMeta = data;
          });
        } catch (e) {
          console.error("Failed to load passive meta:", e);
        }
      },

      // 加载数据的方法 ---
      loadGameData: async () => {
        if (get().gameData) return; // 避免重复加载
        set((s) => {
          s.isLoadingData = true;
        });
        try {
          await get().loadPassiveFieldMeta(); 
          
          const res = await fetch("/unpacked_game_data.json");
          const data = await res.json();

          const passivePaths = generatePassivePaths(data); // 计算被动路径

          set((s) => {
            s.gameData = data;
            s.isLoadingData = false;

            s.allPassivePaths = passivePaths;
            // --- 数据加载后，同步更新所有 Section 的默认值 ---
            // 在这里一站式完成：注册 ID + 填充初始值
            for (const sec of SECTIONS) {
              // 1. 调用那个会根据 data 返回值的函数
              const initialState = sec.initDefaultState(data);

              // 2. 同时存入“当前状态”和“重置锚点”
              s._defaults[sec.id] = structuredClone(initialState);
              s.sectionStates[sec.id] = structuredClone(initialState);
            }
          });
        } catch (err) {
          console.error("Failed to load game data:", err);
          set((s) => {
            s.isLoadingData = false;
          });
        }
      },

      meta: {
        title: `MewgenicsMod_${Date.now()}`,
        author: "",
        version: "1.0.0",
        desc: "",
        previewPath: undefined,
      },

      sectionStates: {},
      _defaults: {},

      setMeta: (patch) =>
        set((s) => {
          Object.assign(s.meta, patch);
        }),

      setSectionState: (id, next) =>
        set((s) => {
          const prev = s.sectionStates[id] ?? s._defaults[id];
          const nextVal =
            typeof next === "function" ? (next as any)(prev) : next;
          s.sectionStates[id] = nextVal;
        }),

      mutateSection: (id, recipe) =>
        set((s) => {
          if (!s.sectionStates[id]) {
            s.sectionStates[id] = structuredClone(
              current(s._defaults[id]) ?? {},
            );
          }
          recipe(s.sectionStates[id]);
        }),

      resetSections: () =>
        set((s) => {
          s.sectionStates = structuredClone(current(s._defaults));
        }),
    })),
  ),
);
