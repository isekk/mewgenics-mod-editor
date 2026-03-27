// src/features/modEditor/sections/classes.section.tsx
import type { SectionModule } from "../types";
import { useModEditorStore } from "../modEditorStore";
import { useTranslation } from "react-i18next";
import { Users, Zap, TrendingUp, Sparkles, Trash2, Info, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { buildNestedFromPathMap, deepMergePlainObject } from "../utils";
import { AdvancedPassiveRow, PassiveIcon, PassivePathSearch, PassiveSearch, getAllAvailablePassives } from "../components/PassiveShared";

const STAT_KEYS = ["str", "dex", "con", "int", "spd", "cha", "lck"];



/** =========================
 * 数据类型定义
 * ========================= */
type ClassModRule = {
    enabled: boolean;
    locKey: string;
    statMods: Record<string, number>;
    levelupStats: string[];
    innatePassives: Record<string, number>; // 选择被动覆盖（被动ID -> 1/2）

    // 高级模式：直接编辑 passives 字段（path -> value）
    advancedEnabled: boolean;
    advancedPassives: Record<string, any>;
};

type ClassesState = {
    baseClasses: Record<string, ClassModRule>;
    advancedClasses: Record<string, ClassModRule>;
};



function ClassesSectionComponent() {
    const st = useModEditorStore((s) => s.sectionStates["classes"] as ClassesState);
    const gameData = useModEditorStore.use.gameData();
    const mutateSection = useModEditorStore.use.mutateSection();
    const { t } = useTranslation();
    const allPassivePaths = useModEditorStore.use.allPassivePaths();

    const passiveFieldMeta = useModEditorStore.use.passiveFieldMeta();
    // 缓存被动技能池
    const passivePool = useMemo(() => getAllAvailablePassives(gameData), [gameData]);

    if (!st) return <div className="p-4 text-slate-400">{t("chu-shi-hua-zhong")}...</div>;

    const renderClassUI = (type: "baseClasses" | "advancedClasses", className: string) => {
        const rule = st[type][className];

        const onRulePatch = (patch: Partial<ClassModRule>) => {
            mutateSection<ClassesState>("classes", (d) => {
                Object.assign(d[type][className], patch);
            });
        };

        return (
            <div
                key={className}
                className={`p-4 rounded-2xl border transition-all space-y-4 ${rule.enabled
                    ? "bg-white/70 border-[var(--fluent-accent)] shadow-lg"
                    : "bg-white/20 border-white/10 opacity-60"
                    }`}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) =>
                                mutateSection<ClassesState>("classes", (d) => {
                                    d[type][className].enabled = e.target.checked;
                                })
                            }
                            className="w-4 h-4 accent-[var(--fluent-accent)] cursor-pointer"
                        />
                        {/* 职业图标容器 */}
                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-black/5 rounded-md overflow-hidden border border-black/5">
                            <img
                                src={`/image/classes/${className}.webp`}
                                alt={className}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        </div>
                        <span className="font-bold text-sm">{rule.locKey ? t(rule.locKey) : className}</span>
                    </div>

                    {rule.enabled && <Sparkles size={14} className="text-amber-500 animate-pulse" />}
                </div>

                {rule.enabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                        {/* 基础属性修改 */}
                        <div>
                            <div className="fluent-label text-[10px] mb-1 flex items-center gap-1 text-slate-500">
                                <Zap size={10} /> {t("class.stat-mods")}
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                {STAT_KEYS.map((stat) => (
                                    <div key={stat} className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            className="fluent-input !py-0.5 !px-1 text-center text-xs w-full"
                                            value={rule.statMods[stat] || 0}
                                            onChange={(e) =>
                                                mutateSection<ClassesState>("classes", (d) => {
                                                    d[type][className].statMods[stat] = parseFloat(e.target.value) || 0;
                                                })
                                            }
                                        />
                                        {/* 属性图标展示 */}
                                        <div className="mt-1 flex flex-col items-center h-[34px] justify-center">
                                            <img
                                                src={`/image/attr/attr_${stat}.webp`}
                                                alt={stat}
                                                className="w-[34px] h-[26px] object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                            <span className="text-[8px] uppercase text-slate-400">{t(`attr.${stat}`)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 升级属性池 */}
                        <div>
                            <div className="fluent-label text-[10px] mb-1 flex items-center gap-1 text-slate-500">
                                <TrendingUp size={10} /> {t("class.levelup-pool")}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {STAT_KEYS.map((stat) => (
                                    <button
                                        key={stat}
                                        title={t(`attr.${stat}`)}
                                        onClick={() =>
                                            mutateSection<ClassesState>("classes", (d) => {
                                                const list = d[type][className].levelupStats;
                                                d[type][className].levelupStats = list.includes(stat)
                                                    ? list.filter((s) => s !== stat)
                                                    : [...list, stat];
                                            })
                                        }
                                        className={`relative group p-1.5 rounded-lg border-2 transition-all flex items-center justify-center ${rule.levelupStats.includes(stat)
                                            ? "border-[var(--fluent-accent)] bg-white shadow-md ring-1 ring-[var(--fluent-accent)]"
                                            : "border-transparent bg-slate-100 opacity-50 hover:opacity-100"
                                            }`}
                                    >
                                        <img
                                            src={`/image/attr/attr_${stat}.webp`}
                                            alt={stat}
                                            className="w-[26px] h-[19px] object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                        {/* 悬停显示的文本气泡 */}
                                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-xl before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-800">
                                            {t(`attr.${stat}`)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 先天被动管理（两种模式并列） */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="fluent-label text-[10px] flex items-center justify-between"
                                title={t("class.passive-override-title")}
                            >
                                <span className="flex items-center gap-1">
                                    <Sparkles size={10} /> {t("class.innate-passives")}
                                </span>
                            </div>

                            {/* A. 选择被动覆盖（原有功能不动） */}
                            <div className="space-y-2">


                                {/* 已添加的被动列表 */}
                                <div className="space-y-1">
                                    {Object.entries(rule.innatePassives).map(([psId, level]) => {
                                        const psData = passivePool[psId];
                                        const hasLevels = psData?.["1"] !== undefined;

                                        const getLevelDesc = (lvl: number) => {
                                            const specificDesc = psData?.[lvl]?.desc;
                                            return t(specificDesc || psData?.desc || "");
                                        };

                                        return (
                                            <div
                                                key={psId}
                                                className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-lg border border-blue-100 group"
                                            >
                                                <PassiveIcon id={psId} className="w-[46px] h-[25px]" />
                                                <div
                                                    className="flex-1 flex items-center gap-2 overflow-hidden"
                                                    title={hasLevels ? getLevelDesc(level) : t(psData?.desc || "")}
                                                >
                                                    <span className="text-[11px] font-bold truncate text-slate-700">
                                                        {psData ? t(psData.name) : psId}
                                                    </span>
                                                    <Info size={12} className="text-blue-300 shrink-0 cursor-help" />
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {hasLevels &&
                                                        [1, 2].map((lvl) => (
                                                            <button
                                                                key={lvl}
                                                                className={`w-5 h-5 text-[9px] rounded flex items-center justify-center transition-colors ${level === lvl
                                                                    ? "bg-blue-500 text-white"
                                                                    : "bg-white text-blue-500 border border-blue-200 hover:bg-blue-50"
                                                                    }`}
                                                                title={getLevelDesc(lvl)}
                                                                onClick={() =>
                                                                    mutateSection<ClassesState>("classes", (d) => {
                                                                        d[type][className].innatePassives[psId] = lvl;
                                                                    })
                                                                }
                                                            >
                                                                {lvl}
                                                            </button>
                                                        ))}
                                                    <button
                                                        onClick={() =>
                                                            mutateSection<ClassesState>("classes", (d) => {
                                                                delete d[type][className].innatePassives[psId];
                                                            })
                                                        }
                                                        className="ml-1 p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 搜索添加被动 */}
                                <PassiveSearch
                                    passivePool={passivePool}
                                    onSelect={(id) => {
                                        mutateSection<ClassesState>("classes", (d) => {
                                            d[type][className].innatePassives[id] = 1;
                                        });
                                    }}
                                />
                            </div>

                            {/* B. 高级模式：直接编辑 passives 字段（独立于上面的被动选择） */}
                            <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600"
                                        title={t("class.advanced.hint")}
                                    >
                                        <SlidersHorizontal size={14} className="text-purple-500" />
                                        {t("class.advanced.title")}
                                    </div>

                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 select-none cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-purple-600"
                                            checked={rule.advancedEnabled}
                                            onChange={(e) => onRulePatch({ advancedEnabled: e.target.checked })}
                                        />
                                        {t("class.advanced.enable")}
                                    </label>
                                </div>



                                {/* 添加字段 */}
                                <PassivePathSearch
                                    allPaths={allPassivePaths}
                                    disabled={!rule.advancedEnabled}
                                    onPick={(path) => {
                                        if (!rule.advancedEnabled) return;
                                        if (path in rule.advancedPassives) return;

                                        const meta = passiveFieldMeta[path];
                                        const def =
                                            meta?.defaultValue ??
                                            (meta?.type === "number" ? 0 : "");
                                        onRulePatch({ advancedPassives: { ...rule.advancedPassives, [path]: def } });
                                    }}
                                />

                                {/* 字段列表 */}
                                {rule.advancedEnabled && (
                                    <div className="space-y-2">
                                        {Object.keys(rule.advancedPassives).length === 0 ? (
                                            <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                {t("class.advanced.empty")}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {Object.keys(rule.advancedPassives)
                                                    .sort((a, b) => a.localeCompare(b))
                                                    .map((path) => (
                                                        <AdvancedPassiveRow
                                                            key={path}
                                                            path={path}
                                                            value={rule.advancedPassives[path]}
                                                            onChange={(val) => {
                                                                mutateSection<ClassesState>("classes", (d) => {
                                                                    d[type][className].advancedPassives[path] = val;
                                                                });
                                                            }}
                                                            onRemove={() => {
                                                                mutateSection<ClassesState>("classes", (d) => {
                                                                    delete d[type][className].advancedPassives[path];
                                                                });
                                                            }}
                                                        />
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 p-2">
            <section>
                <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold border-l-4 border-blue-500 pl-4 text-sm">
                    <Users size={18} /> {t("class.base-classes")}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    {Object.keys(st.baseClasses).map((name) => renderClassUI("baseClasses", name))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold border-l-4 border-purple-500 pl-4 text-sm">
                    <Sparkles size={18} /> {t("class.advanced-classes")}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    {Object.keys(st.advancedClasses).map((name) => renderClassUI("advancedClasses", name))}
                </div>
            </section>
        </div>
    );
}
const ClassesHelp = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 text-sm text-slate-600">
      <p>{t("help.class.intro")}</p>
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
        <h4 className="font-bold text-blue-800 mb-1">{t("class.innate-passives")}</h4>
        <p>{t("help.class.passive-desc")}</p>
      </div>
    </div>
  );
};

const ClassesSection: SectionModule<ClassesState> = {
    id: "classes",
    title: "sections.class-editor",
    Component: ClassesSectionComponent,
    HelpComponent: ClassesHelp,

    initDefaultState: (gameData) => {
        const createDefaultRule = (raw: any): ClassModRule => ({
            enabled: false,
            locKey: raw?.meta?.name || "",
            statMods: raw?.stat_mods || {},
            levelupStats: raw?.levelup_stats || [],
            innatePassives: raw?.innate_passives || {},

            // 高级模式默认关闭
            advancedEnabled: false,
            advancedPassives: {},
        });

        const state: ClassesState = { baseClasses: {}, advancedClasses: {} };

        if (gameData["classes/classes"]) {
            Object.entries(gameData["classes/classes"]).forEach(([name, data]) => {
                state.baseClasses[name] = createDefaultRule(data);
            });
        }

        if (gameData["classes/advanced_classes"]) {
            Object.entries(gameData["classes/advanced_classes"]).forEach(([name, data]) => {
                state.advancedClasses[name] = createDefaultRule(data);
            });
        }

        return state;
    },

    build: (patchMap) => {
        const { sectionStates, gameData } = useModEditorStore.getState();
        const state = sectionStates["classes"] as ClassesState;

        const buildPatch = (rules: Record<string, ClassModRule>, fileKey: string) => {
            const patch: Record<string, any> = {};
            const originalData = gameData?.[fileKey] || {};
            const passivePool = getAllAvailablePassives(gameData);

            Object.entries(rules).forEach(([name, rule]) => {
                if (!rule.enabled) return;

                // 先天被动 patch（最终写入 innate_passives）
                const innatePassivesPatch: Record<string, any> = {};

                // A) 选择被动覆盖：从被动(1/2)提取 passives 合并
                Object.entries(rule.innatePassives).forEach(([psId, level]) => {
                    const psData = passivePool[psId];
                    if (!psData) return;

                    const content = psData?.[level]?.passives || psData?.passives;
                    if (content) deepMergePlainObject(innatePassivesPatch, structuredClone(content));
                });

                // B) 高级模式：直接编辑 passives 字段（path->value）
                if (rule.advancedEnabled && rule.advancedPassives && Object.keys(rule.advancedPassives).length > 0) {
                    const nested = buildNestedFromPathMap(rule.advancedPassives);
                    deepMergePlainObject(innatePassivesPatch, nested);
                }

                const itemPatch: Record<string, any> = {
                    innate_passives: innatePassivesPatch,
                };

                const originalItem = originalData[name] || {};

                // 1) 属性修改对比 - 智能增量导出
                const originalStats = originalItem.stat_mods || {};
                const changedStats: Record<string, number> = {};
                STAT_KEYS.forEach((k) => {
                    if (rule.statMods[k] !== originalStats[k]) changedStats[k] = rule.statMods[k];
                });
                if (Object.keys(changedStats).length > 0) {
                    itemPatch.stat_mods = changedStats;
                }

                // 2) 升级属性池导出
                const originalList: string[] = originalData[name]?.levelup_stats || [];
                const newList = rule.levelupStats;

                if (originalList.every((s) => newList.includes(s))) {
                    if (newList.length > originalList.length) itemPatch["levelup_stats.append"] = newList.filter((s) => !originalList.includes(s));
                } else {
                    itemPatch["levelup_stats.overwrite"] = newList;
                }

                patch[name] = itemPatch;
            });

            return patch;
        };

        const basePatch = buildPatch(state.baseClasses, "classes/classes");
        const advPatch = buildPatch(state.advancedClasses, "classes/advanced_classes");

        if (Object.keys(basePatch).length > 0) patchMap["data/classes/classes.gon.patch"] = basePatch;
        if (Object.keys(advPatch).length > 0) patchMap["data/classes/advanced_classes.gon.patch"] = advPatch;
    },
};

export default ClassesSection;
