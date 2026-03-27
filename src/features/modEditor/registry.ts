import type { SectionModule } from "./types";

// 使用 Vite 的 glob 导入，直接获取所有 .section.tsx 文件的 default 导出
const modules = import.meta.glob<SectionModule>("./sections/*.section.tsx", {
  eager: true,
  import: 'default', // 核心：只取每个文件的 export default
});

// 将对象转为数组
export const SECTIONS: SectionModule[] = Object.values(modules);
