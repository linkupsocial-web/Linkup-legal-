"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type Language, type Messages, sourceMessages } from "@/i18n/translations";

type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  t: Messages;
  isTranslating: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "linkup-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [messages, setMessages] = useState<Messages>(sourceMessages);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "hi") {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    const nextLang = language === "hi" ? "hi" : "en";
    if (document.documentElement.lang === nextLang) return;

    const raf = window.requestAnimationFrame(() => {
      document.documentElement.lang = nextLang;
    });

    return () => window.cancelAnimationFrame(raf);
  }, [language]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (language === "en") {
        setMessages(sourceMessages);
        setIsTranslating(false);
        return;
      }

      setIsTranslating(true);
      const { buildTranslatedMessages } = await import("@/i18n/auto-translate");
      const nextMessages = await buildTranslatedMessages(language, sourceMessages);
      if (!isMounted) return;
      setMessages(nextMessages);
      setIsTranslating(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: messages,
      isTranslating,
    }),
    [language, isTranslating, messages]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
