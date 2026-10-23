import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Truck, Package, ShieldCheck, Camera, Calendar, MessageSquare, Receipt, BarChart3, Users, Smartphone, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import usePageMeta from "@/hooks/use-page-meta";
import { useLanguage } from "@/contexts/LanguageContext";
import { promoCopy } from "@/i18n/promo";
import shotWebEn from "@/assets/shot-web.jpg";
import shotWebDe from "@/assets/shot-web-de.jpg";
import shotMobileEn from "@/assets/shot-mobile.jpg";
import shotMobileDe from "@/assets/shot-mobile-de.jpg";
import shotApp from "@/assets/promo-shot-mobile.png";

const moduleIcons = [Briefcase, Package, Truck, Camera, ShieldCheck, Calendar, Receipt, MessageSquare, BarChart3, Users, Layers, Smartphone];
const roleIcons = [Users, Briefcase, Truck];

/** Shared platform information within the public marketplace homepage. */
const PromoHomePage = () => {
  const { lang } = useLanguage();
  const t = promoCopy[lang];
  const shotWeb = lang === "de" ? shotWebDe : shotWebEn;
  const shotMobile = lang === "de" ? shotMobileDe : shotMobileEn;
  usePageMeta(t.meta.title, t.meta.description);
  return <>
      {/* ===== Platform modules ===== */}
      {lang === "en" && <section className="container py-10"><div className="rounded-2xl border bg-secondary/30 p-6 md:p-9 space-y-4"><h2 className="text-2xl font-bold">Repairs today. Bigger projects tomorrow.</h2><p className="text-muted-foreground">Plan renovations, energy retrofit, empty-home refurbishment, accessible bathrooms and commercial fit-outs. Keep your brief, quotations, milestones and subcontracted work together.</p><Button asChild><Link to="/property-projects">Explore property projects <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></section>}
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

  </>;
};

export default PromoHomePage;
