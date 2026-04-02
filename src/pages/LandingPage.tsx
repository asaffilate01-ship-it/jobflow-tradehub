import { Link } from "react-router-dom";
import {
  ArrowRight, Users, Shield, Star,
  Search, CheckCircle, Clock, MapPin, ThumbsUp, Award,
  Phone, FileText, Truck, Package, Building2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { motion } from "framer-motion";
import { FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from "@/components/MotionWrapper";

import plumberIcon from "@/assets/icons/plumber-3d.png";
import electricianIcon from "@/assets/icons/electrician-3d.png";
import builderIcon from "@/assets/icons/builder-3d.png";
import rooferIcon from "@/assets/icons/roofer-3d.png";
import tilerIcon from "@/assets/icons/tiler-3d.png";
import carpenterIcon from "@/assets/icons/carpenter-3d.png";
import bricklayerIcon from "@/assets/icons/bricklayer-3d.png";
import plastererIcon from "@/assets/icons/plasterer-3d.png";
import painterIcon from "@/assets/icons/painter-3d.png";
import gasEngineerIcon from "@/assets/icons/gas-engineer-3d.png";
import landscaperIcon from "@/assets/icons/landscaper-3d.png";

const tradeCategories = [
  { label: "Plumber", slug: "plumber", img: plumberIcon },
  { label: "Electrician", slug: "electrician", img: electricianIcon },
  { label: "Builder", slug: "builder", img: builderIcon },
  { label: "Roofer", slug: "roofer", img: rooferIcon },
  { label: "Tiler", slug: "tiler", img: tilerIcon },
  { label: "Carpenter", slug: "carpenter", img: carpenterIcon },
  { label: "Bricklayer", slug: "bricklayer", img: bricklayerIcon },
  { label: "Plasterer", slug: "plasterer", img: plastererIcon },
  { label: "Painter", slug: "painter", img: painterIcon },
  { label: "Gas Engineer", slug: "gas_engineer", img: gasEngineerIcon },
  { label: "Landscaper", slug: "landscaper", img: landscaperIcon },
];

const stats = [
  { value: "500+", label: "Verified Trades", icon: Shield },
  { value: "2,400+", label: "Jobs Completed", icon: CheckCircle },
  { value: "< 2hr", label: "Avg. Response", icon: Clock },
  { value: "4.8★", label: "Avg. Rating", icon: Star },
];

const reviews = [
  {
    name: "Sarah M.",
    location: "Manchester",
    trade: "Plumber",
    rating: 5,
    text: "Found a fantastic plumber within hours. Work was completed same day — brilliant service and fair pricing.",
    date: "March 2026",
  },
  {
    name: "David T.",
    location: "Birmingham",
    trade: "Electrician",
    rating: 5,
    text: "The quote process was seamless. Three quotes in one day, all from verified electricians. Couldn't be easier.",
    date: "March 2026",
  },
  {
    name: "Emma R.",
    location: "Bristol",
    trade: "Builder",
    rating: 5,
    text: "Tracked the whole project through the app — milestones, payments, photos. Felt completely in control.",
    date: "February 2026",
  },
];

const howItWorks = [
  { step: "1", title: "Search & Post", desc: "Tell us what you need and where. We'll match you with verified tradespeople in your area.", icon: Search },
  { step: "2", title: "Compare Quotes", desc: "Receive itemised quotes from rated tradespeople. Compare prices, reviews, and credentials.", icon: FileText },
  { step: "3", title: "Hire & Track", desc: "Choose your trade, track progress with GPS-stamped photos, milestones, and secure payments.", icon: CheckCircle },
];

const whyBetter = [
  { icon: Shield, title: "Verified & Insured", desc: "Every trader is ID-checked, insured, and their qualifications verified before they appear." },
  { icon: Star, title: "Genuine Reviews", desc: "All reviews are from real, completed jobs — no fake ratings or paid placements." },
  { icon: Phone, title: "In-App Messaging", desc: "Chat directly with your trader. No chasing phone calls or lost emails." },
  { icon: Award, title: "Compliance Built In", desc: "Gas Safe, EICR, Part P certificates generated and stored automatically." },
  { icon: Truck, title: "Material Delivery", desc: "Traders order materials at trade prices with same-day delivery to site." },
  { icon: ThumbsUp, title: "Payment Protection", desc: "Milestone-based payments — you only pay when work is completed to your satisfaction." },
];

const LandingPage = () => {
  const { user } = useAuth();
  const [searchTrade, setSearchTrade] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTrade) params.set("q", searchTrade);
    if (searchLocation) params.set("location", searchLocation);
    window.location.href = `/marketplace${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-0 overflow-hidden">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }}>
          <div className="absolute top-20 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[160px]" />
          <div className="absolute bottom-10 right-1/3 h-72 w-72 rounded-full bg-accent/8 blur-[140px]" />
        </div>

        <FadeIn className="max-w-5xl mx-auto text-center space-y-8 px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Trusted by thousands across the UK
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
            Find a tradesperson{" "}
            <span className="text-gradient">you can trust</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Get quotes from verified, reviewed tradespeople in your area.
            Compare prices, check credentials, and hire with confidence.
          </p>

          {/* Dual search — trade + location */}
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-card/80 border border-border backdrop-blur-sm">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="What do you need? e.g. Plumber, Kitchen refit…"
                  className="pl-12 h-14 text-base border-0 bg-transparent focus-visible:ring-0"
                  value={searchTrade}
                  onChange={(e) => setSearchTrade(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="relative flex-1 sm:border-l border-border">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Location or postcode"
                  className="pl-12 h-14 text-base border-0 bg-transparent focus-visible:ring-0"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                size="lg"
                className="h-14 px-8 rounded-xl font-semibold text-base shrink-0"
              >
                Search
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Popular: <Link to="/marketplace?category=plumber" className="text-primary hover:underline">Plumber</Link>
              {" · "}<Link to="/marketplace?category=electrician" className="text-primary hover:underline">Electrician</Link>
              {" · "}<Link to="/marketplace?category=builder" className="text-primary hover:underline">Builder</Link>
              {" · "}<Link to="/marketplace?category=roofer" className="text-primary hover:underline">Roofer</Link>
              {" · "}<Link to="/marketplace?category=gas_engineer" className="text-primary hover:underline">Gas Engineer</Link>
            </p>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {!user && (
              <Button asChild variant="outline" size="lg" className="gap-2 font-semibold">
                <Link to="/signup">
                  List your trade
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </FadeIn>
      </section>

      {/* Stats bar */}
      <section className="py-10 border-y border-border bg-card/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto px-4">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Browse by trade</h2>
          <p className="text-muted-foreground text-center mb-10">Find the right specialist for your project</p>
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tradeCategories.map(({ label, slug, icon: Icon }) => (
              <StaggerItem key={slug}>
                <ScaleOnHover>
                  <Link
                    to={`/marketplace?category=${slug}`}
                    className="glass-card p-5 text-center hover:border-primary/40 hover:bg-primary/5 transition-all group block"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {label}
                    </div>
                  </Link>
                </ScaleOnHover>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">How it works</h2>
          <p className="text-muted-foreground text-center mb-12">Get your project started in three simple steps</p>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="relative">
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-10 -right-3 w-6 h-px bg-border" />
                )}
                <div className="glass-card p-8 text-center space-y-4 h-full">
                  <div className="relative inline-block">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {step}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews / Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">What customers say</h2>
          <p className="text-muted-foreground text-center mb-10">Real reviews from real, completed jobs</p>
          <div className="grid md:grid-cols-3 gap-5">
            {reviews.map((review, i) => (
              <div key={i} className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed italic">"{review.text}"</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <div>
                    <span className="font-medium text-foreground">{review.name}</span>
                    <span className="mx-1">·</span>
                    <span>{review.location}</span>
                  </div>
                  <span>{review.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why better */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Why TradeFlow?</h2>
          <p className="text-muted-foreground text-center mb-10">More than just a directory — a complete project platform</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyBetter.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card p-6 space-y-3 hover:border-primary/20 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Traders CTA */}
      <section className="py-16 px-4">
        <div className="glass-card p-8 sm:p-12 max-w-5xl mx-auto glow">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Zap className="h-3 w-3" />
                For tradespeople
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">Grow your trade business</h2>
              <p className="text-muted-foreground leading-relaxed">
                Get listed on the marketplace, win jobs, manage projects with a full CRM,
                order materials at trade prices, and handle CIS/payroll — all in one platform.
              </p>
              <div className="space-y-2.5">
                {[
                  "Marketplace listing & verified profile",
                  "Full job management & CRM tools",
                  "Material ordering with trade accounts",
                  "CIS deductions, payroll & invoicing",
                  "GPS-stamped photo evidence (BASIC CAM)",
                  "Compliance certificates (Gas Safe, EICR)",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-3">
                <Button asChild size="lg" className="font-semibold gap-2">
                  <Link to="/signup">
                    Join now — it's free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: "Win Jobs", value: "Unlimited leads" },
                { icon: Package, label: "Materials", value: "Trade prices" },
                { icon: Truck, label: "Delivery", value: "Same day" },
                { icon: Building2, label: "CRM & CIS", value: "Full suite" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="glass-card p-5 text-center space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mx-auto">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 text-center px-4">
        <div className="max-w-lg mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Whether you need work done or you're a tradesperson looking for jobs — TradeFlow has you covered.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="font-semibold gap-2 h-12 px-8">
              <Link to={user ? "/post-job" : "/signup"}>
                {user ? "Post a job" : "Get started free"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-semibold gap-2 h-12 px-8">
              <Link to="/marketplace">
                Browse tradespeople
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
