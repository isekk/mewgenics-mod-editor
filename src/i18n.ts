import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// 可选：自动语言检测
// import LanguageDetector from "i18next-browser-languagedetector";

import zh from "./locales/zh.json";
import en from "./locales/en.json";
// import fr from "./locales/fr.json";

import GameLocalesRaw from "./assets/GameLocales.json";

interface LocaleItem {
  key: string;
  en: string;
  zh: string;
}

const GameLocales = GameLocalesRaw as LocaleItem[];

const transformLocales = (lang: "en" | "zh") => {
  const result: Record<string, string> = {};
  GameLocales.forEach((item) => {
    result[item.key] = item[lang];
  });
  return result;
};

i18n
  // .use(LanguageDetector) // 可选
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: { ...zh, ...transformLocales("zh") } },
      en: { translation: { ...en, ...transformLocales("en") } },
      // fr: { translation: fr },
    },
    lng: localStorage.getItem("lang") || "zh",
    fallbackLng: "en", // 兜底语言 当前语言没有某个 key，那么 i18next 再找一次。
    interpolation: {
      escapeValue: false, // React 默认安全，不需要 escape
    },
  });

export default i18n;
