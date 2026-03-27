import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus } from "lucide-react";
import { Trash2 } from "lucide-react";
import { useModEditorStore } from "../modEditorStore";


// Path 选择器
export function PassivePathSearch({
    allPaths,
    onPick,
    disabled,
}: {
    allPaths: string[];
    onPick: (path: string) => void;
    disabled?: boolean;
}) {
    const { t, i18n } = useTranslation();
    const passiveFieldMeta = useModEditorStore((s) => s.passiveFieldMeta);

    const [term, setTerm] = useState("");

    const results = useMemo(() => {
        const q = term.trim().toLowerCase();
        if (!q) return [];
        return allPaths
            .filter((p) => {
                const meta = passiveFieldMeta[p];
                const title =
                    i18n.language === "zh"
                        ? meta?.title?.zh ?? ""
                        : meta?.title?.en ?? meta?.title?.zh ?? "";
                return p.toLowerCase().includes(q) || title.toLowerCase().includes(q);
            })
            .slice(0, 12);
    }, [term, allPaths, i18n.language, passiveFieldMeta ]);

    return (
        <div className="relative">
            <div
                className={[
                    "flex items-center gap-2 rounded-lg px-2 py-1 border transition-all",
                    disabled ? "bg-slate-100/60 border-slate-200 opacity-60" : "bg-slate-100 border-transparent focus-within:border-purple-300",
                ].join(" ")}
            >
                <Search size={12} className="text-slate-400" />
                <input
                    type="text"
                    disabled={disabled}
                    placeholder={t("class.advanced.add-field")}
                    className="bg-transparent border-none outline-none text-[11px] w-full"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                />
            </div>

            {!disabled && term && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden py-1">
                    {results.map((p) => {
                        const meta = passiveFieldMeta[p];
                        const title = meta?.title?.zh ?? meta?.title?.en ?? "";
                        return (
                            <button
                                key={p}
                                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-start gap-3 group"
                                onClick={() => {
                                    onPick(p);
                                    setTerm("");
                                }}
                            >
                                <Plus size={14} className="text-purple-500 mt-0.5 shrink-0" />
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-700 truncate">
                                        {title ? `${title}` : p}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">{p}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * 渲染技能 SVG 图标
 * 宽高比约 76:42 (1.8:1)
 */
export function PassiveIcon({ id, className = "" }: { id: string; className?: string }) {
    return (
        <div className={`shrink-0 bg-slate-200 rounded overflow-hidden flex items-center justify-center border border-black/5 ${className}`}>
            <img
                src={`/svg/passive/${id}.svg`}
                alt={id}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0";
                }}
            />
        </div>
    );
}

// 通用搜索被动 ID 组件
export function PassiveSearch({ passivePool, onSelect }: { passivePool: any; onSelect: (id: string) => void }) {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return Object.entries(passivePool)
            .filter(([id, data]: [string, any]) => id.toLowerCase().includes(term) || t(data.name).toLowerCase().includes(term))
            .slice(0, 10);
    }, [searchTerm, passivePool, t]);

    return (
        <div className="relative mt-2">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1 border border-transparent focus-within:border-blue-300 transition-all">
                <Search size={12} className="text-slate-400" />
                <input
                    type="text"
                    placeholder={t("search-passives")}
                    className="bg-transparent border-none outline-none text-[11px] w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {searchTerm && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden py-1">
                    {searchResults.map(([id, data]: [string, any]) => (
                        <button
                            key={id}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-3 group"
                            onClick={() => { onSelect(id); setSearchTerm(""); }}
                        >
                            <PassiveIcon id={id} className="w-[38px] h-[21px]" />
                            <div className="flex flex-col flex-1 overflow-hidden">
                                <span className="text-xs font-bold text-slate-700 truncate">{t(data.name)}</span>
                            </div>
                            <Plus size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// 提取数据池工具
export function getAllAvailablePassives(gameData: any) {
    const pool: Record<string, any> = {};
    if (!gameData) return pool;
    Object.keys(gameData).forEach((key) => {
        if (key.startsWith("passives/")) {
            Object.entries(gameData[key]).forEach(([id, data]: [string, any]) => {
                if (data.name) pool[id] = data;
            });
        }
    });
    return pool;
}



export const getFieldTitle = (meta: any, path: string, lang: string) => {
    const field = meta?.[path];
    if (!field?.title) return "";
    return lang === "zh" ? field.title.zh ?? "" : field.title.en ?? field.title.zh ?? "";
};
export const getFieldDesc = (meta: any, path: string, lang: string) => {
    const field = meta?.[path];
    if (!field?.desc) return "";
    return lang === "zh" ? field.desc.zh ?? "" : field.desc.en ?? field.desc.zh ?? "";
};


// 定义 Props 类型
interface AdvancedPassiveRowProps {
    path: string;
    value: any;
    onChange: (val: any) => void;
    onRemove: () => void;
}

export function AdvancedPassiveRow({ path, value, onChange, onRemove }: AdvancedPassiveRowProps) {
    const { t, i18n } = useTranslation();

    const passiveFieldMeta = useModEditorStore((s) => s.passiveFieldMeta);
    const meta = passiveFieldMeta[path];

    const title = getFieldTitle(passiveFieldMeta, path, i18n.language);
    const desc = getFieldDesc(passiveFieldMeta, path, i18n.language);

    // 动态判断渲染哪种输入框
    let inputControl;
    if (meta?.type === "enum" && meta.enum) {
        inputControl = (
            <select
                className="fluent-input !py-0.5 text-xs w-[140px] cursor-pointer"
                value={value ?? meta.defaultValue}
                onChange={(e) => onChange(e.target.value)}
            >
                {meta.enum.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {i18n.language === "zh" ? (opt.zh || opt.value) : (opt.en || opt.zh || opt.value)}
                    </option>
                ))}
            </select>
        );
    } else if (meta?.type === "number") {
        inputControl = (
            <input
                type="number"
                className="fluent-input !py-0.5 text-xs text-center w-[140px]"
                value={value ?? 0}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            />
        );
    } else {
        inputControl = (
            <input
                type="text"
                className="fluent-input !py-0.5 text-xs w-[140px]"
                placeholder={meta?.placeholder}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
            />
        );
    }

    return (
        <div className="flex items-center gap-2 bg-purple-50/40 p-2 rounded-xl border border-purple-100/50">
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-700 truncate" title={path}>
                    {title || path}
                </div>
                <div className="text-[9px] text-slate-400 truncate">{path}</div>
                {(desc || meta?.type) && (
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2" title={desc}>
                        {desc || t("class.advanced.no-desc")}
                    </div>
                )}
            </div>

            <div className="shrink-0 flex items-center gap-2">
                {inputControl}
                <button
                    onClick={onRemove}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    title={t("shan-chu")}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}
