import type { FC } from "react";

export type PatchPiece = { path: string; data: any };

export type ModMeta = {
  title: string;
  author: string;
  version: string;
  desc: string;
  previewPath?: string;

  _editor_config?: Record<string, any>;   // 编辑器状态
};

export type SectionCtx = {
  // 你可以把通用工具/Toast/i18n 注入给 section 用
  // showToast?: (msg: string, type?: "success"|"error"|"info") => void;
};

export type SectionModule<TState = any> = {
  id: string;
  title: string;
  initDefaultState: (gameData?: any) => TState; // 根据 GameData 动态生成默认值的函数
  Component: FC; // 该 section 的 React 组件（组件内部直接 useModEditorStore）
  HelpComponent?: FC;
  build: (patchMap: Record<string, any>) => void
};

export type ModifierMode = 'fixed' | 'add' | 'multiply';