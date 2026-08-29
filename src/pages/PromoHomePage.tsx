import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Briefcase, Truck, Package, ShieldCheck, Camera, Calendar,
  MessageSquare, Receipt, BarChart3, Users, Smartphone, Sparkles, Lock,
  CheckCircle2, ChevronDown, Home, Layers, HelpCircle, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import usePageMeta from "@/hooks/use-page-meta";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage, legalByLang } from "@/contexts/LanguageContext";
import { promoCopy } from "@/i18n/promo";

import Logo from "@/components/Logo";
import heroImg from "@/assets/promo-hero.jpg";
import shotWebEn from "@/assets/shot-web.jpg";
import shotWebDe from "@/assets/shot-web-de.jpg";
import shotMobileEn from "@/assets/shot-mobile.jpg";
import shotMobileDe from "@/assets/shot-mobile-de.jpg";
import shotApp from "@/assets/promo-shot-mobile.png";

const moduleIcons = [
  Briefcase, Package, Truck, Camera, ShieldCheck, Calendar,
  Receipt, MessageSquare, BarChart3, Users, Layers, Smartphone,
];
const roleIcons = [Users, Briefcase, Truck];

const PromoHomePage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang } = useLanguage();
  const t = promoCopy[lang];
  const legal = legalByLang[lang];

  const shotWeb = lang === "de" ? shotWebDe : shotWebEn;
  const shotMobile = lang === "de" ? shotMobileDe : shotMobileEn;

  const navItems = [
    { label: t.nav.platform, href: "#platform", icon: Layers },
    { label: t.nav.roles, href: "#roles", icon: Users },
    { label: t.nav.apps, href: "#apps", icon: Smartphone },
    { label: t.nav.faqs, href: "#faqs", icon: HelpCircle },
  ];

  usePageMeta(t.meta.title, t.meta.description);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Top nav ===== */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl safe-top">
        <div className="container flex h-16 items-center gap-3">
          <a href="#top" className="flex items-center" aria-label="Craftvaro">
            <Logo variant="mark" height={32} priority className="sm:hidden" />
            <Logo height={32} priority className="hidden sm:block" />
          </a>

          <nav className="mx-auto hidden md:flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-1">
            {navItems.map((i) => (
              <a
                key={i.label}
                href={i.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                {i.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/unlock" aria-label={t.cta.access}>
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.cta.access}</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/marketplace">
                <span className="sm:hidden">{lang === "de" ? "Suchen" : "Find"}</span>
                <span className="hidden sm:inline">{lang === "de" ? "Handwerker finden" : "Find a trader"}</span>
              </Link>
            </Button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle sections"
              className="md:hidden tap-target flex items-center justify-center rounded-lg border border-border"
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="container grid grid-cols-2 gap-2 py-3">
              {navItems.map((i) => (
                <a
                  key={i.label}
                  href={i.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium"
                >
                  <i.icon className="h-4 w-4 text-accent" /> {i.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section id="top" className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Tradesperson using Craftvaro on site"
          width={1600}
          height={1008}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/40" />
        <div className="container relative py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <Badge className="mb-5 border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {t.hero.badge}
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.05] text-primary-foreground sm:text-5xl md:text-6xl">
              {t.hero.h1a} <span className="text-accent">{t.hero.h1b}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              {t.hero.lede}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/marketplace">
                  {lang === "de" ? "Handwerker finden" : "Find a trader"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
                <a href="#platform">{t.cta.inside}</a>
              </Button>
            </div>
            <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {t.hero.stats.map((s) => (
                <div key={s.label}>
                  <dt className="font-mono text-2xl font-bold text-accent">{s.value}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-primary-foreground/60">{s.label}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* ===== Platform modules ===== */}
      <section id="platform" className="container scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">{t.modules.badge}</Badge>
          <h2 className="text-3xl font-bold md:text-4xl">{t.modules.heading}</h2>
          <p className="mt-4 text-muted-foreground">{t.modules.lede}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.modules.items.map((m, idx) => {
            const Icon = moduleIcons[idx] ?? Layers;
            const isBeta = m.tag === "beta";
            return (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, delay: (idx % 3) * 0.06 }}
                className="group glass-card-elevated relative overflow-hidden p-6 hover:-translate-y-1"
              >
                <div
                  className="icon-container icon-container-lg mb-4 text-accent-foreground"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{m.title}</h3>
                  <Badge
                    variant="outline"
                    className={isBeta ? "border-warning/40 text-warning" : "border-success/40 text-success"}
                  >
                    {isBeta ? t.modules.tagBeta : t.modules.tagLive}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "var(--gradient-brand)", filter: "blur(36px)" }} />
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===== Roles ===== */}
      <section id="roles" className="scroll-mt-20 border-y border-border bg-secondary/40 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">{t.roles.badge}</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">{t.roles.heading}</h2>
            <p className="mt-4 text-muted-foreground">{t.roles.lede}</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {t.roles.items.map((a, i) => {
              const Icon = roleIcons[i] ?? Users;
              return (
                <div key={a.title} className="glass-card-premium p-7">
                  <div className="icon-container icon-container-lg mb-5 bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{a.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {a.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Screenshots ===== */}
      <section id="apps" className="container scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">{t.apps.badge}</Badge>
          <h2 className="text-3xl font-bold md:text-4xl">{t.apps.heading}</h2>
          <p className="mt-4 text-muted-foreground">{t.apps.lede}</p>
        </div>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="glass-card-premium overflow-hidden p-2">
              <img
                key={shotWeb}
                src={shotWeb}
                alt={t.apps.altWeb}
                loading="lazy"
                className="w-full rounded-xl"
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">{t.apps.captionDesktop}</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="glass-card-elevated overflow-hidden p-1.5">
              <img
                key={shotMobile}
                src={shotMobile}
                alt={t.apps.altMobile}
                loading="lazy"
                className="w-full rounded-lg"
              />
            </div>
            <div className="flex items-center">
              <img
                src={shotApp}
                alt={t.apps.altApp}
                loading="lazy"
                width={1200}
                height={1200}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQs ===== */}
      <section id="faqs" className="scroll-mt-20 border-t border-border bg-secondary/30 py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">{t.faqs.badge}</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">{t.faqs.heading}</h2>
          </div>
          <Accordion type="single" collapsible className="mt-10 space-y-3">
            {t.faqs.items.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="glass-card border-b-0 px-5">
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== Access CTA ===== */}
      <section id="access" className="container scroll-mt-20 py-16 md:py-24">
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-center md:p-14"
          style={{ background: "var(--gradient-premium)" }}
        >
          <div className="relative mx-auto max-w-2xl">
            <Star className="mx-auto mb-4 h-8 w-8 text-primary-foreground" />
            <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
              {t.access.heading}
            </h2>
            <p className="mt-4 text-primary-foreground/85">{t.access.lede}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link to="/unlock">
                  <Lock className="mr-2 h-4 w-4" /> {t.cta.enterPassword}
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25">
                <a href={`mailto:${legal.email}?subject=Craftvaro%20demo`}>
                  {t.cta.demo} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border py-10 pb-28 md:pb-10">
        <div className="container flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          <Logo height={34} priority />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Craftvaro. {legal.entity}. {t.footer.rights} · {legal.email}
          </p>
        </div>
      </footer>

      {/* ===== Mobile bottom nav (native feel) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom md:hidden">
        <div className="grid grid-cols-5">
          <a href="#top" className="tap-target flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-accent">
            <Home className="h-5 w-5" /> {t.nav.home}
          </a>
          {navItems.map((i) => (
            <a
              key={i.label}
              href={i.href}
              className="tap-target flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
            >
              <i.icon className="h-5 w-5" /> {i.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default PromoHomePage;
