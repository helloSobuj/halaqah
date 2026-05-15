import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "@/locales/en.json";
import bn from "@/locales/bn.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        bn: { translation: bn },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "bn"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "halaqah.lang",
        caches: ["localStorage"],
      },
    });
}

export default i18n;
