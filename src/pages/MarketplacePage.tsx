import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, MapPin, Search, Shield, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  phone: string | null;
};

const MarketplacePage = () => {
  const { user, roles } = useAuth();
  const [traders, setTraders] = useState<TraderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTraders = async () => {
      setLoading(true);
      // Fetch profiles that have the 'trade' role
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
        .select("id, full_name, company_name, trade_specialism, rating, phone")
        .in("id", tradeUserIds)
        .eq("is_active", true);

      if (category !== "all") {
        query = query.eq("trade_specialism", category);
      }

      const { data } = await query;
      setTraders(data ?? []);
      setLoading(false);
    };

    fetchTraders();
  }, [category]);

  const filtered = traders.filter(
    (t) =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isCustomer = roles.includes("customer");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find a Tradesperson</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse verified trades by category — like Checkatrade, built for construction
        </p>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or company…"
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
            <div key={i} className="glass-card p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">
            {traders.length === 0
              ? "No traders registered yet. Be the first!"
              : "No traders match your search."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((trader) => (
            <div
              key={trader.id}
              className="glass-card p-5 space-y-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-lg">
                  {trader.full_name.charAt(0).toUpperCase()}
                </div>
                <Badge variant="outline" className="bg-success/15 text-success border-success/20 gap-1">
                  <Shield className="h-3 w-3" />
                  Verified
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">{trader.full_name}</h3>
                {trader.company_name && (
                  <p className="text-sm text-muted-foreground">{trader.company_name}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {trader.trade_specialism && (
                  <span className="capitalize">{trader.trade_specialism.replace("_", " ")}</span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                  {trader.rating?.toFixed(1) ?? "5.0"}
                </span>
              </div>

              {isCustomer && (
                <Button size="sm" variant="outline" className="w-full gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  Contact
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
