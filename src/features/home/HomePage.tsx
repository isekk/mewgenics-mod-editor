import { useTranslation } from "react-i18next";
import { Info, History, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
    const { t } = useTranslation();

    return (
        <div className="p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 标题区域 */}
            <div className="text-center space-y-3">
                <h1 className="text-6xl font-bold text-[var(--fluent-text)] tracking-tight">
                    MewModEditor
                </h1>
                <p className="text-lg text-[var(--fluent-text-muted)] font-medium">
                    {t('home.subtitle')}
                </p>
            </div>

            <div className="grid gap-6">
                {/* 项目初衷与免责说明 */}
                <div className="fluent-surface-strong p-6 space-y-4 border-l-4 border-blue-500 shadow-sm">
                    <div className="flex items-center gap-2 text-blue-600 font-bold">
                        <Info size={20} />
                        <span className="text-base uppercase tracking-wider">{t('home.project-notice-title')}</span>
                    </div>
                    <div className="text-sm leading-relaxed space-y-3 text-[var(--fluent-text)]">
                        <p>{t('home.project-notice-p1')}</p>
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50 text-amber-800 italic">
                            {t('home.project-notice-p2')}
                        </div>
                    </div>
                </div>

                {/* 导入/导出特性说明 */}
                <div className="fluent-surface-strong p-6 space-y-4 border-l-4 border-purple-500 shadow-sm">
                    <div className="flex items-center gap-2 text-purple-600 font-bold">
                        <History size={20} />
                        <span className="text-base uppercase tracking-wider">{t('home.import-notice-title')}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--fluent-text-muted)]">
                        {t('home.import-notice-p1')}
                    </p>
                </div>

                {/* 快速开始入口 */}
                <Link to="/mod-editor" className="block group">
                    <div className="fluent-surface-strong fluent-card-hover p-8 flex items-center justify-between group-hover:border-[var(--fluent-accent)] transition-all">
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="text-amber-500" size={20} />
                                {t('kai-shi-bian-ji')}
                            </h2>
                            <p className="text-sm text-[var(--fluent-text-muted)]">
                                {t('xuan-ze-zuo-ce-dao-hang-jin-ru-mo-zu-bian-ji-qi')}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[var(--fluent-accent-soft)] flex items-center justify-center text-[var(--fluent-accent)] group-hover:bg-[var(--fluent-accent)] group-hover:text-white transition-all">
                            <ArrowRight size={24} />
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
