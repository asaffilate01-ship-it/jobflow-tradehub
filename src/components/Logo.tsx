import { useLanguage } from "@/contexts/LanguageContext";
import logoEn from "@/assets/craftvaro-logo-trim.png";
import logoDe from "@/assets/craftvaro-logo-de-trim.png";
import logoEnLight from "@/assets/craftvaro-logo-light.png";
import logoDeLight from "@/assets/craftvaro-logo-de-light.png";
import compactEn from "@/assets/craftvaro-logo-compact.png";
import compactDe from "@/assets/craftvaro-logo-de-compact.png";
import compactEnLight from "@/assets/craftvaro-logo-compact-light.png";
import compactDeLight from "@/assets/craftvaro-logo-de-compact-light.png";
import markEn from "@/assets/craftvaro-mark.png";
import markDe from "@/assets/craftvaro-mark-de.png";

type Tone = "auto" | "light" | "dark";
/** full = icon + wordmark + tagline · compact = icon + wordmark · mark = icon only */
type Variant = "full" | "compact" | "mark";

/** Intrinsic aspect ratios of the shipped assets (keep in sync with src/assets). */
const ASSETS: Record<
  "en" | "de",
  Record<Variant, { dark: string; light: string; ratio: number }>
> = {
  en: {
    full: { dark: logoEn, light: logoEnLight, ratio: 1607 / 433 },
    compact: { dark: compactEn, light: compactEnLight, ratio: 1926 / 433 },
    mark: { dark: markEn, light: markEn, ratio: 462 / 433 },
  },
  de: {
    full: { dark: logoDe, light: logoDeLight, ratio: 1196 / 325 },
    compact: { dark: compactDe, light: compactDeLight, ratio: 1453 / 325 },
    mark: { dark: markDe, light: markDe, ratio: 348 / 325 },
  },
};

interface LogoProps {
  /** Rendered height in px — width is derived from the asset aspect ratio. */
  height?: number;
  variant?: Variant;
  /** `light` = for dark surfaces (white wordmark), `dark` = navy wordmark, `auto` = follows dark mode. */
  tone?: Tone;
  className?: string;
  priority?: boolean;
}

export const Logo = ({
  height = 32,
  variant = "compact",
  tone = "auto",
  className = "",
  priority = false,
}: LogoProps) => {
  const { lang } = useLanguage();
  const asset = ASSETS[lang === "de" ? "de" : "en"][variant];
  const width = Math.round(height * asset.ratio);
  const loading = priority ? "eager" : "lazy";

  if (tone !== "auto" || variant === "mark") {
    return (
      <img
        src={tone === "light" ? asset.light : asset.dark}
        alt="Craftvaro"
        width={width}
        height={height}
        style={{ height, width }}
        loading={loading}
        decoding="async"
        className={`block shrink-0 select-none object-contain ${className}`}
      />
    );
  }

  // tone="auto": render both and toggle with dark-mode utilities so there is
  // no theme flash and no JS state needed.
  return (
    <span
      className={`relative block shrink-0 select-none ${className}`}
      style={{ height, width }}
    >
      <img
        src={asset.dark}
        alt="Craftvaro"
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain dark:hidden"
      />
      <img
        src={asset.light}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className="absolute inset-0 hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
};

export default Logo;
