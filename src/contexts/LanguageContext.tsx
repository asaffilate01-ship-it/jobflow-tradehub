import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "en" | "de";

const STORAGE_KEY = "craftvaro-lang";

interface LanguageValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageValue>({ lang: "en", setLang: () => {} });

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
    return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

/** Legal entity + contact details differ per language, domain is shared. */
export const legalByLang: Record<Lang, { entity: string; email: string }> = {
  en: { entity: "Craftvaro is a trading name of iTechLounge Ltd", email: "hello@craftvaro.com" },
  de: { entity: "Craftvaro ist ein Handelsname der iTechLounge GmbH", email: "hallo@craftvaro.com" },
};

export const SITE_DOMAIN = "https://craftvaro.com";
