import { Link, Outlet, useLocation } from "react-router-dom";
import { Hammer, Settings, Home, ChevronDown, Languages, PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { useAppStore } from "../store/appStore";

type Lang = "zh" | "en" | "fr";

export default function Layout() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const current = (i18n.language || "zh") as Lang;
  const setLang = (lang: Lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  const navItems = [
    { path: "/", icon: <Home size={20} />, label: t("zhu-ye") },
    { path: "/mod-editor", icon: <Hammer size={20} />, label: t("mo-zu-bian-ji") },
  ];

  return (
    <div className="flex h-screen w-full text-[var(--fluent-text)] font-sans overflow-hidden">
      <aside
        className={clsx(
          "transition-all duration-300 border-r border-white/30 flex flex-col bg-white/30 backdrop-blur-xl z-10 shrink-0 shadow-[0_18px_40px_rgba(45,75,125,0.12)]",
          sidebarCollapsed ? "w-16 hover:w-64 group" : "w-64"
        )}
      >
        <div className="h-16 flex items-center justify-center border-b border-white/40 text-[var(--fluent-accent-strong)] overflow-hidden relative">
          <span className={clsx("font-semibold text-lg tracking-wide", sidebarCollapsed ? "group-hover:hidden" : "hidden")}>
            M
          </span>
          <span className={clsx("font-semibold text-lg tracking-wide", sidebarCollapsed ? "hidden group-hover:block" : "block")}>
            MewModEditor
          </span>

          {/* 固定折叠/展开按钮 */}
          <button
            onClick={toggleSidebar}
            className={clsx(
              "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition",
              sidebarCollapsed
                ? "opacity-0 group-hover:opacity-100 text-[var(--fluent-text-muted)] hover:text-[var(--fluent-accent-strong)] hover:bg-white/70"
                : "opacity-100 bg-[var(--fluent-accent)] text-white shadow-[0_10px_24px_rgba(43,109,246,0.35)]"
            )}
            title={sidebarCollapsed ? t('zhan-kai') : t('zhe-die')}
          >
            <PanelLeft size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-2 p-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors overflow-hidden whitespace-nowrap",
                location.pathname === item.path
                  ? "bg-[var(--fluent-accent)] text-white shadow-[0_10px_24px_rgba(43,109,246,0.35)]"
                  : "hover:bg-white/70 text-[var(--fluent-text-muted)]"
              )}
            >
              <div className="min-w-[20px]">{item.icon}</div>
              <span
                className={clsx(
                  "transition-opacity duration-300",
                  sidebarCollapsed ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/40 bg-white/30">
          <div
            className={clsx(
              "flex items-center transition-all duration-300 overflow-hidden",
              sidebarCollapsed ? "justify-center group-hover:justify-between" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2 text-[var(--fluent-text-muted)]">
              <Settings size={18} className="shrink-0" />
              <span
                className={clsx(
                  "text-[12px] font-semibold uppercase tracking-widest whitespace-nowrap",
                  sidebarCollapsed ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                )}
              >
                {t('she-zhi')}
              </span>
            </div>

            <div
              className={clsx(
                "relative transition-opacity duration-300",
                sidebarCollapsed ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              )}
            >
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fluent-text-muted)]">
                <Languages size={16} />
              </div>

              <select
                className={clsx(
                  "appearance-none w-full bg-white/60 hover:bg-white/80 border border-white/40 hover:border-[var(--fluent-stroke-strong)]",
                  "text-[var(--fluent-text)] text-[12px] font-medium rounded-lg pl-8 pr-8 py-1.5",
                  "outline-none focus:ring-2 focus:ring-[var(--fluent-accent-soft)] transition-all cursor-pointer"
                )}
                value={current}
                onChange={(e) => setLang(e.target.value as Lang)}
              >
                <option value="zh" className="bg-white text-[var(--fluent-text)]">简体中文</option>
                <option value="en" className="bg-white text-[var(--fluent-text)]">English</option>
                <option value="fr" className="bg-white text-[var(--fluent-text)]">Français</option>
              </select>

              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fluent-text-muted)] border-l border-white/60 pl-1.5 ml-1">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative">
        <div className="h-full p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
