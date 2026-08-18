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

import logo from "@/assets/craftvaro-logo.png";
import heroImg from "@/assets/promo-hero.jpg";
import shotWeb from "@/assets/shot-web.jpg";
import shotMobile from "@/assets/shot-mobile.jpg";
import shotApp from "@/assets/promo-shot-mobile.png";

const modules = [
  { icon: Briefcase, title: "Job marketplace", desc: "Customers post work, verified trades quote, both sides track it to completion — with ratings and reviews baked in.", tag: "Live" },
  { icon: Package, title: "Materials at trade price", desc: "Search merchant catalogues, compare live prices across suppliers, and order to site in a few taps.", tag: "Live" },
  { icon: Truck, title: "Delivery & logistics", desc: "Priced by distance, manpower and load. Drivers accept jobs, update status and get paid per run.", tag: "Live" },
  { icon: Camera, title: "Site evidence", desc: "Timestamped photo capture, galleries per project and shareable proof-of-work for clients and insurers.", tag: "Live" },
  { icon: ShieldCheck, title: "Compliance & KYC", desc: "Certificates, insurance and ID verification gated before a trade can win work on the platform.", tag: "Live" },
  { icon: Calendar, title: "Scheduling & daily logs", desc: "Calendar, list and year views for crews, plus daily site logs that build an audit trail per job.", tag: "Live" },
  { icon: Receipt, title: "Accounting & payouts", desc: "Order receipts, invoices, commission splits and driver payout records in one ledger.", tag: "Beta" },
  { icon: MessageSquare, title: "Messaging & alerts", desc: "In-app threads on every job with push notifications for quotes, approvals and deliveries.", tag: "Live" },
  { icon: BarChart3 , title: "Admin & analytics", desc: "User management, KYC review, audit log, broadcasts and platform-wide analytics.", tag: "Live" },
  { icon: Users, title: "Agents & referrals", desc: "Referral links, commission tracking and agent dashboards to grow supply on the ground.", tag: "Live" },
  { icon: Layers, title: "Tiered subscriptions", desc: "Free, Basic and Premium plans with server-verified access to every premium module.", tag: "Live" },
  { icon: Smartphone, title: "PWA & native ready", desc: "Installable app, offline shell, push notifications and Capacitor builds for iOS and Android.", tag: "Live" },
];

const audiences = [
  { icon: Users, title: "For customers", points: ["Post a job free", "Compare verified quotes", "Track progress & photos", "Pay with confidence"] },
  { icon: Briefcase, title: "For trades", points: ["Win local work", "Materials at trade price", "Quotes, scheduling, logs", "Compliance in one place"] },
  { icon: Truck, title: "For drivers", points: ["Accept delivery runs", "Distance-based pricing", "Proof of delivery", "Weekly payouts"] },
];

const faqs = [
  { q: "What exactly is Craftvaro?", a: "Craftvaro is an end-to-end platform for the UK construction trade: a marketplace that connects customers with verified tradespeople, a materials ordering engine with live merchant pricing, and a delivery network that gets those materials to site." },
  { q: "Who is it for?", a: "Four roles share one system — customers hiring work, tradespeople running jobs, drivers moving materials, and admins overseeing verification, payouts and analytics." },
  { q: "Is there a mobile app?", a: "Yes. Craftvaro installs as a PWA on any phone and ships as a native iOS and Android build, with a native-style bottom navigation, camera capture for site evidence and push notifications." },
  { q: "How does materials pricing work?", a: "We pull catalogues and live prices from merchant accounts, compare them per line item, and show trade-price totals before you order. Delivery is quoted from base rate, distance, manpower and load." },
  { q: "How are tradespeople verified?", a: "Every trade completes KYC — ID, insurance and trade certificates — reviewed by our admin team before they can quote. Compliance certificates stay on file and are visible to customers." },
  { q: "What does it cost?", a: "Customers post jobs free. Trades choose Free, Basic or Premium — Basic unlocks quoting and messaging, Premium unlocks materials, deliveries, site evidence, scheduling, compliance and accounting." },
  { q: "Can I see the live platform?", a: "The full platform is behind a password during our launch phase. Request access and we'll send you credentials for a guided walkthrough." },
];

const stats = [
  { value: "4", label: "Role-based portals" },
  { value: "30+", label: "Screens shipped" },
  { value: "12", label: "Product modules" },
  { value: "24/7", label: "Job & delivery flow" },
];

const navItems = [
  { label: "Platform", href: "#platform", icon: Layers },
  { label: "Roles", href: "#roles", icon: Users },
  { label: "Apps", href: "#apps", icon: Smartphone },
  { label: "FAQs", href: "#faqs", icon: HelpCircle },
];

