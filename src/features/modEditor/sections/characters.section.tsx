import type { SectionModule } from "../types";
import { useModEditorStore } from "../modEditorStore";
import { useTranslation } from "react-i18next";
import { Zap, Sparkles, Trash2, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { buildNestedFromPathMap, deepMergePlainObject } from "../utils";
import {
    PassiveIcon,
    PassiveSearch,
    getAllAvailablePassives,
    PassivePathSearch,
    AdvancedPassiveRow
} from "../components/PassiveShared";

// 角色属性键名映射
const CHAR_STAT_KEYS = ["strength", "dexterity", "constitution", "intelligence", "speed", "charisma", "luck"];
const STAT_MAP: Record<string, string> = {
    strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", speed: "spd", charisma: "cha", luck: "lck"
};

type CharModRule = {
    enabled: boolean;
    stats: Record<string, number>;
    innatePassives: Record<string, number>; // ID -> Level (覆盖模式)

    // 高级模式
    advancedEnabled: boolean;
    advancedPassives: Record<string, any>; // Path -> Value
};

type CharactersState = {
    chars: Record<string, CharModRule>;
};

function CharactersSectionComponent() {
    const st = useModEditorStore((s) => s.sectionStates["characters"] as CharactersState);
    const gameData = useModEditorStore.use.gameData();
    const mutateSection = useModEditorStore.use.mutateSection();
    const allPassivePaths = useModEditorStore.use.allPassivePaths();
    const { t } = useTranslation();

    const passiveFieldMeta = useModEditorStore.use.passiveFieldMeta();

    const passivePool = useMemo(() => getAllAvailablePassives(gameData), [gameData]);

    if (!st) return <div className="p-4 text-slate-400">{t("chu-shi-hua-zhong")}...</div>;

    const renderCharUI = (name: string) => {
        const rule = st.chars[name];
        const onRulePatch = (patch: Partial<CharModRule>) => {
            mutateSection<CharactersState>("characters", (d) => {
                Object.assign(d.chars[name], patch);
            });
        };

        return (
            <div key={name} className={`p-4 rounded-2xl border transition-all space-y-4 ${rule.enabled ? "bg-white/70 border-amber-500 shadow-lg" : "bg-white/20 border-white/10 opacity-60"}`}>
                {/* 头部 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => onRulePatch({ enabled: e.target.checked })}
                            className="w-4 h-4 accent-amber-600 cursor-pointer"
                        />
                        {/* <div className="w-8 h-8 flex items-center justify-center bg-black/5 rounded-lg overflow-hidden border border-black/5">
                            <img 
                                src={`/image/classes/PlayerCat.webp`} 
                                className={`w-full h-full object-contain ${name.includes('Shade') ? 'brightness-0' : ''}`} 
                            />
                        </div> */}
                        <span className="font-bold text-sm text-slate-700">{t(`characters.${name}`, { defaultValue: name })}</span>
                    </div>
                </div>

                {rule.enabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                        {/* 1. Stats */}
                        <div>
                            <div className="fluent-label text-[10px] mb-2 flex items-center gap-1">
                                <Zap size={10} /> {t("class.stat-mods")}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {CHAR_STAT_KEYS.map((stat) => (
                                    <div key={stat} className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            className="fluent-input !py-0.5 !px-1 text-center text-xs w-full"
                                            value={rule.stats[stat] || 0}
                                            onChange={(e) => {
                                                const nextStats = { ...rule.stats, [stat]: parseFloat(e.target.value) || 0 };
                                                onRulePatch({ stats: nextStats });
                                            }}
                                        />
                                        <div className="mt-1 flex flex-col items-center">
                                            <img src={`/image/attr/attr_${STAT_MAP[stat]}.webp`} className="w-6 h-4 object-contain opacity-70" />
                                            <span className="text-[8px] uppercase text-slate-400">{t(`attr.${STAT_MAP[stat]}`)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Innate Passives (ID Based) */}
                        <div className="pt-2 border-t border-slate-100">
                            <div className="fluent-label text-[10px] mb-2 flex items-center gap-1">
                                <Sparkles size={10} /> {t("class.innate-passives")}
                            </div>
                            <div className="space-y-1 mb-2">
                                {Object.entries(rule.innatePassives).map(([psId, level]) => (
                                    <div key={psId} className="flex items-center gap-2 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                                        <PassiveIcon id={psId} className="w-8 h-5" />
                                        <span className="text-[11px] font-bold flex-1 truncate">{t(passivePool[psId]?.name || psId)}</span>
                                        <div className="flex items-center gap-1">
                                            {[1, 2].map(lvl => (
                                                <button
                                                    key={lvl}
                                                    onClick={() => onRulePatch({ innatePassives: { ...rule.innatePassives, [psId]: lvl } })}
                                                    className={`w-5 h-5 text-[9px] rounded ${level === lvl ? 'bg-amber-500 text-white' : 'bg-white text-amber-500 border'}`}
                                                >{lvl}</button>
                                            ))}
                                            <button onClick={() => {
                                                const next = { ...rule.innatePassives };
                                                delete next[psId];
                                                onRulePatch({ innatePassives: next });
                                            }} className="ml-1 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <PassiveSearch
                                passivePool={passivePool}
                                onSelect={(id) => onRulePatch({ innatePassives: { ...rule.innatePassives, [id]: 1 } })}
                            />
                        </div>

                        {/* 3. Advanced Mode (Path Based) */}
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                                    <SlidersHorizontal size={12} className="text-purple-500" />
                                    {t("class.advanced.title")}
                                </div>
                                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 accent-purple-600"
                                        checked={rule.advancedEnabled}
                                        onChange={(e) => onRulePatch({ advancedEnabled: e.target.checked })}
                                    />
                                    {t("class.advanced.enable")}
                                </label>
                            </div>

                            <PassivePathSearch
                                allPaths={allPassivePaths}
                                disabled={!rule.advancedEnabled}
                                onPick={(path) => {
                                    if (path in rule.advancedPassives) return;
                                    const meta = passiveFieldMeta[path]; 

                                    const def = meta?.defaultValue ?? (meta?.type === "number" ? 0 : "");
                                    onRulePatch({ advancedPassives: { ...rule.advancedPassives, [path]: def } });
                                }}
                            />

                            {rule.advancedEnabled && (
                                <div className="space-y-1.5">
                                    {Object.keys(rule.advancedPassives).length === 0 ? (
                                        <div className="text-[10px] text-slate-400 italic px-2 py-1">{t("class.advanced.empty")}</div>
                                    ) : (
                                        Object.keys(rule.advancedPassives).sort().map(path => (
                                            <AdvancedPassiveRow
                                                key={path}
                                                path={path}
                                                value={rule.advancedPassives[path]}
                                                onChange={(val) => {
                                                    mutateSection<CharactersState>("characters", (d) => {
                                                        d.chars[name].advancedPassives[path] = val;
                                                    });
                                                }}
                                                onRemove={() => {
                                                    mutateSection<CharactersState>("characters", (d) => {
                                                        delete d.chars[name].advancedPassives[path];
                                                    });
                                                }}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(st.chars).map(renderCharUI)}
            </div>
        </div>
    );
}
const CharactersHelp = () => {
  const { t } = useTranslation();
  
  // 这里的词条示例
  const examples = [
    { p: "Uncontrollable", d: t("help.char.example-1") },
    { p: "HealRandomInjury", d: t("help.char.example-2") },
    { p: "StatusImmunity [Madness PermanentMadness]", d: t("help.char.example-3") },
    { p: "CollectPickupsOnBattleEnd", d: t("help.char.example-4") },
    { p: "InjuryImmunity", d: t("help.char.example-5") },
    { p: "StatusOnBattleEnd/RandomMutation", d: t("help.char.example-6") },
    { p: "SpawnCatCloneOnCorpsePopped", d: t("help.char.example-7") },
  ];

  return (
    <div className="space-y-5 text-sm leading-relaxed">
      {/* 基础说明 */}
      <div className="text-slate-600 border-l-4 border-slate-300 pl-4">
        {t("help.char.basic-desc")}
      </div>

      {/* 高级模式容器 */}
      <div className="bg-purple-50/80 p-5 rounded-2xl border border-purple-100 shadow-sm">
        <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
          {t("help.common.advanced-title")}
        </h4>
        <p className="text-purple-800/70 text-xs mb-5">
          {t("help.char.advanced-desc")}
        </p>

        {/* 示例列表：上下结构排版 */}
        <div className="space-y-3">
          <h5 className="font-bold text-[10px] text-purple-400 uppercase tracking-widest px-1">
            {t("help.char.examples-title")}
          </h5>
          
          <div className="grid gap-2.5">
            {examples.map((ex) => (
              <div 
                key={ex.p} 
                className="group bg-white/60 hover:bg-white p-3 rounded-xl border border-purple-100 transition-all"
              >
                {/* 上层：中文说明 */}
                <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  {ex.d}
                </div>
                {/* 下层：代码路径 */}
                <code className="block text-[10px] font-mono bg-purple-100/50 p-2 rounded-lg text-blue-700 break-all leading-normal border border-purple-50/50">
                  {ex.p}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


const CharactersSection: SectionModule<CharactersState> = {
    id: "characters",
    title: "sections.character-editor",
    Component: CharactersSectionComponent,
    HelpComponent: CharactersHelp,

    initDefaultState: (gameData) => {
        const state: CharactersState = { chars: {} };
        const fileData = gameData["characters/player_cat"] || {};

        Object.entries(fileData).forEach(([name, data]: [string, any]) => {
            if (name !== "PlayerCat") return;
            state.chars[name] = {
                enabled: false,
                stats: data.stats || {},
                innatePassives: {},
                advancedEnabled: false,
                advancedPassives: {},
            };
        });
        return state;
    },

    build: (patchMap) => {
        const { sectionStates, gameData } = useModEditorStore.getState();
        const state = sectionStates["characters"] as CharactersState;
        const originalFileData = gameData["characters/player_cat"] || {};
        const passivePool = getAllAvailablePassives(gameData);

        const patch: Record<string, any> = {};

        Object.entries(state.chars).forEach(([name, rule]) => {
            if (!rule.enabled) return;

            const charPatch: Record<string, any> = {};

            // 1. Stats (智能增量)
            const originalStats = originalFileData[name]?.stats || {};
            const statPatch: Record<string, number> = {};
            CHAR_STAT_KEYS.forEach(k => {
                if (rule.stats[k] !== originalStats[k]) statPatch[k] = rule.stats[k];
            });
            if (Object.keys(statPatch).length > 0) charPatch.stats = statPatch;

            // 2. Passives 合并
            const finalPassives: Record<string, any> = {};

            // A) ID 被动
            Object.entries(rule.innatePassives).forEach(([psId, level]) => {
                const psData = passivePool[psId];
                const content = psData?.[level]?.passives || psData?.passives;
                if (content) deepMergePlainObject(finalPassives, structuredClone(content));
            });

            // B) 高级路径被动
            if (rule.advancedEnabled && Object.keys(rule.advancedPassives).length > 0) {
                const nested = buildNestedFromPathMap(rule.advancedPassives);
                deepMergePlainObject(finalPassives, nested);
            }

            if (Object.keys(finalPassives).length > 0) {
                charPatch.passives = finalPassives;
            }

            if (Object.keys(charPatch).length > 0) patch[name] = charPatch;
        });

        if (Object.keys(patch).length > 0) {
            patchMap["data/characters/player_cat.gon.patch"] = patch;
        }
    },
};

export default CharactersSection;
