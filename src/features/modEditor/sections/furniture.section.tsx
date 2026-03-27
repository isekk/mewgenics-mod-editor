import type { ModifierMode, SectionModule } from "../types";
import { useModEditorStore } from "../modEditorStore";
import { useTranslation } from "react-i18next";
import { Wand2, ShieldCheck } from "lucide-react";

const NUMERIC_ATTRS = [
    "Comfort", "Health", "Appeal", "Stimulation", "Evolution",
    "FoodStorage", "FightBonusRewards", "FightRisk", "BreedSuppression"
];

type AttrRule = {
    enabled: boolean;
    mode: ModifierMode;
    value: number;
    noNegative: boolean;
};

// 状态改为以“属性”为 Key
type FurnitureState = Record<string, AttrRule>;

function FurnitureSectionComponent() {
    const st = useModEditorStore((s) => (s.sectionStates["furniture"] as FurnitureState));
    const mutateSection = useModEditorStore.use.mutateSection();
    const { t } = useTranslation();

    if (!st) return <div className="p-4 text-slate-400">{t('chu-shi-hua-zhong')}...</div>;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--fluent-accent-strong)] mb-4 bg-[var(--fluent-accent-soft)] p-3 rounded-xl">
                <Wand2 size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">{t('global-furniture-rules-desc')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {NUMERIC_ATTRS.map((attr) => {
                    const rule = st[attr] || { enabled: false, mode: 'add', value: 0, noNegative: true };

                    return (
                        <div key={attr} className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${rule.enabled ? 'bg-white/60 border-[var(--fluent-accent)] shadow-md' : 'bg-white/20 border-white/10 opacity-60'}`}>
                            {/* 头部：开关和标题 */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg cursor-pointer accent-[var(--fluent-accent)]"
                                        checked={rule.enabled}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            mutateSection<FurnitureState>("furniture", (d) => {
                                                d[attr].enabled = checked;
                                            });
                                        }}
                                    />
                                    <span className="font-bold text-sm text-slate-700">{t(`attr.${attr}`)}</span>
                                </div>
                                {rule.enabled && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        <ShieldCheck size={12} /> {t('active')}
                                    </div>
                                )}
                            </div>

                            {/* 控制区 */}
                            <div className="grid grid-cols-12 gap-2">
                                {/* 模式选择 */}
                                <div className="col-span-6 flex bg-white/50 rounded-lg p-1 border border-white">
                                    {(['add', 'multiply', 'fixed'] as ModifierMode[]).map((m) => (
                                        <button
                                            key={m}
                                            disabled={!rule.enabled}
                                            onClick={() => mutateSection<FurnitureState>("furniture", (d) => { d[attr].mode = m; })}
                                            className={`text-sm flex-1 flex items-center justify-center py-1 rounded-md transition-all ${rule.mode === m ? 'bg-[var(--fluent-accent)] text-white shadow-sm' : 'hover:bg-white'}`}
                                            title={t(`mode-${m}`)}
                                        >
                                            {m === 'add' && t('label-add')}
                                            {m === 'multiply' && t('label-mult')}
                                            {m === 'fixed' && t('label-set')}
                                        </button>
                                    ))}
                                </div>

                                {/* 数值输入 */}
                                <input
                                    type="number"
                                    disabled={!rule.enabled}
                                    step={rule.mode === 'multiply' ? 0.1 : 1}
                                    className="col-span-5 fluent-input !py-1 text-sm text-center"
                                    value={rule.value}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        mutateSection<FurnitureState>("furniture", (d) => { d[attr].value = val; });
                                    }}
                                />
                            </div>

                            {/* 附加选项 */}
                            <div className="flex items-center gap-2 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        disabled={!rule.enabled}
                                        className="w-3.5 h-3.5 rounded cursor-pointer"
                                        checked={rule.noNegative}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            mutateSection<FurnitureState>("furniture", (d) => { d[attr].noNegative = checked; });
                                        }}
                                    />
                                    <span className="text-[11px] text-slate-500 group-hover:text-slate-700">{t('prevent-negative')}</span>
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const FurnitureSection: SectionModule<FurnitureState> = {
    id: "furniture",
    title: "sections.furniture-effects",
    Component: FurnitureSectionComponent,

    initDefaultState: () => {
        const state: FurnitureState = {};
        NUMERIC_ATTRS.forEach(attr => {
            state[attr] = {
                enabled: false,
                mode: 'add',
                value: 0,
                noNegative: true
            };
        });
        return state;
    },

    build: (patchMap) => {
        const { sectionStates, _defaults, gameData } = useModEditorStore.getState();
        const state = (sectionStates["furniture"] ?? _defaults["furniture"]) as FurnitureState;

        if (!gameData?.furniture_effects) return;

        const patch: Record<string, any> = {};

        // 遍历所有家具
        Object.entries(gameData.furniture_effects).forEach(([fid, raw]: [string, any]) => {
            const itemPatch: Record<string, number> = {};

            // 对每个启用的属性规则进行计算
            NUMERIC_ATTRS.forEach(attr => {
                const rule = state[attr];
                if (rule.enabled && attr in raw) {
                    const rule = state[attr];
                    if (rule.enabled && attr in raw) {
                        const originalVal = (raw[attr] as number) || 0;
                        let patchKey = attr;
                        let patchValue = rule.value;

                        if (rule.mode === 'add') {
                            // 预计算：原始值 + 增加值
                            if (rule.noNegative && (originalVal + patchValue < 0)) {
                                patchValue = -originalVal;
                            }
                            if (patchValue === 0) return;
                            patchKey = `${attr}.add`;
                        }
                        else if (rule.mode === 'multiply') {
                            // 预计算：原始值 * 倍率
                            if (rule.noNegative && (originalVal * patchValue < 0)) {
                                patchValue = 0; // 乘 0 变 0
                            }
                            if (patchValue === 1) return;
                            patchKey = `${attr}.multiply`;
                        }
                        else if (rule.mode === 'fixed') {
                            if (rule.noNegative) {
                                patchValue = Math.max(0, patchValue);
                            }
                            patchKey = attr;
                        }

                        itemPatch[patchKey] = Number(patchValue.toFixed(2));
                    }
                }
            });

            if (Object.keys(itemPatch).length > 0) {
                patch[fid] = itemPatch;
            }
        });

        if (Object.keys(patch).length > 0) {
            patchMap["data/furniture_effects.gon.patch"] = patch;
        }
    }
};

export default FurnitureSection;
