import { useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import { getTranslation } from "../translations";

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = useCallback((key) => {
    return getTranslation(key, language);
  }, [language]);

  return { t, language };
};
