import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export type AppLanguage = "vi" | "en";

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (vi: string, en: string) => string;
}

const LANGUAGE_KEY = "appLanguage";
const LanguageContext = createContext<LanguageContextType | null>(null);

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "en" ? "en" : "vi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("vi");

  useEffect(() => {
    async function restoreLanguage() {
      const storedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);
      setLanguageState(normalizeLanguage(storedLanguage));
    }

    void restoreLanguage();
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await SecureStore.setItemAsync(LANGUAGE_KEY, nextLanguage);
  }, []);

  const t = useCallback(
    (vi: string, en: string) => (language === "en" ? en : vi),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
