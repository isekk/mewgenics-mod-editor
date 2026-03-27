import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AppStore = {
  rootDir: string;
  gameDir: string;

  sidebarCollapsed: boolean;

  setRootDir: (v: string) => void;
  setGameDir: (v: string) => void;

  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;

  reset: () => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      rootDir: "",
      gameDir: "",

      sidebarCollapsed: true, // 默认折叠（你也可以改 false）

      setRootDir: (v) => set({ rootDir: v }),
      setGameDir: (v) => set({ gameDir: v }),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      reset: () => set({ rootDir: "", gameDir: "" }),
    }),
    {
      name: "app_store_v1",
      storage: createJSONStorage(() => localStorage),
      // 可选：只持久化你想保留的字段
      // partialize: (s) => ({ rootDir: s.rootDir, gameDir: s.gameDir, sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
);
