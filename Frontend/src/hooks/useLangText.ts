import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useLangText() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;

  return useCallback(
    (vi: string, en: string) => (language === "en" ? en : vi),
    [language],
  );
}
