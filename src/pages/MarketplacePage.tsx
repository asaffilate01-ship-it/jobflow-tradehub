import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Star, MapPin, Search, Shield, Award, Clock, ArrowRight,
  Wrench, Zap, HardHat, Home, Grid3X3, Hammer, BrickWall,
  Paintbrush, Flame, TreePine, Filter, SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StaggerContainer, StaggerItem, ScaleOnHover } from "@/components/MotionWrapper";

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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [traders, setTraders] = useState<TraderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const fetchTraders = async () => {
      setLoading(true);
      const { data: tradeRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "trade");

      if (!tradeRoles?.length) {
        setTraders([]);
        setLoading(false);
        return;
      }

      const tradeUserIds = tradeRoles.map((r) => r.user_id);
      let query = supabase
        .from("profiles")
        .select("id, full_name, company_name, trade_specialism, rating, services_description, service_radius_miles, years_experience, trade_bodies, verified, cover_image_url")
        .in("id", tradeUserIds)
        .eq("is_active", true);

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
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Find a Tradesperson</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse verified, rated tradespeople by category
          </p>
        </div>
        {!user && (
          <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
            <Link to="/signup">
              List your trade
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Category pills with icons */}
      <div className="flex flex-wrap gap-2">
        {tradeCategories.map(({ slug, label, icon: Icon }) => (
          <button
            key={slug}
            onClick={() => setCategory(slug)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              category === slug
                ? "bg-primary text-primary-foreground shadow-sm"
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

      {/* Trader cards grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card h-72 animate-pulse">
              <div className="h-20 bg-secondary/50 rounded-t-lg" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-secondary/50 rounded w-3/4" />
                <div className="h-3 bg-secondary/40 rounded w-1/2" />
                <div className="h-3 bg-secondary/30 rounded w-full" />
                <div className="h-3 bg-secondary/30 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <Search className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
          <h3 className="text-lg font-semibold text-foreground">
            {traders.length === 0 ? "No traders registered yet" : "No traders match your search"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {traders.length === 0
              ? "Be the first tradesperson to join our marketplace."
              : "Try adjusting your search or browse a different category."}
          </p>
          {!user && (
            <Button asChild variant="outline" size="sm">
              <Link to="/signup">Register as a tradesperson</Link>
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
                  className="glass-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all group block"
                >
              {/* Cover */}
              <div className="h-24 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary relative">
                {trader.cover_image_url && (
                  <img src={trader.cover_image_url} alt="" className="w-full h-full object-cover" />
                )}
                {trader.verified && (
                  <Badge className="absolute top-3 right-3 bg-success/90 text-white border-0 gap-1 text-[10px]">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
                <div className="absolute -bottom-6 left-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary border-2 border-background text-primary font-bold text-xl shadow-md">
                    {trader.full_name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-10 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base">
                    {trader.full_name}
                  </h3>
                  {trader.company_name && (
                    <p className="text-sm text-muted-foreground">{trader.company_name}</p>
                  )}
                </div>

                {/* Trade, rating, experience */}
                <div className="flex flex-wrap items-center gap-2.5 text-sm">
                  {trader.trade_specialism && (
                    <Badge variant="outline" className="capitalize text-xs font-medium gap-1 py-0.5">
                      {trader.trade_specialism.replace("_", " ")}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                    <span className="font-medium text-foreground">{trader.rating?.toFixed(1) ?? "5.0"}</span>
                  </span>
                  {trader.years_experience && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {trader.years_experience} yrs
                    </span>
                  )}
                </div>

                {/* Services snippet */}
                {trader.services_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{trader.services_description}</p>
                )}

                {/* Trade bodies */}
                {trader.trade_bodies && trader.trade_bodies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {trader.trade_bodies.slice(0, 3).map((body) => (
                      <Badge key={body} variant="outline" className="text-[10px] gap-1 py-0 bg-secondary/50">
                        <Award className="h-2.5 w-2.5" />
                        {body}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Radius */}
                {trader.service_radius_miles && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
                    <MapPin className="h-3 w-3" />
                    Covers {trader.service_radius_miles} mile radius
                  </div>
                )}
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
