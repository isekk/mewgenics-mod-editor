import type { ModifierMode, SectionModule } from "../types";
import { useModEditorStore } from "../modEditorStore";
import { useTranslation } from "react-i18next";
import { Gauge, Coins, HeartPulse, Clover, Sword } from "lucide-react";

// 定义要修改的属性
const DIFF_ATTRS = [
    { key: "wallet_size", icon: <Coins size={14} />, step: 10 },
    { key: "coins_multiplier", icon: <Coins size={14} />, step: 0.1 },
    { key: "food_multiplier", icon: <HeartPulse size={14} />, step: 0.1 },
    { key: "bonus_itemroll_luck", icon: <Clover size={14} />, step: 1 },
    { key: "boss_health_multiplier", icon: <Sword size={14} />, step: 0.1 },
    { key: "event_difficulty", icon: <Gauge size={14} />, step: 0.5 },
];

// 嵌套属性 (针对精英怪配置)
const NESTED_ATTRS = [
    "easy/elite_buffs",
    "easy/elite_budget",
    "hard/elite_buffs",
    "hard/elite_budget",
];

type AttrRule = {
    enabled: boolean;
    mode: ModifierMode;
    value: number;
};

type DifficultyState = Record<string, AttrRule>;

function DifficultySectionComponent() {
    const st = useModEditorStore((s) => (s.sectionStates["difficulty"] as DifficultyState));
    const mutateSection = useModEditorStore.use.mutateSection();
    const { t } = useTranslation();

    if (!st) return <div className="p-4 text-slate-400">{t('chu-shi-hua-zhong')}...</div>;

    const renderCard = (attr: string, icon?: React.ReactNode, step = 1) => {
        const rule = st[attr];
        return (
            <div key={attr} className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${rule.enabled ? 'bg-white/60 border-[var(--fluent-accent)] shadow-md' : 'bg-white/20 border-white/10 opacity-60'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => mutateSection<DifficultyState>("difficulty", (d) => { d[attr].enabled = e.target.checked; })}
                            className="w-4 h-4 accent-[var(--fluent-accent)]"
                        />
                        <span className="flex items-center gap-1 font-bold text-sm text-slate-700">
                            {icon} {t(`diff.${attr.replace('/', '.')}`)}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-7 flex bg-white/50 rounded-lg p-1 border border-white">
                        {(['add', 'multiply', 'fixed'] as ModifierMode[]).map((m) => (
                            <button
                                key={m}
                                disabled={!rule.enabled}
                                onClick={() => mutateSection<DifficultyState>("difficulty", (d) => { d[attr].mode = m; })}
                                className={`text-[10px] flex-1 py-1 rounded-md transition-all ${rule.mode === m ? 'bg-[var(--fluent-accent)] text-white' : 'hover:bg-white'}`}
                            >
                                {t(`label-${m}`)}
                            </button>
                        ))}
                    </div>
                    <input
                        type="number"
                        disabled={!rule.enabled}
                        step={step}
                        className="col-span-5 fluent-input !py-1 text-xs text-center"
                        value={rule.value}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            mutateSection<DifficultyState>("difficulty", (d) => { d[attr].value = val; });
                        }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DIFF_ATTRS.map(a => renderCard(a.key, a.icon, a.step))}
                {NESTED_ATTRS.map(a => renderCard(a, <Gauge size={14} />, 0.5))}
            </div>
        </div>
    );
}

const DifficultySection: SectionModule<DifficultyState> = {
    id: "difficulty",
    title: "sections.difficulty-modifier",
    Component: DifficultySectionComponent,

    initDefaultState: () => {
        const state: DifficultyState = {};
        [...DIFF_ATTRS.map(a => a.key), ...NESTED_ATTRS].forEach(key => {
            state[key] = { enabled: false, mode: 'fixed', value: 0 };
        });
        // 为某些属性设置合理的默认初始值
        state["wallet_size"].value = 99;
        state["coins_multiplier"].value = 1.0;
        state["bonus_itemroll_luck"].mode = 'add';
        return state;
    },
    build: (patchMap) => {
        const { sectionStates, gameData } = useModEditorStore.getState();
        const state = sectionStates["difficulty"] as DifficultyState;
        if (!gameData?.difficulties) return;

        const patch: Record<string, any> = {};

        Object.keys(gameData.difficulties).forEach((lvl) => {
            const itemPatch: Record<string, any> = {};

            Object.entries(state).forEach(([attrPath, rule]) => {
                if (!rule.enabled) return;

                // 根据模式确定后缀：fixed不带后缀(覆盖)，add带.add，multiply带.multiply
                const suffix = rule.mode === 'add' ? '.add' : (rule.mode === 'multiply' ? '.multiply' : '');
                const parts = attrPath.split('/');
                const value = Number(rule.value.toFixed(2));

                if (parts.length === 1) {
                    // 顶层属性处理，例如 wallet_size.add
                    itemPatch[parts[0] + suffix] = value;
                } else {
                    // 嵌套属性处理，例如 easy: { elite_buffs.multiply: 1.5 }
                    const [parent, child] = parts;
                    itemPatch[parent] = itemPatch[parent] || {};
                    itemPatch[parent][child + suffix] = value;
                }
            });

            if (Object.keys(itemPatch).length > 0) patch[lvl] = itemPatch;
        });

        if (Object.keys(patch).length > 0) {
            patchMap["data/difficulties.gon.patch"] = patch;
        }
    }

};

export default DifficultySection;
