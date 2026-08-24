import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Star, MapPin, Search, Shield, Award, Clock, ArrowRight,
  Wrench, Zap, HardHat, Home, Grid3X3, Hammer, BrickWall,
  Paintbrush, Flame, TreePine, SlidersHorizontal, Users, CheckCircle,
  MessageCircle, Truck, Trash2, SprayCan,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem, ScaleOnHover } from "@/components/MotionWrapper";
import { usePageMeta } from "@/hooks/use-page-meta";
import AITradeSearch from "@/components/AITradeSearch";
import type { Database } from "@/integrations/supabase/types";

const tradeCategories = [
  { slug: "all", label: "All trades", icon: SlidersHorizontal },
  { slug: "builder", label: "Builder", icon: HardHat },
  { slug: "plumber", label: "Plumber", icon: Wrench },
  { slug: "electrician", label: "Electrician", icon: Zap },
  { slug: "gas_engineer", label: "Gas Engineer", icon: Flame },
  { slug: "tiler", label: "Tiler", icon: Grid3X3 },
  { slug: "carpenter", label: "Carpenter", icon: Hammer },
  { slug: "bricklayer", label: "Bricklayer", icon: BrickWall },
  { slug: "roofer", label: "Roofer", icon: Home },
  { slug: "plasterer", label: "Plasterer", icon: HardHat },
  { slug: "painter", label: "Painter", icon: Paintbrush },
  { slug: "landscaper", label: "Landscaper", icon: TreePine },
  { slug: "removals", label: "Removals", icon: Truck },
  { slug: "rubbish_collection", label: "Rubbish Collection", icon: Trash2 },
  { slug: "cleaner", label: "Cleaner", icon: SprayCan },
];

type TraderCard = {
  id: string;
  full_name: string;
  company_name: string | null;
  trade_specialism: string | null;
  rating: number | null;
  services_description: string | null;
  service_radius_miles: number | null;
  years_experience: number | null;
  trade_bodies: string[] | null;
  verified: boolean | null;
  cover_image_url: string | null;
};

const MarketplacePage = () => {
  usePageMeta("Find vetted tradespeople", "Browse verified builders, electricians, plumbers and more near you on Craftvaro.");
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [traders, setTraders] = useState<TraderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const fetchTraders = async () => {
      setLoading(true);
      let query = supabase
        .from("trader_profiles_public")
        .select("id, full_name, company_name, trade_specialism, rating, services_description, service_radius_miles, years_experience, trade_bodies, verified, cover_image_url");

      if (category !== "all") {
        query = query.eq("trade_specialism", category as any);
      }

      const { data } = await query;
      setTraders((data as TraderCard[]) ?? []);
      setLoading(false);
    };

    fetchTraders();
  }, [category]);

  const filtered = traders.filter(
    (t) =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.company_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.services_description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCat = tradeCategories.find((c) => c.slug === category);

  return (
    <div className="space-y-8 page-enter">
      {/* Hero header */}
      <div className="glass-card-elevated p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="outline" className="text-xs font-medium gap-1.5 py-1 px-3 mb-2">
              <Users className="h-3 w-3" />
              Craftvaro Marketplace
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Find a Tradesperson</h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Browse verified, rated tradespeople across the UK. Compare profiles, check reviews, and get quotes.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {!user && (
              <Button asChild variant="outline" size="sm" className="gap-2 font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Link to="/signup">
                  List your trade
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Button asChild size="sm" className="gap-2 font-semibold shadow-sm">
              <Link to="/post-job">
                Post a job
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-border">
          {[
            { icon: Shield, label: "Verified traders", value: "500+" },
            { icon: Star, label: "Avg. rating", value: "4.8★" },
            { icon: CheckCircle, label: "Jobs completed", value: "2,400+" },
            { icon: Clock, label: "Avg. response", value: "< 2hrs" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {tradeCategories.map(({ slug, label, icon: Icon }) => (
          <button
            key={slug}
            onClick={() => setCategory(slug)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              category === slug
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} tradesperson{filtered.length !== 1 ? "s" : ""} found
          {category !== "all" && activeCat ? ` in ${activeCat.label}` : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Trader cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-xl overflow-hidden">
              <div className="h-28 skeleton-shimmer rounded-none" />
              <div className="p-5 space-y-3">
                <div className="skeleton-shimmer h-5 w-3/4" />
                <div className="skeleton-shimmer h-4 w-1/2" />
                <div className="skeleton-shimmer h-3 w-full" />
                <div className="skeleton-shimmer h-3 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <div className="skeleton-shimmer h-6 w-16 rounded-full" />
                  <div className="skeleton-shimmer h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto">
            <Search className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {traders.length === 0 ? "No traders registered yet" : "No traders match your search"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {traders.length === 0
              ? "Be the first tradesperson to join our marketplace and start winning jobs."
              : "Try adjusting your search or browse a different category."}
          </p>
          {!user && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/signup"><ArrowRight className="h-3.5 w-3.5" /> Register as a tradesperson</Link>
            </Button>
          )}
        </div>
      ) : (
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((trader) => (
            <StaggerItem key={trader.id}>
              <ScaleOnHover>
                <Link
                  to={`/trader/${trader.id}`}
                  className="glass-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all group block rounded-xl"
                >
                  {/* Cover */}
                  <div className="h-28 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary relative">
                    {trader.cover_image_url && (
                      <img src={trader.cover_image_url} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {trader.verified && (
                        <Badge className="bg-success/90 text-white border-0 gap-1 text-[10px] shadow-sm">
                          <Shield className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    {/* Response time badge — competitor feature */}
                    <Badge className="absolute bottom-3 right-3 bg-card/90 text-foreground border-0 gap-1 text-[10px] backdrop-blur-sm shadow-sm">
                      <Clock className="h-3 w-3 text-primary" />
                      Responds in ~1hr
                    </Badge>
                    <div className="absolute -bottom-7 left-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card border-2 border-background text-primary font-bold text-xl shadow-lg">
                        {trader.full_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-11 space-y-3">
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-base">
                        {trader.full_name}
                      </h3>
                      {trader.company_name && (
                        <p className="text-sm text-muted-foreground">{trader.company_name}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-sm">
                      {trader.trade_specialism && (
                        <Badge variant="outline" className="capitalize text-xs font-semibold gap-1 py-0.5 rounded-lg">
                          {trader.trade_specialism.replace("_", " ")}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                        <span className="font-bold text-foreground">{trader.rating?.toFixed(1) ?? "5.0"}</span>
                      </span>
                      {trader.years_experience && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {trader.years_experience} yrs
                        </span>
                      )}
                    </div>

                    {trader.services_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{trader.services_description}</p>
                    )}

                    {trader.trade_bodies && trader.trade_bodies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {trader.trade_bodies.slice(0, 3).map((body) => (
                          <Badge key={body} variant="outline" className="text-[10px] gap-1 py-0 bg-secondary/50 rounded-md">
                            <Award className="h-2.5 w-2.5" />
                            {body}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      {trader.service_radius_miles && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {trader.service_radius_miles} mile radius
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                        <MessageCircle className="h-3 w-3" />
                        Get quote
                      </div>
                    </div>
                  </div>
                </Link>
              </ScaleOnHover>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
};

export default MarketplacePage;
