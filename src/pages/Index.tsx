import { Link } from "react-router-dom";
import { Briefcase, Package, Truck, ArrowRight, Users, FileSpreadsheet, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { icon: Users, value: "50+", label: "Trade categories" },
  { icon: FileSpreadsheet, value: "CSV", label: "Rate card pricing" },
  { icon: Shield, value: "CIS", label: "Subcontractor ready" },
  { icon: Truck, value: "Live", label: "Driver dispatch" },
];

const features = [
  {
    icon: Briefcase,
    title: "Jobs Marketplace",
    description: "Post jobs, receive quotes from verified trades, and manage your projects end-to-end.",
    link: "/jobs",
    cta: "Browse jobs",
  },
  {
    icon: Package,
    title: "Material Ordering",
    description: "Order materials from TradePoint, Wickes, Selco and more — with trade account support.",
    link: "/materials",
    cta: "Order materials",
  },
  {
    icon: Truck,
    title: "Delivery Network",
    description: "Get materials to site fast with our driver network. Real-time pricing, tracking and proof of delivery.",
    link: "/deliveries",
    cta: "View deliveries",
  },
];

const Index = () => {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative pt-8 pb-4">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-40 right-1/4 h-48 w-48 rounded-full bg-accent/20 blur-[80px]" />
        </div>

        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            Marketplace + Materials + Delivery
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Get jobs, run work, and get materials to site{" "}
            <span className="text-gradient">fast.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl">
            TradeFlow brings together quoting, material ordering, urgent driver delivery,
            CIS deductions, and job evidence — all in one platform built for the trades.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 font-semibold">
              <Link to="/jobs">
                Browse jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="gap-2 font-semibold">
              <Link to="/materials">
                Order materials
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="glass-card p-5 text-center space-y-2">
            <Icon className="h-5 w-5 mx-auto text-primary" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        {features.map(({ icon: Icon, title, description, link, cta }) => (
          <div key={title} className="glass-card p-6 space-y-4 group hover:border-primary/30 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            <Link
              to={link}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Index;
