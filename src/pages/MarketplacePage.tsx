import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Search, Shield, Phone, Lock, Award, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tradeCategories = [
  "all", "builder", "plumber", "electrician", "gas_engineer", "tiler",
  "carpenter", "bricklayer", "roofer", "plasterer", "painter", "landscaper",
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
  const { user, roles } = useAuth();
  const [searchParams] = useSearchParams();
  const [traders, setTraders] = useState<TraderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const isSubscribed = roles.includes("trade") || roles.includes("customer") || roles.includes("admin");

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

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Find a Tradesperson</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse verified, rated tradespeople by category
          </p>
        </div>
        {!user && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/signup">
              List your trade
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {tradeCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {cat === "all" ? "All trades" : cat.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Trader cards grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Search className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            {traders.length === 0 ? "No traders registered yet. Be the first!" : "No traders match your search."}
          </p>
          {!user && (
            <Button asChild variant="outline" size="sm">
              <Link to="/signup">Register as a tradesperson</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((trader) => (
            <Link
              key={trader.id}
              to={`/trader/${trader.id}`}
              className="glass-card overflow-hidden hover:border-primary/30 transition-all group"
            >
              {/* Cover image or gradient */}
              <div className="h-20 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary relative">
                {trader.cover_image_url && (
                  <img src={trader.cover_image_url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute -bottom-5 left-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary border-2 border-background text-primary font-bold text-lg">
                    {trader.full_name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-8 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {trader.full_name}
                    </h3>
                    {trader.company_name && (
                      <p className="text-sm text-muted-foreground">{trader.company_name}</p>
                    )}
                  </div>
                  {trader.verified && (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/20 gap-1 shrink-0">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                {/* Trade & rating */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {trader.trade_specialism && (
                    <span className="capitalize font-medium">{trader.trade_specialism.replace("_", " ")}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                    {trader.rating?.toFixed(1) ?? "5.0"}
                  </span>
                  {trader.years_experience && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {trader.years_experience}yr
                    </span>
                  )}
                </div>

                {/* Services snippet */}
                {trader.services_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{trader.services_description}</p>
                )}

                {/* Trade bodies */}
                {trader.trade_bodies && trader.trade_bodies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {trader.trade_bodies.slice(0, 3).map((body) => (
                      <Badge key={body} variant="outline" className="text-[10px] gap-1 py-0">
                        <Award className="h-2.5 w-2.5" />
                        {body}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Radius */}
                {trader.service_radius_miles && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Covers {trader.service_radius_miles} mile radius
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
