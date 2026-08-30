/* eslint-disable @typescript-eslint/no-explicit-any -- public views are introduced by the release migration */
import { Link } from "react-router-dom";
import {
  ArrowRight, Users, Shield, Star,
  Search, CheckCircle, MapPin, ThumbsUp, Award,
  Phone, FileText, Truck, Package, Building2, Zap,
  PhoneCall, ChevronRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from "@/components/MotionWrapper";
import { supabase } from "@/integrations/supabase/client";

import heroBanner from "@/assets/hero-banner.jpg";

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
import removalsIcon from "@/assets/icons/removals-3d.png";
import rubbishCollectionIcon from "@/assets/icons/rubbish-collection-3d.png";
import cleanerIcon from "@/assets/icons/cleaner-3d.png";

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
  { label: "Removals", slug: "removals", img: removalsIcon },
  { label: "Rubbish Collection", slug: "rubbish_collection", img: rubbishCollectionIcon },
  { label: "Cleaner", slug: "cleaner", img: cleanerIcon },
];

type Stat = { value: number; suffix?: string; prefix?: string; label: string; icon: typeof Shield; decimals?: number; hideZero?: boolean };
type HomeReview = { id: string; rating: number; comment: string | null; created_at: string };

const emptyStats: Stat[] = [
  { value: 0, label: "Verified Members", icon: Shield },
  { value: 0, label: "Completed Jobs", icon: CheckCircle },
  { value: 0, label: "Directory Profiles", icon: Users },
  { value: 0, suffix: "★", label: "Verified-job Rating", icon: Star, decimals: 1, hideZero: true },
];

const howItWorks = [
  { step: "1", title: "Search & Post", desc: "Tell us what you need and where. We'll match you with verified tradespeople in your area.", icon: Search },
  { step: "2", title: "Compare Quotes", desc: "Receive itemised quotes from rated tradespeople. Compare prices, reviews, and credentials.", icon: FileText },
  { step: "3", title: "Hire & Track", desc: "Choose your trade, track progress with GPS-stamped photos, milestones, and agreed payment records.", icon: CheckCircle },
];

const whyBetter = [
  { icon: Shield, title: "Verified & Insured", desc: "Paid marketplace members are identity, insurance and capability checked before they receive leads." },
  { icon: Star, title: "Genuine Reviews", desc: "All reviews are from real, completed jobs — no fake ratings or paid placements." },
  { icon: Phone, title: "In-App Messaging", desc: "Chat directly with your trader. No chasing phone calls or lost emails." },
  { icon: Award, title: "Compliance Built In", desc: "Gas Safe, EICR, Part P certificates generated and stored automatically." },
  { icon: Truck, title: "Material Delivery", desc: "Traders order materials at trade prices with same-day delivery to site." },
  { icon: ThumbsUp, title: "Milestone Clarity", desc: "Agreed milestones, evidence and payment records stay attached to the job for both parties." },
];

const trustLogos = [
  "Gas Safe Register", "NICEIC", "NAPIT", "FMB", "Trustmark",
  "Trading Standards", "CIPHE", "Handwerksrolle",
];

/* Animated counter hook */
function useCountUp(end: number, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const start = 0;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Number((eased * end).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration, decimals]);

  return { count, ref };
}

