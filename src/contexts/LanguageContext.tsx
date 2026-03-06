"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Locale } from "@/lib/translations";
import { LOCALE_STORAGE_KEY, getTranslations, getQuizQuestions, t as tFn } from "@/lib/translations";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (path: string) => string;
  dir: "ltr" | "rtl";
  getQuizQuestions: () => ReturnType<typeof getQuizQuestions>;
  getTranslations: () => ReturnType<typeof getTranslations>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored === "ar" || stored === "en") setLocaleState(stored);
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = next;
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  const t = useCallback(
    (path: string) => tFn(locale, path),
    [locale]
  );

  const value: LanguageContextValue = {
    locale,
    setLocale,
    t,
    dir: locale === "ar" ? "rtl" : "ltr",
    getQuizQuestions: () => getQuizQuestions(locale),
    getTranslations: () => getTranslations(locale),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
