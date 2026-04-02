import { Link } from "react-router-dom";
import {
  ArrowRight, Users, Shield, Star,
  Search, CheckCircle, Clock, MapPin, ThumbsUp, Award,
  Phone, FileText, Truck, Package, Building2, Zap, Calendar,
  PhoneCall, ChevronRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from "@/components/MotionWrapper";

import heroBanner from "@/assets/hero-banner.jpg";
import blogKitchen from "@/assets/blog-kitchen-refit.jpg";
import blogTech from "@/assets/blog-trade-tech.jpg";
import blogDelivery from "@/assets/blog-delivery.jpg";

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
  { value: 500, suffix: "+", label: "Verified Trades", icon: Shield },
  { value: 2400, suffix: "+", label: "Jobs Completed", icon: CheckCircle },
  { value: 2, prefix: "< ", suffix: "hr", label: "Avg. Response", icon: Clock },
  { value: 4.8, suffix: "★", label: "Avg. Rating", icon: Star, decimals: 1 },
];

const reviews = [
  {
    name: "Sarah M.",
    location: "Manchester",
    trade: "Plumber",
    rating: 5,
    text: "Found a fantastic plumber within hours. Work was completed same day — brilliant service and fair pricing.",
    date: "March 2026",
    avatar: "S",
  },
  {
    name: "David T.",
    location: "Birmingham",
    trade: "Electrician",
    rating: 5,
    text: "The quote process was seamless. Three quotes in one day, all from verified electricians. Couldn't be easier.",
    date: "March 2026",
    avatar: "D",
  },
  {
    name: "Emma R.",
    location: "Bristol",
    trade: "Builder",
    rating: 5,
    text: "Tracked the whole project through the app — milestones, payments, photos. Felt completely in control.",
    date: "February 2026",
    avatar: "E",
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

const trustLogos = [
  "Gas Safe Register", "NICEIC", "NAPIT", "FMB", "Trustmark",
  "Checkatrade", "Trading Standards", "CIPHE",
];

const blogPosts = [
  {
    title: "How to Plan a Kitchen Refit: The Complete 2026 Guide",
    excerpt: "From layout choices to budgeting for materials, here's everything you need to know before starting your kitchen renovation.",
    image: blogKitchen,
    date: "28 Mar 2026",
    category: "Homeowner Guides",
    readTime: "7 min read",
  },
  {
    title: "Why Digital Job Management Is Changing the Trades",
    excerpt: "GPS-stamped evidence, milestone payments, and real-time updates — how technology is building trust between trades and customers.",
    image: blogTech,
    date: "21 Mar 2026",
    category: "Trade Insights",
    readTime: "5 min read",
  },
  {
    title: "Same-Day Material Delivery: How It Works",
    excerpt: "Order from 30+ UK merchants at trade prices and get materials delivered to site within hours. Here's the full breakdown.",
    image: blogDelivery,
    date: "14 Mar 2026",
    category: "Platform Updates",
    readTime: "4 min read",
  },
];

/* Animated counter hook */
function useCountUp(end: number, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
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

function AnimatedStat({ value, suffix, prefix, label, icon: Icon, decimals = 0 }: typeof stats[0]) {
  const { count, ref } = useCountUp(value, 2000, decimals);
  return (
    <div ref={ref} className="flex items-center gap-3.5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-foreground tabular-nums">
          {prefix}{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}
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

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTrade) params.set("q", searchTrade);
    if (searchLocation) params.set("location", searchLocation);
    window.location.href = `/marketplace${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-0 overflow-hidden">
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
              Trusted by thousands across the UK
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-white">
              Get the right trade,{" "}
              <span className="text-primary">first time</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/80 max-w-xl leading-relaxed">
              Get quotes from verified, reviewed tradespeople in your area.
              Compare prices, check credentials, and hire with confidence.
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
                  className="h-14 px-8 rounded-xl font-semibold text-base shrink-0 shadow-lg"
                >
                  Search
                </Button>
              </div>
              <p className="text-xs text-primary-foreground/60 mt-3">
                Popular: <Link to="/marketplace?category=plumber" className="text-primary hover:underline">Plumber</Link>
                {" · "}<Link to="/marketplace?category=electrician" className="text-primary hover:underline">Electrician</Link>
                {" · "}<Link to="/marketplace?category=builder" className="text-primary hover:underline">Builder</Link>
                {" · "}<Link to="/marketplace?category=roofer" className="text-primary hover:underline">Roofer</Link>
                {" · "}<Link to="/marketplace?category=gas_engineer" className="text-primary hover:underline">Gas Engineer</Link>
              </p>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              {!user && (
                <Button asChild variant="outline" size="lg" className="gap-2 font-semibold border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm">
                  <Link to="/signup">
                    List your trade
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="lg" className="gap-2 font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
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
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap shrink-0">Trusted by members of</span>
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
          {stats.map((stat) => (
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
            <p className="text-muted-foreground max-w-md mx-auto">Choose from 11 trade categories — every tradesperson is verified and reviewed</p>
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
          <div className="grid md:grid-cols-3 gap-5">
            {reviews.map((review, i) => (
              <motion.div
                key={i}
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
                <p className="text-sm text-foreground leading-relaxed">"{review.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {review.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{review.name}</div>
                    <div className="text-xs text-muted-foreground">{review.location} · {review.trade} · {review.date}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
            <h2 className="text-3xl font-bold">Why TradeFlow?</h2>
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

      {/* Blog / Articles */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-3">
              <Badge variant="outline" className="text-xs font-medium gap-1.5 py-1 px-3">
                <FileText className="h-3 w-3" />
                Resources
              </Badge>
              <h2 className="text-3xl font-bold">From the blog</h2>
              <p className="text-muted-foreground">Guides, tips, and platform updates</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-primary hidden sm:flex">
              View all articles
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {blogPosts.map((post, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card overflow-hidden group cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    width={800}
                    height={512}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-medium py-0">{post.category}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </div>
                </div>
              </motion.article>
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
            Whether you need work done or you're a tradesperson looking for jobs — TradeFlow has you covered.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="font-semibold gap-2 h-13 px-8 shadow-lg text-base">
              <Link to={user ? "/post-job" : "/signup"}>
                {user ? "Post a job" : "Get started free"}
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
