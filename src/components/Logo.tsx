import { useLanguage } from "@/contexts/LanguageContext";
import logoEn from "@/assets/craftvaro-logo-trim.png";
import logoDe from "@/assets/craftvaro-logo-de-trim.png";
import logoEnLight from "@/assets/craftvaro-logo-light.png";
import logoDeLight from "@/assets/craftvaro-logo-de-light.png";
import markEn from "@/assets/craftvaro-mark.png";
import markDe from "@/assets/craftvaro-mark-de.png";

type Tone = "auto" | "light" | "dark";
type Variant = "full" | "mark";

/** Intrinsic aspect ratios of the shipped assets (kept in sync with src/assets). */
const RATIO = { full: 1607 / 433, mark: 462 / 433 } as const;

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
  height = 36,
  variant = "full",
  tone = "auto",
  className = "",
  priority = false,
}: LogoProps) => {
  const { lang } = useLanguage();
  const de = lang === "de";
  const width = Math.round(height * RATIO[variant]);

  if (variant === "mark") {
    return (
      <img
        src={de ? markDe : markEn}
        alt="Craftvaro"
        width={width}
        height={height}
        style={{ height, width }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`shrink-0 select-none object-contain ${className}`}
      />
    );
  }

  const darkSrc = de ? logoDe : logoEn;
  const lightSrc = de ? logoDeLight : logoEnLight;

  // For tone="auto" we render both and toggle with dark-mode utilities so no
  // JS theme state is needed and there is no flash on hydration.
  if (tone === "auto") {
    return (
      <span
        className={`relative inline-block shrink-0 select-none ${className}`}
        style={{ height, width }}
      >
        <img
          src={darkSrc}
          alt="Craftvaro"
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain dark:hidden"
        />
        <img
          src={lightSrc}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 hidden h-full w-full object-contain dark:block"
        />
      </span>
    );
  }

  return (
    <img
      src={tone === "light" ? lightSrc : darkSrc}
      alt="Craftvaro"
      width={width}
      height={height}
      style={{ height, width }}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
};

export default Logo;
