import { useId } from "react";
import { useCountry, type Country } from "@/contexts/CountryContext";
import { useLanguage } from "@/contexts/LanguageContext";

const CountrySwitcher = ({ className = "" }: { className?: string }) => {
  const id = useId();
  const { country, setCountry } = useCountry();
  const { lang } = useLanguage();
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {lang === "de" ? "Land des Marktplatzes" : "Marketplace country"}
      </label>
      <select
        id={id}
        value={country}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "GB" || next === "DE") setCountry(next as Country);
        }}
        className="h-11 max-w-full rounded-full border border-border bg-secondary/60 px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="GB">UK</option>
        <option value="DE">Deutschland</option>
      </select>
    </div>
  );
};

export default CountrySwitcher;
