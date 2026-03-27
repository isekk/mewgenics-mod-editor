import { useMemo } from "react";
import type { ModifierMode, SectionModule } from "../types";
import { useModEditorStore } from "../modEditorStore";
import { useTranslation } from "react-i18next";
import {
  Brush,
  Ear,
  Eye,
  Smile,
  Skull,
  Footprints,
  Sparkles,
  Wand2,
  Layers3,
} from "lucide-react";

type MutationPart =
  | "body"
  | "ears"
  | "eyebrows"
  | "eyes"
  | "head"
  | "legs"
  | "mouth"
  | "tail"
  | "texture";

const PARTS: Array<{
  id: MutationPart;
  icon: React.ReactNode;
}> = [
    { id: "body", icon: <Layers3 size={16} /> },
    { id: "ears", icon: <Ear size={16} /> },
    { id: "eyebrows", icon: <Brush size={16} /> },
    { id: "eyes", icon: <Eye size={16} /> },
    { id: "head", icon: <Skull size={16} /> },
    { id: "legs", icon: <Footprints size={16} /> },
    { id: "mouth", icon: <Smile size={16} /> },
    { id: "tail", icon: <Wand2 size={16} /> },
    { id: "texture", icon: <Sparkles size={16} /> },
  ];

// 你这些 mutation 条目里最常见的“顶层数值属性”
const STAT_KEYS = [
  "str",
  "dex",
  "con",
  "int",
  "spd",
  "cha",
  "lck",
  "shield",
  "divine_shield",
] as const;

type StatKey = (typeof STAT_KEYS)[number];

type AttrRule = {
  enabled: boolean;
  mode: ModifierMode; // 'add' | 'multiply' | 'fixed'
  value: number;
  noNegative: boolean; // 结果非负
};

type PartRule = {
  enabled: boolean;
  nonNegativeIdsOnly?: boolean;
};

type MutationsBatchState = {
  parts: Record<MutationPart, PartRule>;
  stats: Record<StatKey, AttrRule>;

  // 一键套用的输入框
  presets: {
    mult: number;
    add: number;
    fixed: number;
  };
};

export function applyRule(original: number, rule: AttrRule): number {
  let v = original;

  if (rule.mode === "add") v = original + rule.value;
  else if (rule.mode === "multiply") v = original * rule.value;
  else v = rule.value; // fixed

  if (rule.noNegative) v = Math.max(0, v);
  return v;
}

