import type { ModifierMode, SectionModule } from "../types";
import { useModEditorStore } from "../modEditorStore";
import { useTranslation } from "react-i18next";
import { Cat, Info, Target } from "lucide-react"; 


type NpcFavorState = Array<{
  npc: string;
  enabled: boolean;
  mode: ModifierMode;
  value: number
}>;

const NpcFavorHelp = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {/* 基础说明 */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Cat size={18} /> {t('npc.help-basic-title')}
        </div>
        <p>
          {t("npc.help-basic-desc")}
        </p>
      </div>
      <div className="space-y-3">
        {/* 固定模式说明 */}
        <div className="flex gap-3">
          <div className="mt-1"><Target className="text-orange-500" size={16} /></div>
          <div>
            <p className="font-bold">{t('npc.help-fixed-title')}</p>
            <p className="text-slate-600">
              {t("npc.help-fixed-desc")}
            </p>
          </div>
        </div>
        {/* 倍率模式说明 */}
        <div className="flex gap-3">
          <div className="mt-1"><Info className="text-blue-500" size={16} /></div>
          <div>
            <p className="font-bold">{t('npc.help-mult-title')}</p>
            <p className="text-slate-600">
              {t("npc.help-mult-desc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function NpcFavorSectionComponent() {
  const st = useModEditorStore((s) => (s.sectionStates["npc"] as NpcFavorState));
  const mutateSection = useModEditorStore.use.mutateSection();
  const { t } = useTranslation();

  if (!st) return <div className="p-4 text-slate-400">{t('chu-shi-hua-zhong')}...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {st.map((r, idx) => (
        <div key={r.npc} className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${r.enabled ? 'bg-white/60 border-[var(--fluent-accent)] shadow-md' : 'bg-white/20 border-white/10 opacity-60'}`}>
          {/* 头部：开关和名称 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-5 h-5 rounded-lg cursor-pointer accent-[var(--fluent-accent)]"
              checked={r.enabled}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                mutateSection<NpcFavorState>("npc", (d) => { d[idx].enabled = checked; });
              }}
            />

            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-black/5 rounded-lg overflow-hidden border border-black/5">
              <img
                src={`/image/npc/${r.npc}.webp`}
                alt={r.npc}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // 如果图片不存在，隐藏整个图片容器
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
              />
            </div>

            <span className="font-bold text-sm text-slate-700">{t(`NPC_${r.npc}`, { defaultValue: r.npc })}</span>

          </div>

          {/* 控制区：模式选择 + 数值 */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-7 flex bg-white/50 rounded-lg p-1 border border-white">
              {(['add', 'multiply', 'fixed'] as ModifierMode[]).map((m) => (
                <button
                  key={m}
                  disabled={!r.enabled}
                  onClick={() => mutateSection<NpcFavorState>("npc", (d) => { d[idx].mode = m; })}
                  className={`text-sm flex-1 flex items-center justify-center py-1 rounded-md transition-all ${r.mode === m ? 'bg-[var(--fluent-accent)] text-white shadow-sm' : 'hover:bg-white'}`}
                >
                  {m === 'add' && t('label-add')}
                  {m === 'multiply' && t('label-mult')}
                  {m === 'fixed' && t('label-set')}
                </button>
              ))}
            </div>

            <div className="col-span-5 relative">
              <input
                type="number"
                disabled={!r.enabled}
                className="w-full fluent-input !py-1 text-sm text-center pr-4"
                value={r.value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  mutateSection<NpcFavorState>("npc", (d) => { d[idx].value = val; });
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

}

const NpcFavorSection: SectionModule<NpcFavorState> = {
  id: "npc",
  title: "sections.npc-hao-gan-du-jie-suo",
  Component: NpcFavorSectionComponent,
  HelpComponent: NpcFavorHelp,

  initDefaultState: (gameData) => {
    if (!gameData) return [];

    return Object.entries(gameData.npc_favor_unlocks || {})
      .filter(([_, questGroup]: [string, any]) => {
        return Object.values(questGroup).some((quest: any) => {
          return typeof quest.favor === 'number' && quest.favor >= 1;
        });
      })
      .map(([name]) => ({
        npc: name,
        enabled: false,
        mode: 'fixed' as ModifierMode,
        value: 1,
      }));
  },

  build: (patchMap: Record<string, any>) => {
    const { sectionStates, _defaults, gameData } = useModEditorStore.getState();
    const state = (sectionStates["npc"] ?? _defaults["npc"]) as NpcFavorState;
    if (!gameData) return;

    const npcFavorUnlocks = gameData.npc_favor_unlocks;
    if (!npcFavorUnlocks) return;

    const npcPatch: Record<string, any> = {};

    state.forEach(item => {
      if (!item.enabled) return;
      if (item.mode === 'add' && item.value === 0) return;
      if (item.mode === 'multiply' && item.value === 100) return;

      const npcGroup = npcFavorUnlocks[item.npc];
      if (!npcGroup || typeof npcGroup !== 'object') return;

      if (!npcPatch[item.npc]) npcPatch[item.npc] = {};
      Object.keys(npcGroup).forEach(entryKey => {
        const entryData = npcGroup[entryKey];
        if (!entryData || typeof entryData.favor !== 'number') return;

        let key = 'favor';
        let value = 1;
        switch (item.mode) {
          case 'fixed':
            value = item.value;
            value = Math.max(1, Math.floor(value));
            break;
          case 'add':
            key = 'favor.add'
            value = item.value;
            value = Math.floor(value);
            break;
          case 'multiply':
            key = 'favor.multiply'
            value = item.value;
            break;
        }
        if (!npcPatch[item.npc][entryKey]) npcPatch[item.npc][entryKey] = {};
        npcPatch[item.npc][entryKey][key] = value;
      });
    });

    if (Object.keys(npcPatch).length > 0) {
      patchMap["data/npc_favor_unlocks.gon.patch"] = npcPatch;
    }
  },
};


export default NpcFavorSection;