const PromoHomePage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  usePageMeta(
    "Craftvaro — Find. Hire. Done. | Trade marketplace, materials & delivery",
    "Craftvaro is the all-in-one platform for UK trades: a verified job marketplace, materials at trade price, delivery logistics, site evidence, compliance and accounting — on web and mobile.",
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Top nav ===== */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl safe-top">
        <div className="container flex h-16 items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2">
            <img src={logo} alt="Craftvaro" className="h-8 w-auto" width={160} height={32} />
          </a>

          <nav className="hidden md:flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-1">
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

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/unlock">
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Platform access
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href="#access">Request a demo</a>
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
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Launching in the UK
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.05] text-primary-foreground sm:text-5xl md:text-6xl">
              Find. Hire. <span className="text-accent">Done.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              Craftvaro is the operating system for the trade — a verified marketplace, materials at
              trade price, delivery logistics, site evidence and accounting in one app for
              customers, trades and drivers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <a href="#access">
                  Request a demo <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
                <a href="#platform">See what's inside</a>
              </Button>
            </div>
            <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s) => (
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
          <Badge variant="secondary" className="mb-4">The platform</Badge>
          <h2 className="text-3xl font-bold md:text-4xl">Everything we've built, in one system</h2>
          <p className="mt-4 text-muted-foreground">
            Twelve modules that cover a job from the first enquiry to the final invoice — no
            spreadsheets, no WhatsApp threads, no lost paperwork.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, idx) => (
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
                <m.icon className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">{m.title}</h3>
                <Badge
                  variant="outline"
                  className={m.tag === "Beta" ? "border-warning/40 text-warning" : "border-success/40 text-success"}
                >
                  {m.tag}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "var(--gradient-brand)", filter: "blur(36px)" }} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== Roles ===== */}
      <section id="roles" className="scroll-mt-20 border-y border-border bg-secondary/40 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Who it's for</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">One platform, four portals</h2>
            <p className="mt-4 text-muted-foreground">
              Every role gets a purpose-built experience — with permissions, verification and
              billing handled behind the scenes.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title} className="glass-card-premium p-7">
                <div className="icon-container icon-container-lg mb-5 bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent">
                  <a.icon className="h-6 w-6" />
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
            ))}
          </div>
        </div>
      </section>

      {/* ===== Screenshots ===== */}
      <section id="apps" className="container scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">Web + mobile</Badge>
          <h2 className="text-3xl font-bold md:text-4xl">Built for the office and the site</h2>
          <p className="mt-4 text-muted-foreground">
            The same data, everywhere — a full desktop workspace and a native-feel mobile app with
            bottom navigation, camera capture and offline support.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="glass-card-premium overflow-hidden p-2">
              <img
                src={shotWeb}
                alt="Craftvaro web platform screenshot"
                loading="lazy"
                width={1600}
                height={1000}
                className="w-full rounded-xl"
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Craftvaro on desktop — marketplace, jobs and dashboards</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="glass-card-elevated overflow-hidden p-1.5">
              <img
                src={shotMobile}
                alt="Craftvaro mobile web screenshot"
                loading="lazy"
                width={832}
                height={1800}
                className="w-full rounded-lg"
              />
            </div>
            <div className="flex items-center">
              <img
                src={shotApp}
                alt="Craftvaro native app screens"
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
            <Badge variant="secondary" className="mb-4">FAQs</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">Questions, answered</h2>
          </div>
          <Accordion type="single" collapsible className="mt-10 space-y-3">
            {faqs.map((f, i) => (
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
              The live platform is invite-only
            </h2>
            <p className="mt-4 text-primary-foreground/85">
              We're onboarding trades, merchants and drivers in waves. Already have an access
              password? Unlock the full platform below.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link to="/unlock">
                  <Lock className="mr-2 h-4 w-4" /> Enter access password
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25">
                <a href="mailto:hello@craftvaro.co.uk?subject=Craftvaro%20demo%20request">
                  Request a demo <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border py-10 pb-28 md:pb-10">
        <div className="container flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          <img src={logo} alt="Craftvaro" className="h-8 w-auto" width={160} height={32} />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Craftvaro. Craftvaro is a trading name of iTechLounge Ltd. All rights reserved. · hello@craftvaro.co.uk
          </p>
        </div>
      </footer>

      {/* ===== Mobile bottom nav (native feel) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom md:hidden">
        <div className="grid grid-cols-5">
          <a href="#top" className="tap-target flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-accent">
            <Home className="h-5 w-5" /> Home
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