function AnimatedStat({ value, suffix, prefix, label, icon: Icon, decimals = 0, hideZero = false }: Stat) {
  const { count, ref } = useCountUp(value, 2000, decimals);
  return (
    <div ref={ref} className="flex items-center gap-3.5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-foreground tabular-nums">
          {hideZero && value === 0 ? "—" : <>{prefix}{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}</>}
        </div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}

const LandingPage = () => {
  const { user } = useAuth();
  const [searchTrade, setSearchTrade] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [platformStats, setPlatformStats] = useState<Stat[]>(emptyStats);
  const [homeReviews, setHomeReviews] = useState<HomeReview[]>([]);

  useEffect(() => {
    const loadMarketplaceProof = async () => {
      const db = supabase as any;
      const [statsResult, reviewsResult] = await Promise.all([
        db.from("marketplace_stats_public").select("verified_members,directory_profiles,completed_jobs,average_rating").maybeSingle(),
        db.from("reviews_public").select("id,rating,comment,created_at").not("comment", "is", null).order("created_at", { ascending: false }).limit(3),
      ]);
      if (statsResult.data) {
        setPlatformStats([
          { value: Number(statsResult.data.verified_members ?? 0), label: "Verified Members", icon: Shield },
          { value: Number(statsResult.data.completed_jobs ?? 0), label: "Completed Jobs", icon: CheckCircle },
          { value: Number(statsResult.data.directory_profiles ?? 0), label: "Directory Profiles", icon: Users },
          { value: Number(statsResult.data.average_rating ?? 0), suffix: "★", label: "Verified-job Rating", icon: Star, decimals: 1, hideZero: true },
        ]);
      }
      setHomeReviews((reviewsResult.data ?? []) as HomeReview[]);
    };
    void loadMarketplaceProof();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTrade) params.set("q", searchTrade);
    if (searchLocation) params.set("location", searchLocation);
    window.location.href = `/marketplace${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-0 overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* Hero with background image */}
      <section className="relative min-h-[620px] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroBanner}
            alt="Professional tradesperson at construction site"
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
          />
        </div>
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/30" />

        <FadeIn className="relative max-w-6xl mx-auto px-4 py-24 sm:py-32 w-full z-10">
          <div className="max-w-2xl space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-assisted matching for verified trade members
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-white">
              Find. Hire.{" "}
              <span className="text-accent">Done.</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/80 max-w-xl leading-relaxed">
              Craftvaro connects you with subscribed, verified tradespeople in your area.
              Compare quotes, check credentials, and see why every AI match was selected.
            </p>


            {/* Search bar */}
            <div className="max-w-xl">
              <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-card/95 border border-border/50 backdrop-blur-lg shadow-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="What do you need? e.g. Plumber…"
                    className="pl-12 h-14 text-base border-0 bg-transparent focus-visible:ring-0"
                    value={searchTrade}
                    onChange={(e) => setSearchTrade(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div className="relative flex-1 sm:border-l border-border">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Postcode or city"
                    className="pl-12 h-14 text-base border-0 bg-transparent focus-visible:ring-0"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  size="lg"
                  className="h-14 px-8 rounded-xl font-semibold text-base shrink-0 shadow-lg bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Search
                </Button>
              </div>
              <p className="text-xs text-white/50 mt-3">
                Popular: <Link to="/marketplace?category=plumber" className="text-accent hover:underline">Plumber</Link>
                {" · "}<Link to="/marketplace?category=electrician" className="text-accent hover:underline">Electrician</Link>
                {" · "}<Link to="/marketplace?category=builder" className="text-accent hover:underline">Builder</Link>
                {" · "}<Link to="/marketplace?category=roofer" className="text-accent hover:underline">Roofer</Link>
                {" · "}<Link to="/marketplace?category=gas_engineer" className="text-accent hover:underline">Gas Engineer</Link>
              </p>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              {!user && (
                <Button asChild variant="outline" size="lg" className="gap-2 font-semibold border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                  <Link to="/signup">
                    List your trade
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="lg" className="gap-2 font-medium text-white/80 hover:text-white hover:bg-white/10">
                <PhoneCall className="h-4 w-4" />
                Request a callback
              </Button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Trust logos bar */}
      <section className="py-5 border-b border-border bg-card/80 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap shrink-0">Credentials we can verify</span>
            <div className="overflow-hidden relative flex-1">
              <div className="flex gap-8 items-center trust-bar-scroll" style={{ width: "max-content" }}>
                {[...trustLogos, ...trustLogos].map((name, i) => (
                  <span key={i} className="text-sm font-semibold text-muted-foreground/50 whitespace-nowrap tracking-wide uppercase">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-b border-border bg-card/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto px-4">
          {platformStats.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-12">
            <Badge variant="outline" className="text-xs font-medium gap-1.5 py-1 px-3">
              <Search className="h-3 w-3" />
              Browse trades
            </Badge>
            <h2 className="text-3xl font-bold">Find the right specialist</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Choose from 14 trade categories. Paid members are verified and clearly separated from unclaimed directory profiles.</p>
          </div>
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tradeCategories.map(({ label, slug, img }) => (
              <StaggerItem key={slug}>
                <ScaleOnHover>
                  <Link
                    to={`/marketplace?category=${slug}`}
                    className="glass-card p-5 text-center hover:border-primary/40 hover:shadow-lg transition-all group block"
                  >
                    <img
                      src={img}
                      alt={label}
                      loading="lazy"
                      width={64}
                      height={64}
                      className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
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
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-14">
            <Badge variant="outline" className="text-xs font-medium gap-1.5 py-1 px-3">
              <Sparkles className="h-3 w-3" />
              Simple process
            </Badge>
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Get your project started in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map(({ step, title, desc, icon: Icon }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative"
              >
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-10 -right-3 w-6">
                    <ChevronRight className="h-5 w-5 text-border" />
                  </div>
                )}
                <div className="glass-card p-8 text-center space-y-4 h-full hover:shadow-lg transition-shadow">
                  <div className="relative inline-block">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
                      {step}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-12">
            <Badge variant="outline" className="text-xs font-medium gap-1.5 py-1 px-3">
              <Star className="h-3 w-3" />
              Real reviews
            </Badge>
            <h2 className="text-3xl font-bold">What customers say</h2>
            <p className="text-muted-foreground">From verified, completed jobs — no fake ratings</p>
          </div>
          {homeReviews.length > 0 ? <div className="grid md:grid-cols-3 gap-5">
            {homeReviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 space-y-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed">"{review.comment}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Verified customer</div>
                    <div className="text-xs text-muted-foreground">Completed Craftvaro job · {new Date(review.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div> : (
            <div className="glass-card mx-auto max-w-xl p-8 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 font-medium">No verified-job reviews published yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Reviews appear here only after a customer completes a job with the awarded trader.</p>
            </div>
          )}
        </div>
      </section>

      {/* Why better */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-12">
            <Badge variant="outline" className="text-xs font-medium gap-1.5 py-1 px-3">
              <Award className="h-3 w-3" />
              Why us
            </Badge>
            <h2 className="text-3xl font-bold">Why Craftvaro?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">More than a directory — a complete project management platform</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyBetter.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6 space-y-3 hover:border-primary/20 hover:shadow-lg transition-all group"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For Traders CTA */}
      <section className="py-20 px-4 bg-card/30">
        <div className="glass-card-elevated p-8 sm:p-12 max-w-6xl mx-auto glow">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <Badge variant="outline" className="text-xs font-medium gap-1.5 py-1 px-3 border-primary/30 bg-primary/5 text-primary">
                <Zap className="h-3 w-3" />
                For tradespeople
              </Badge>
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
                <Button asChild size="lg" className="font-semibold gap-2 shadow-lg">
                  <Link to="/signup">
                    Create trader account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: "Win Jobs", value: "Qualified leads" },
                { icon: Package, label: "Materials", value: "Trade prices" },
                { icon: Truck, label: "Delivery", value: "Same day" },
                { icon: Building2, label: "CRM & CIS", value: "Full suite" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="glass-card p-5 text-center space-y-2 hover:shadow-lg transition-shadow">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm font-bold text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto space-y-6"
        >
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to get started?</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Whether you need work done or you're a tradesperson looking for jobs — Craftvaro has you covered.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="font-semibold gap-2 h-13 px-8 shadow-lg text-base">
              <Link to={user ? "/post-job" : "/signup"}>
                {user ? "Post a job" : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-semibold gap-2 h-13 px-8 text-base">
              <Link to="/marketplace">
                Browse tradespeople
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;
