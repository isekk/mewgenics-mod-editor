import type { ModifierMode, SectionModule } from "../types";
import { useModEditorStore } from "../modEditorStore";
import { useTranslation } from "react-i18next";
import { Layers, Zap, Activity, Info } from "lucide-react";

// ==========================================
// 开发者在此维护属性列表，UI 和逻辑会自动同步
// ==========================================

// 1. 基础属性 (位于 JSON 根目录)
const BASE_STATS = ['shield', 'spd', 'con', 'lck', 'cha', 'int', 'divine_shield'];

// 2. 被动属性 (位于 passives 对象内部，支持多级路径)
const PASSIVE_PATHS = [
    "Thorns",
    "Brace",
    "CritChanceUp",
    "AddStartingMana",
    "HealthRegenUp",
    "AddLevelUpRerolls",
    "AddStatusToAllDamage/BonusKnockbackDamage",
    "StatusEachTurnEnd/Shield",
    "StatusEachTurnEnd/RandomStatUp",
    "AddPassivesToMinions/DamageUp",
    "AddPassivesToMinions/AddMaxHealth",
    "AddPassivesToMinions/HealthGain",
    "DamageUp",
    "StatusOnKillEnemy/DamageUp",
];

type ModifierRule = {
    enabled: boolean;
    mode: ModifierMode;
    value: number;
    noNegative: boolean;
};

type SetBonusState = {
    globalPieces: { enabled: boolean; value: number };
    baseStats: Record<string, ModifierRule>;
    passives: Record<string, ModifierRule>; // Key 为 PASSIVE_PATHS 中的字符串
};

// 辅助函数：根据路径读取嵌套数值
const getNestedValue = (obj: any, path: string) => {
    return path.split('/').reduce((prev, curr) => prev?.[curr], obj);
};