function MutationsBatchSectionComponent() {
  const st = useModEditorStore(
    (s) => s.sectionStates["mutationsBatch"] as MutationsBatchState,
  );
  const mutateSection = useModEditorStore.use.mutateSection();
  const gameData = useModEditorStore.use.gameData();
  const { t } = useTranslation();

  const partCounts = useMemo(() => {
    const out: Record<string, number> = {};
    if (!gameData) return out;
    for (const p of PARTS) {
      const key = `mutations/${p.id}`;
      const obj = gameData[key] as Record<string, any> | undefined;
      out[p.id] = obj ? Object.keys(obj).length : 0;
    }
    return out;
  }, [gameData]);

  if (!st) return <div className="p-4 text-slate-400">{t("chu-shi-hua-zhong")}...</div>;

  const setAllStats = (mode: ModifierMode, value: number) => {
    mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
      for (const k of STAT_KEYS) {
        d.stats[k].enabled = true;
        d.stats[k].mode = mode;
        d.stats[k].value = value;
      }
    });
  };

  const setAllPartsEnabled = (enabled: boolean) => {
    mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
      for (const p of PARTS) d.parts[p.id].enabled = enabled;
    });
  };

  const statIconSrc = (k: StatKey) => `/image/attr/attr_${k}.webp`;

  return (
    <div className="space-y-6">
      {/* Part 选择 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="fluent-label">{t("mutations.parts")}</div>
          <div className="flex gap-2">
            <button
              className="fluent-button-secondary !py-1 !px-3 text-xs"
              onClick={() => setAllPartsEnabled(true)}
            >
              {t("mutations.enableAll")}
            </button>
            <button
              className="fluent-button-secondary !py-1 !px-3 text-xs"
              onClick={() => setAllPartsEnabled(false)}
            >
              {t("mutations.disableAll")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PARTS.map((p) => {
            const pr = st.parts[p.id];
            const count = partCounts[p.id] ?? 0;

            return (
              <div
                key={p.id}
                className={[
                  "p-3 rounded-xl border transition-all",
                  pr.enabled
                    ? "bg-white/70 border-[var(--fluent-accent)] shadow-sm"
                    : "bg-white/20 border-white/10 opacity-70",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[var(--fluent-accent)]"
                      checked={pr.enabled}
                      onChange={(e) =>
                        mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                          d.parts[p.id].enabled = e.target.checked;
                        })
                      }
                    />
                    <span className="flex items-center gap-2 font-bold text-sm text-slate-700">
                      <span className="text-slate-500">{p.icon}</span>
                      {t(`mutations.part.${p.id}`, { defaultValue: p.id })}
                    </span>
                  </label>

                  <span className="text-[11px] text-slate-400">
                    {t("mutations.count", { defaultValue: "Count" })}: {count}
                  </span>
                </div>

                {/* 非负 ID */}
                {pr.enabled && (
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={pr.nonNegativeIdsOnly ?? true}
                      onChange={(e) =>
                        mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                          d.parts.tail.nonNegativeIdsOnly = e.target.checked;
                        })
                      }
                    />
                    {t("mutations.NonNegativeIdsOnly")}
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 一键套用 */}
      <div className="space-y-2">
        <div className="fluent-label">{t("mutations.quickApply")}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* MULT */}
          <div className="p-3 rounded-xl border bg-white/60 border-white/30">
            <div className="text-xs font-bold text-slate-700 mb-2">{t("label-mult")}</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={0.1}
                className="fluent-input !py-1 text-xs w-28 text-center"
                value={st.presets.mult}
                onChange={(e) =>
                  mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                    d.presets.mult = parseFloat(e.target.value) || 1;
                  })
                }
              />
              <button
                className="fluent-button-secondary !py-1 !px-3 text-xs"
                onClick={() => setAllStats("multiply", st.presets.mult)}
              >
                {t("mutations.applyToAllStats")}
              </button>
            </div>
          </div>

          {/* ADD */}
          <div className="p-3 rounded-xl border bg-white/60 border-white/30">
            <div className="text-xs font-bold text-slate-700 mb-2">{t("label-add")}</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={1}
                className="fluent-input !py-1 text-xs w-28 text-center"
                value={st.presets.add}
                onChange={(e) =>
                  mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                    d.presets.add = parseFloat(e.target.value) || 0;
                  })
                }
              />
              <button
                className="fluent-button-secondary !py-1 !px-3 text-xs"
                onClick={() => setAllStats("add", st.presets.add)}
              >
                {t("mutations.applyToAllStats")}
              </button>
            </div>
          </div>

          {/* SET */}
          <div className="p-3 rounded-xl border bg-white/60 border-white/30">
            <div className="text-xs font-bold text-slate-700 mb-2">{t("label-set")}</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={1}
                className="fluent-input !py-1 text-xs w-28 text-center"
                value={st.presets.fixed}
                onChange={(e) =>
                  mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                    d.presets.fixed = parseFloat(e.target.value) || 0;
                  })
                }
              />
              <button
                className="fluent-button-secondary !py-1 !px-3 text-xs"
                onClick={() => setAllStats("fixed", st.presets.fixed)}
              >
                {t("mutations.applyToAllStats")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 属性规则 */}
      <div className="space-y-2">
        <div className="fluent-label">{t("mutations.stats")}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {STAT_KEYS.map((k) => {
            const rule = st.stats[k];

            return (
              <div
                key={k}
                className={[
                  "p-3 rounded-xl border transition-all space-y-2",
                  rule.enabled
                    ? "bg-white/70 border-[var(--fluent-accent)] shadow-sm"
                    : "bg-white/20 border-white/10 opacity-70",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[var(--fluent-accent)]"
                      checked={rule.enabled}
                      onChange={(e) =>
                        mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                          d.stats[k].enabled = e.target.checked;
                        })
                      }
                    />
                    <span className="flex items-center gap-2 font-bold text-sm text-slate-700">
                      <img
                        src={statIconSrc(k)}
                        className="w-[34px] h-[26px] object-contain opacity-80"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {t(`attr.${k}`, { defaultValue: k.toUpperCase() })}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      disabled={!rule.enabled}
                      checked={rule.noNegative}
                      onChange={(e) =>
                        mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                          d.stats[k].noNegative = e.target.checked;
                        })
                      }
                    />
                    {t("mutations.nonNegativeResult")}
                  </label>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7 flex bg-white/50 rounded-lg p-1 border border-white">
                    {(["add", "multiply", "fixed"] as ModifierMode[]).map((m) => (
                      <button
                        key={m}
                        disabled={!rule.enabled}
                        onClick={() =>
                          mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                            d.stats[k].mode = m;
                          })
                        }
                        className={[
                          "text-[10px] flex-1 py-1 rounded-md transition-all",
                          rule.mode === m
                            ? "bg-[var(--fluent-accent)] text-white"
                            : "hover:bg-white",
                        ].join(" ")}
                      >
                        {t(`label-${m}`)}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    disabled={!rule.enabled}
                    step={rule.mode === "multiply" ? 0.1 : 1}
                    className="col-span-5 fluent-input !py-1 text-xs text-center"
                    value={rule.value}
                    onChange={(e) =>
                      mutateSection<MutationsBatchState>("mutationsBatch", (d) => {
                        d.stats[k].value = parseFloat(e.target.value) || 0;
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
const MutationsHelp = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 text-sm text-slate-600">
      <p>{t("help.mutation.intro")}</p>
      <div className="grid gap-3">
        <div className="bg-slate-50 p-3 rounded-lg border">
          <h4 className="font-bold text-slate-800 mb-1">{t("mutations.quickApply")}</h4>
          <p>{t("help.mutation.quick-desc")}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border">
          <h4 className="font-bold text-slate-800 mb-1">{t("mutations.NonNegativeIdsOnly")}</h4>
          <p>{t("help.mutation.non-neg-desc")}</p>
        </div>
      </div>
    </div>
  );
};

const MutationsBatchSection: SectionModule<MutationsBatchState> = {
  id: "mutationsBatch",
  title: "sections.mutations-batch",
  Component: MutationsBatchSectionComponent,
  HelpComponent: MutationsHelp,

  initDefaultState: () => {
    const parts: MutationsBatchState["parts"] = {
      body: { enabled: false, nonNegativeIdsOnly: true },
      ears: { enabled: false, nonNegativeIdsOnly: true },
      eyebrows: { enabled: false, nonNegativeIdsOnly: true },
      eyes: { enabled: false, nonNegativeIdsOnly: true },
      head: { enabled: false, nonNegativeIdsOnly: true },
      legs: { enabled: false, nonNegativeIdsOnly: true },
      mouth: { enabled: false, nonNegativeIdsOnly: true },
      tail: { enabled: false, nonNegativeIdsOnly: true },
      texture: { enabled: false, nonNegativeIdsOnly: true },
    };

    const stats: MutationsBatchState["stats"] = {} as any;
    for (const k of STAT_KEYS) {
      stats[k] = {
        enabled: false,
        mode: "multiply",
        value: k === "shield" ? 1 : 1,
        noNegative: false,
      };
    }

    return {
      parts,
      stats,
      presets: {
        mult: 2.0,
        add: 1.0,
        fixed: 1.0,
      },
    };
  },

  build: (patchMap) => {
    const { sectionStates, gameData } = useModEditorStore.getState();
    const state = sectionStates["mutationsBatch"] as MutationsBatchState;
    if (!gameData || !state) return;

    for (const p of PARTS) {
      const pr = state.parts[p.id];
      if (!pr?.enabled) continue;

      const srcKey = `mutations/${p.id}`;
      const src = gameData[srcKey]?.[p.id] as Record<string, any> | undefined;
      if (!src) continue;
      console.log('src 存在', srcKey)

      const outPatch: Record<string, any> = {};

      for (const [id, raw] of Object.entries(src)) {
        // tail：可选跳过负数 id（比如 "-2"）
        if (pr.nonNegativeIdsOnly) {
          const n = Number(id);
          if (Number.isFinite(n) && n < 0) continue;
        }

        const itemPatch: Record<string, any> = {};

        for (const k of STAT_KEYS) {
          const rule = state.stats[k];
          if (!rule.enabled) continue;

          const suffix = rule.mode === 'add' ? '.add' : (rule.mode === 'multiply' ? '.multiply' : '');

          // 2. 确定写入的数值 (过滤掉无效的修改，如加0或乘1)
          if (rule.mode === 'add' && rule.value === 0) continue;
          if (rule.mode === 'multiply' && rule.value === 1) continue;
          // 3. 格式化数值并写入
          const patchValue = Number(rule.value.toFixed(4));
          if (raw?.[k] !== patchValue) itemPatch[k + suffix] = patchValue;
        }

        if (Object.keys(itemPatch).length > 0) outPatch[id] = itemPatch;
      }
      console.log('outPatch', outPatch);
      if (Object.keys(outPatch).length > 0) {
        // 按你的工程惯例：mutations/<part> -> data/mutations/<part>.gon.patch
        patchMap[`data/mutations/${p.id}.gon.patch`] = { [p.id]: outPatch };
      }
    }
  },
};

export default MutationsBatchSection;
