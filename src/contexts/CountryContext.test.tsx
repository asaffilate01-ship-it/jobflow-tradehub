import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CountrySwitcher from "@/components/CountrySwitcher";
import Logo from "@/components/Logo";
import { CountryProvider, legalByCountry, resolveCountry, useCountry } from "@/contexts/CountryContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";

function Probe() {
  const { country } = useCountry();
  const { lang, setLang } = useLanguage();
  return (
    <>
      <span data-testid="market">{country}</span>
      <span data-testid="language">{lang}</span>
      <button type="button" onClick={() => setLang("de")}>Deutsch</button>
      <CountrySwitcher />
      <Logo variant="compact" tone="dark" />
    </>
  );
}

describe("independent market and language", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("craftvaro-lang", "en");
  });

  it("resolves the market from official domain, then explicit URL, then stored choice", () => {
    expect(resolveCountry("craftvaro.de", "?country=GB", "GB")).toBe("DE");
    expect(resolveCountry("www.craftvaro.co.uk", "?country=DE", "DE")).toBe("GB");
    expect(resolveCountry("craftvaro.com", "?country=DE", "GB")).toBe("DE");
    expect(resolveCountry("craftvaro.com", "", "DE")).toBe("DE");
    expect(resolveCountry("craftvaro.com", "?country=XX", "invalid")).toBe("GB");
  });

  it("keeps legal operator linked to market regardless of translation language", () => {
    expect(legalByCountry.GB.de.entity).toContain("iTechLounge Ltd");
    expect(legalByCountry.DE.en.entity).toContain("iTechLounge GmbH");
  });

  it("keeps regional logo tied to selected market when interface language changes", () => {
    render(<LanguageProvider><CountryProvider><Probe /></CountryProvider></LanguageProvider>);
    expect(screen.getByTestId("market")).toHaveTextContent("GB");
    fireEvent.change(screen.getByRole("combobox", { name: "Marketplace country" }), { target: { value: "DE" } });
    expect(screen.getByTestId("market")).toHaveTextContent("DE");
    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByRole("img", { name: "Craftvaro" }).getAttribute("src")).toContain("craftvaro-logo-de");
    fireEvent.click(screen.getByRole("button", { name: "Deutsch" }));
    expect(screen.getByTestId("language")).toHaveTextContent("de");
    expect(screen.getByTestId("market")).toHaveTextContent("DE");
    expect(localStorage.getItem("craftvaro-country")).toBe("DE");
  });
});