function ItemSetBonusesSectionComponent() {
    const st = useModEditorStore((s) => (s.sectionStates["itemSetBonuses"] as SetBonusState));
    const mutateSection = useModEditorStore.use.mutateSection();
    const { t } = useTranslation();

    if (!st) return <div className="p-4 text-slate-400">{t('chu-shi-hua-zhong')}...</div>;

    // 通用渲染逻辑：模式切换 + 数值输入 + 非负开关
    const renderModifierUI = (key: string, rule: ModifierRule, updateFn: (p: Partial<ModifierRule>) => void) => (
        <div className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${rule.enabled ? 'bg-white border-blue-300 shadow-sm' : 'bg-slate-100/40 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                    <input type="checkbox" checked={rule.enabled} onChange={e => updateFn({ enabled: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                    {t(`setbonus.${key}`)}
                </label>
            </div>
            <div className="flex gap-1">
                {(['add', 'multiply', 'fixed'] as ModifierMode[]).map(m => (
                    <button 
                        key={m} disabled={!rule.enabled}
                        onClick={() => updateFn({ mode: m })}
                        className={`text-sm flex-1 py-1 rounded transition-colors ${rule.mode === m ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}
                    >
                        {t(`label-${m}`)}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input 
                    type="number" disabled={!rule.enabled} step={rule.mode === 'multiply' ? 0.1 : 1}
                    className="fluent-input !py-0.5 text-xs flex-1 text-center"
                    value={rule.value} onChange={e => updateFn({ value: parseFloat(e.target.value) || 0 })}
                />
                <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                    <input type="checkbox" disabled={!rule.enabled} checked={rule.noNegative} onChange={e => updateFn({ noNegative: e.target.checked })} />
                    {t('no-neg')}
                </label>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* 1. 全局件数要求 (1-5) */}
            <div className="fluent-surface-strong p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 font-bold text-blue-700 text-sm">
                        <Layers size={18} /> {t('setbonus.global-pieces')}
                    </div>
                    <div className="flex items-center gap-3 bg-white/60 p-1 px-3 rounded-lg border border-white">
                        <input 
                            type="checkbox" 
                            checked={st.globalPieces.enabled}
                            onChange={e => mutateSection<SetBonusState>("itemSetBonuses", d => { d.globalPieces.enabled = e.target.checked })}
                            className="w-5 h-5 accent-blue-600"
                        />
                        <select 
                            disabled={!st.globalPieces.enabled}
                            className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
                            value={st.globalPieces.value}
                            onChange={e => mutateSection<SetBonusState>("itemSetBonuses", d => { d.globalPieces.value = parseInt(e.target.value) })}
                        >
                            {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} {t('setbonus.pieces')}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* 2. 基础属性修改 */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 font-bold px-1 text-sm border-l-4 border-blue-500 pl-3">
                    <Zap size={18} className="text-blue-500" /> {t('setbonus.section-base')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {BASE_STATS.map(key => renderModifierUI(
                        key, 
                        st.baseStats[key], 
                        (p) => mutateSection<SetBonusState>("itemSetBonuses", d => { Object.assign(d.baseStats[key], p) })
                    ))}
                </div>
            </section>

            {/* 3. 被动属性修改 */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 font-bold px-1 text-sm border-l-4 border-purple-500 pl-3">
                    <Activity size={18} className="text-purple-500" /> {t('setbonus.section-passives')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PASSIVE_PATHS.map(path => renderModifierUI(
                        path, 
                        st.passives[path], 
                        (p) => mutateSection<SetBonusState>("itemSetBonuses", d => { Object.assign(d.passives[path], p) })
                    ))}
                </div>
            </section>
        </div>
    );
}
const SetBonusHelp = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 text-sm">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
        <p className="font-medium">{t("help.setbonus.intro")}</p>
      </div>
      <div className="flex gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
        <Info className="shrink-0" size={18} />
        <p className="text-xs font-bold">{t("help.setbonus.warning")}</p>
      </div>
    </div>
  );
};

const ItemSetBonusesSection: SectionModule<SetBonusState> = {
    id: "itemSetBonuses",
    title: "sections.item-set-bonuses",
    Component: ItemSetBonusesSectionComponent,
    HelpComponent: SetBonusHelp,

    initDefaultState: () => {
        const baseStats: Record<string, ModifierRule> = {};
        BASE_STATS.forEach(s => { baseStats[s] = { enabled: false, mode: 'add', value: 0, noNegative: true }; });

        const passives: Record<string, ModifierRule> = {};
        PASSIVE_PATHS.forEach(p => { passives[p] = { enabled: false, mode: 'multiply', value: 1, noNegative: true }; });

        return {
            globalPieces: { enabled: false, value: 3 },
            baseStats,
            passives
        };
    },

    build: (patchMap) => {
        const { sectionStates, gameData } = useModEditorStore.getState();
        const state = sectionStates["itemSetBonuses"] as SetBonusState;
        if (!gameData?.item_setbonuses) return;

        const patch: Record<string, any> = {};

        Object.entries(gameData.item_setbonuses).forEach(([setId, rawData]: [string, any]) => {
            const itemPatch: Record<string, any> = {};

            // 1. 修改件数要求
            if (state.globalPieces.enabled) {
                itemPatch["pieces_required"] = state.globalPieces.value;
            }

            // 2. 处理基础属性
            BASE_STATS.forEach(stat => {
                const rule = state.baseStats[stat];
                if (rule.enabled && stat in rawData) {
                    const original = rawData[stat] as number;
                    let val = rule.mode === 'add' ? original + rule.value : (rule.mode === 'multiply' ? original * rule.value : rule.value);
                    if (rule.noNegative) val = Math.max(0, val);
                    itemPatch[stat] = Number(val.toFixed(2));
                }
            });

            // 3. 处理被动属性
            PASSIVE_PATHS.forEach(path => {
                const rule = state.passives[path];
                if (!rule.enabled) return;

                const original = getNestedValue(rawData.passives, path);
                if (typeof original === 'number') {
                    let val = rule.mode === 'add' ? original + rule.value : (rule.mode === 'multiply' ? original * rule.value : rule.value);
                    if (rule.noNegative) val = Math.max(0, val);

                    // 递归构建嵌套 Patch 对象
                    itemPatch.passives = itemPatch.passives || {};
                    const parts = path.split('/');
                    let cur = itemPatch.passives;
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        if (i === parts.length - 1) cur[part] = Number(val.toFixed(2));
                        else {
                            cur[part] = cur[part] || {};
                            cur = cur[part];
                        }
                    }
                }
            });

            if (Object.keys(itemPatch).length > 0) patch[setId] = itemPatch;
        });

        if (Object.keys(patch).length > 0) {
            patchMap["data/item_setbonuses.gon.patch"] = patch;
        }
    }
};

export default ItemSetBonusesSection;
