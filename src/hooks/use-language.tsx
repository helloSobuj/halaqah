import * as React from "react";
import { useTranslation } from "react-i18next";

type Lang = "en" | "bn";

export function useLanguage() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as Lang) ?? "en";

  const setLang = React.useCallback(
    (l: Lang) => {
      i18n.changeLanguage(l);
      if (typeof document !== "undefined") {
        document.documentElement.lang = l;
      }
    },
    [i18n],
  );

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const toggleLang = React.useCallback(() => {
    setLang(lang === "en" ? "bn" : "en");
  }, [lang, setLang]);

  return { lang, setLang, toggleLang };
}
