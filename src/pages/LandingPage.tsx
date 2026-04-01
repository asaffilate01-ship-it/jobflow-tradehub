import { Link } from "react-router-dom";
import { 
  Briefcase, Package, Truck, ArrowRight, Users, Shield, Star, 
  Search, CheckCircle, Zap, Building2, Clock, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const tradeCategories = [
  { label: "Plumber", icon: "🔧" },
  { label: "Electrician", icon: "⚡" },
  { label: "Builder", icon: "🏗️" },
  { label: "Roofer", icon: "🏠" },
  { label: "Tiler", icon: "🔲" },
  { label: "Carpenter", icon: "🪚" },
  { label: "Plasterer", icon: "🧱" },
  { label: "Painter", icon: "🎨" },
  { label: "Gas Engineer", icon: "🔥" },
  { label: "Landscaper", icon: "🌿" },
];

const stats = [
  { value: "500+", label: "Verified Trades", icon: Shield },
  { value: "2,400+", label: "Jobs Completed", icon: CheckCircle },
  { value: "< 2hr", label: "Avg. Response", icon: Clock },
  { value: "4.8★", label: "Avg. Rating", icon: Star },
];

const howItWorks = [
  { step: "1", title: "Post Your Job", desc: "Describe what you need, set a budget, and let verified trades come to you.", icon: Briefcase },
  { step: "2", title: "Compare Quotes", desc: "Receive quotes from rated, verified tradespeople in your area.", icon: Users },
  { step: "3", title: "Hire & Track", desc: "Choose your trade, track progress with photos, milestones, and payments.", icon: CheckCircle },
];

const LandingPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-1/4 h-80 w-80 rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute bottom-10 right-1/4 h-60 w-60 rounded-full bg-accent/10 blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            The UK's construction marketplace
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Find trusted tradespeople{" "}
            <span className="text-gradient">ready to work.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Post a job and get quotes from verified, rated tradespeople in your area. 
            Or browse our marketplace to find the right trade for your project.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="What do you need? e.g. Plumber, Kitchen refit..."
                  className="pl-12 h-14 text-base rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button asChild size="lg" className="h-14 px-8 rounded-xl font-semibold text-base">
                <Link to={`/marketplace${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}>
                  Search
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" variant="secondary" className="gap-2 font-semibold">
              <Link to="/marketplace">
                <Users className="h-4 w-4" />
                Browse trades
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg" className="gap-2 font-semibold">
                <Link to="/signup">
                  Join as a tradesperson
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <h2 className="text-xl font-bold text-center mb-8">Browse by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
          {tradeCategories.map((cat) => (
            <Link
              key={cat.label}
              to={`/marketplace?category=${cat.label.toLowerCase().replace(" ", "_")}`}
              className="glass-card p-4 text-center hover:border-primary/30 transition-all group"
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {cat.label}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="glass-card p-6 text-center space-y-2">
              <Icon className="h-6 w-6 mx-auto text-primary" />
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <h2 className="text-2xl font-bold text-center mb-2">How it works</h2>
        <p className="text-muted-foreground text-center mb-12">Get your project started in three simple steps</p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {howItWorks.map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="glass-card p-6 space-y-4 text-center relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="absolute -top-3 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {step}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For Traders CTA */}
      <section className="py-16">
        <div className="glass-card p-8 sm:p-12 max-w-4xl mx-auto glow">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Zap className="h-3 w-3" />
                For tradespeople
              </div>
              <h2 className="text-2xl font-bold">Grow your trade business</h2>
              <p className="text-muted-foreground">
                Get your business listed on the marketplace, win new jobs, manage projects with our full CRM, 
                order materials at trade prices, and handle CIS/payroll — all in one platform.
              </p>
              <div className="space-y-2">
                {["Marketplace listing & verified profile", "Full job management & CRM", "Material ordering with trade accounts", "CIS deductions & payroll"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button asChild className="font-semibold gap-2">
                  <Link to="/signup">
                    Join now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="font-semibold">
                  <Link to="/marketplace">See examples</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Briefcase, label: "Win Jobs", value: "Unlimited leads" },
                { icon: Package, label: "Materials", value: "Trade prices" },
                { icon: Truck, label: "Delivery", value: "Same day" },
                { icon: Building2, label: "CRM & CIS", value: "Full suite" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="glass-card p-4 text-center space-y-1">
                  <Icon className="h-5 w-5 mx-auto text-primary" />
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Whether you need work done or you're a tradesperson looking for jobs — TradeFlow has you covered.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="font-semibold gap-2">
            <Link to={user ? "/jobs" : "/signup"}>
              {user ? "Post a job" : "Get started free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
