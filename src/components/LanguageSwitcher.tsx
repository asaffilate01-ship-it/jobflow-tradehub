import { Globe } from "lucide-react";
import { useLanguage, type Lang } from "@/contexts/LanguageContext";

const options: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
];

const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-border bg-secondary/60 p-0.5 ${className}`}
      role="group"
      aria-label="Language"
    >
      <Globe className="ml-1.5 mr-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.code}
          onClick={() => setLang(o.code)}
          aria-pressed={lang === o.code}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
            lang === o.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
