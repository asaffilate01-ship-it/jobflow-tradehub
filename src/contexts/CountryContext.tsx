import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "./LanguageContext";

export type Country = "GB" | "DE";
const STORAGE_KEY = "craftvaro-country";

type CountryValue = {
  country: Country;
  setCountry: (country: Country) => void;
};

const CountryContext = createContext<CountryValue>({
  country: "GB",
  setCountry: () => {},
});

/**
 * A market is not a language: an English-speaking customer can use Germany,
 * and a German-speaking customer can use the UK. Market selection is UI-only;
 * the server still owns company, job, payment and regulatory jurisdiction.
 */
export function resolveCountry(hostname: string, search: string, stored: string | null): Country {
  const host = hostname.toLowerCase();
  if (host === "craftvaro.de" || host.endsWith(".craftvaro.de")) return "DE";
  if (host === "craftvaro.co.uk" || host.endsWith(".craftvaro.co.uk")) return "GB";
  const requested = new URLSearchParams(search).get("country")?.toUpperCase();
  if (requested === "GB" || requested === "DE") return requested;
  return stored === "DE" || stored === "GB" ? stored : "GB";
}

function initialCountry(): Country {
  let stored: string | null = null;
  try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  return resolveCountry(window.location.hostname, window.location.search, stored);
}

export const CountryProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCurrent] = useState<Country>(initialCountry);
  const setCountry = (next: Country) => {
    setCurrent(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
  };
  return (
    <CountryContext.Provider value={{ country, setCountry }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => useContext(CountryContext);

/** Display copy only: never use these values to authorise billing or contracts. */
export const legalByCountry: Record<Country, Record<Lang, { entity: string; email: string }>> = {
  GB: {
    en: { entity: "Craftvaro is a trading name of iTechLounge Ltd", email: "hello@craftvaro.com" },
    de: { entity: "Craftvaro ist ein Handelsname der iTechLounge Ltd", email: "hello@craftvaro.com" },
  },
  DE: {
    en: { entity: "Craftvaro is a trading name of iTechLounge GmbH", email: "hallo@craftvaro.com" },
    de: { entity: "Craftvaro ist ein Handelsname der iTechLounge GmbH", email: "hallo@craftvaro.com" },
  },
};
