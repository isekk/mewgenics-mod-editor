import { useCallback, useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useToast } from "../../context/ToastContext";
import { SECTIONS } from "./registry";
import { exportModZip, importModZip } from "./utils";
import { useModEditorStore } from "./modEditorStore";
import { useTranslation } from "react-i18next";
import { AlertCircle, HelpCircle, X } from "lucide-react";

export default function ModEditorPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

  // 加载游戏数据
  const loadGameData = useModEditorStore((s) => s.loadGameData);
  const isLoading = useModEditorStore((s) => s.isLoadingData);
  const gameData = useModEditorStore((s) => s.gameData);
  useEffect(() => { loadGameData(); }, [loadGameData]);


  const meta = useModEditorStore((s) => s.meta);
  const setMeta = useModEditorStore((s) => s.setMeta);

  const resetSections = useModEditorStore((s) => s.resetSections);

  const pickPreview = useCallback(async () => {
    const p = await open({
      title: "select preview.png",
      multiple: false,
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (typeof p === "string") setMeta({ previewPath: p });
  }, [setMeta]);

  const clearAll = useCallback(() => {
    resetSections();
    showToast(t('qing-kong-cheng-gong'), "success");

  }, [resetSections]);

  const exportZipAction = useCallback(async () => {
    try {
      const { meta, sectionStates } = useModEditorStore.getState();

      const patchMap: Record<string, any> = {};
      for (const sec of SECTIONS) sec.build(patchMap);

      if (Object.keys(patchMap).length === 0) {
        showToast(t('qing-zhi-shao-xuan-ze-yi-ge-xuan-xiang'), "error");
        return;
      }

      await exportModZip(meta, patchMap, sectionStates);
      showToast(t('dao-chu-cheng-gong'), "success");
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? String(e), "error");
    }
  }, [showToast, t]);

  const ActiveHelpContent = SECTIONS.find(s => s.id === activeHelpId)?.HelpComponent;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-700">
        {/* 旋转的外圈 */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-[var(--fluent-accent-soft)] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[var(--fluent-accent)] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-[var(--fluent-text)] animate-pulse">
            {t('zheng-zai-jia-zai-you-xi-yuan-shi-shu-ju')}
          </h3>
          <p className="text-sm text-[var(--fluent-text-muted)]">{t('zhe-ke-neng-xu-yao-ji-miao-zhong-qing-shao-hou')}</p>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="fluent-surface-strong p-10 max-w-md w-full text-center space-y-6 shadow-2xl border-red-500/20">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--fluent-text)]">
              {t('wu-fa-huo-qu-you-xi-shu-ju')}
            </h2>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="fluent-surface-strong fluent-card-hover p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-[var(--fluent-text)]">Mod Builder</div>
            <div className="text-sm text-[var(--fluent-text-muted)]">{t('pei-zhi-mo-zu-xin-xi-bing-dao-chu-bu-ding-bao')}</div>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              onClick={async () => {
                try {
                  const result = await importModZip();
                  if (!result) return;

                  // 还原 Meta 信息
                  setMeta(result.meta);

                  // 还原各 Section 的状态
                  if (result.config) {
                    useModEditorStore.setState((s) => {
                      // 深度合并或覆盖当前状态
                      s.sectionStates = result.config;
                    });
                    showToast(t('mo-zu-pe-zhi-yi-hai-yuan'), "success");
                  }
                } catch (e: any) {
                  showToast(e.message, "error");
                }
              }}
              className="fluent-button-secondary"
            >
              {t('dao-ru')} Zip
            </button>

            <button onClick={exportZipAction} className="fluent-button">
              {t('dao-chu')} Zip
            </button>

            <button onClick={clearAll} className="fluent-button-danger">
              {t('qing-kong-xuan-ze')}
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="fluent-label mb-2">Mod {t('ming-cheng')}</div>
            <input
              className="w-full fluent-input"
              value={meta.title}
              onChange={(e) => setMeta({ title: e.target.value })}
            />
          </div>

          <div>
            <div className="fluent-label mb-2">{t('ban-ben')}</div>
            <input
              className="w-full fluent-input"
              value={meta.version}
              onChange={(e) => setMeta({ version: e.target.value })}
            />
          </div>

          <div>
            <div className="fluent-label mb-2">{t('zuo-zhe')}</div>
            <input
              className="w-full fluent-input"
              value={meta.author}
              onChange={(e) => setMeta({ author: e.target.value })}
            />
          </div>

          <div>
            <div className="fluent-label mb-2">{t('yu-lan-tu')}</div>
            <div className="flex gap-2">
              <input
                className="flex-1 fluent-input text-[var(--fluent-text-muted)]"
                value={meta.previewPath ?? ""}
                readOnly
                placeholder={t('wei-xuan-ze')}
              />
              <button
                onClick={pickPreview}
                className="fluent-button-secondary"
              >
                {t('xuan-ze')}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="fluent-label mb-2">{t('miao-shu')}</div>
            <textarea
              className="w-full min-h-24 fluent-input"
              value={meta.desc}
              onChange={(e) => setMeta({ desc: e.target.value })}
            />
          </div>
        </div>

      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.id}  className="relative fluent-surface fluent-card-hover p-5 space-y-3 focus-within:z-30 transition-all">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <div className="text-base font-semibold text-[var(--fluent-text)]">
              {t(sec.title)}
            </div>
            {sec.HelpComponent && (
              <button
                onClick={() => setActiveHelpId(sec.id)}
                className="p-1.5 text-slate-400 hover:text-[var(--fluent-accent)] hover:bg-[var(--fluent-accent-soft)] rounded-lg transition-colors"
                title={t('bang-zhu')}
              >
                <HelpCircle size={20} />
              </button>
            )}
          </div>
          <sec.Component />
        </div>
      ))}

      {activeHelpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveHelpId(null)}
          />

          <div className="relative w-full max-w-lg fluent-surface-strong p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <HelpCircle className="text-[var(--fluent-accent)]" />
                {t(SECTIONS.find(s => s.id === activeHelpId)?.title || '')} - {t('bang-zhu')}
              </h3>
              <button
                onClick={() => setActiveHelpId(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {ActiveHelpContent ? <ActiveHelpContent /> : <p>{t('mei-you-ke-yong-de-bang-zhu-nei-rong')}</p>}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveHelpId(null)}
                className="fluent-button"
              >
                {t('wo-zhi-dao-le')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
