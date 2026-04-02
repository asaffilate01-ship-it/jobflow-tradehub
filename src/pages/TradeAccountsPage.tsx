import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, Plus, CheckCircle, XCircle, Store, Search,
  Truck, ShoppingBag, CreditCard, Filter, Lock, Globe, KeyRound
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TradeAccount = {
  id: string;
  merchant_id: string;
  account_reference: string;
  account_name: string | null;
  verified: boolean;
  portal_url: string | null;
  portal_username: string | null;
  encrypted_credentials: string | null;
  discount_percentage: number | null;
  merchant?: { name: string; slug: string };
};

type Merchant = {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: string;
  average_price_band: string;
  supports_trade_account: boolean;
  supports_delivery: boolean;
  supports_click_collect: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General Builders",
  tools: "Tools & Fixings",
  plumbing: "Plumbing & Heating",
  electrical: "Electrical",
  joinery: "Joinery & Kitchens",
  tiling: "Tiling",
  decorating: "Paint & Decorating",
  roofing: "Roofing",
  landscaping: "Landscaping",
  aggregates: "Aggregates",
  insulation: "Insulation",
  bathrooms: "Bathrooms",
  timber: "Timber",
};

const PRICE_COLORS: Record<string, string> = {
  budget: "bg-green-500/15 text-green-400 border-green-500/20",
  "mid-range": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  premium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const TradeAccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Form
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [accountName, setAccountName] = useState("");
  const [portalUrl, setPortalUrl] = useState("");
  const [portalUsername, setPortalUsername] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Credential editing
  const [editingCredentials, setEditingCredentials] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editPortalUrl, setEditPortalUrl] = useState("");
  const [editPortalUsername, setEditPortalUsername] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: companies } = await supabase
        .from("trade_companies")
        .select("id")
        .eq("owner_profile_id", user.id);

      let cId = companies?.[0]?.id;
      if (!cId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        const { data: newCo } = await supabase
          .from("trade_companies")
          .insert({
            legal_name: profile?.full_name ?? "My Company",
            owner_profile_id: user.id,
          })
          .select("id")
          .single();
        cId = newCo?.id;
      }
      setCompanyId(cId ?? null);

      const { data: merch } = await supabase
        .from("merchants")
        .select("*")
        .order("name");
      setMerchants((merch as Merchant[]) ?? []);

      if (cId) {
        const { data: accs } = await supabase
          .from("trade_accounts")
          .select("id, merchant_id, account_reference, account_name, verified, portal_url, portal_username, encrypted_credentials, discount_percentage")
          .eq("trade_company_id", cId);
        const enriched = (accs ?? []).map((a: any) => ({
          ...a,
          merchant: (merch ?? []).find(
            (m: Merchant) => m.id === a.merchant_id
          ),
        }));
        setAccounts(enriched as TradeAccount[]);
      }
      setLoading(false);
    };
    init();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedMerchant) return;
    setSubmitting(true);
    const { error } = await supabase.from("trade_accounts").insert({
      trade_company_id: companyId,
      merchant_id: selectedMerchant,
      account_reference: accountRef,
      account_name: accountName || null,
      discount_percentage: discountPct ? Number(discountPct) : 0,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      // Save credentials via edge function if provided
      if (portalPassword) {
        const { data: newAccs } = await supabase
          .from("trade_accounts")
          .select("id")
          .eq("trade_company_id", companyId)
          .eq("merchant_id", selectedMerchant)
          .order("created_at", { ascending: false })
          .limit(1);
        if (newAccs?.[0]) {
          await supabase.functions.invoke("merchant-credentials", {
            body: { action: "save", trade_account_id: newAccs[0].id, portal_url: portalUrl, portal_username: portalUsername, password: portalPassword },
          });
        }
      }
      toast.success("Trade account added!");
      setShowForm(false);
      setAccountRef(""); setAccountName(""); setPortalUrl(""); setPortalUsername(""); setPortalPassword(""); setDiscountPct("");
      await refreshAccounts();
    }
  };

  const refreshAccounts = async () => {
    if (!companyId) return;
    const { data: accs } = await supabase
      .from("trade_accounts")
      .select("id, merchant_id, account_reference, account_name, verified, portal_url, portal_username, encrypted_credentials, discount_percentage")
      .eq("trade_company_id", companyId);
    const enriched = (accs ?? []).map((a: any) => ({
      ...a,
      merchant: merchants.find((m) => m.id === a.merchant_id),
    }));
    setAccounts(enriched as TradeAccount[]);
  };

  const handleSaveCredentials = async (accountId: string) => {
    if (!editPassword) { toast.error("Enter a password"); return; }
    setSavingCredentials(true);
    const { data, error } = await supabase.functions.invoke("merchant-credentials", {
      body: { action: "save", trade_account_id: accountId, portal_url: editPortalUrl, portal_username: editPortalUsername, password: editPassword },
    });
    setSavingCredentials(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to save credentials");
    } else {
      toast.success("Credentials saved securely");
      setEditingCredentials(null);
      setEditPassword(""); setEditPortalUrl(""); setEditPortalUsername("");
      await refreshAccounts();
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(merchants.map((m) => m.category));
    return ["all", ...Array.from(cats).sort()];
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const matchesSearch = m.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCat =
        activeCategory === "all" || m.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [merchants, search, activeCategory]);

  const linkedMerchantIds = new Set(accounts.map((a) => a.merchant_id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Link your merchant trade accounts to order at trade prices
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2 font-semibold shrink-0"
        >
          <Plus className="h-4 w-4" />
          Link Account
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="glass-card p-6 space-y-4 animate-slide-up"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Link a trade account
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Merchant
              </label>
              <select
                className={selectClass}
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                required
              >
                <option value="">Select merchant…</option>
                {merchants
                  .filter((m) => m.supports_trade_account)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Account reference
              </label>
              <Input
                placeholder="e.g. TP-12345"
                value={accountRef}
                onChange={(e) => setAccountRef(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Account name (optional)
              </label>
              <Input
                placeholder="e.g. Main site account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="font-semibold" disabled={submitting}>
            {submitting ? "Adding…" : "Add trade account"}
          </Button>
        </form>
      )}

      {/* Linked accounts */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card p-10 text-center space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-medium">
            No trade accounts linked yet
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Link your merchant accounts below to start ordering materials at
            trade prices.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="glass-card p-4 flex items-start gap-3 hover:border-primary/20 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">
                    {acc.merchant?.name ?? "Unknown"}
                  </span>
                  {acc.verified ? (
                    <Badge
                      variant="outline"
                      className="bg-success/15 text-success border-success/20 gap-1 text-[10px]"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-warning/15 text-warning border-warning/20 gap-1 text-[10px]"
                    >
                      <XCircle className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ref: <span className="font-mono">{acc.account_reference}</span>
                  {acc.account_name && ` — ${acc.account_name}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merchant Directory */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Merchant Directory</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search merchants…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category tabs - scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 pb-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === "all"
                  ? `All (${merchants.length})`
                  : `${CATEGORY_LABELS[cat] || cat} (${merchants.filter((m) => m.category === cat).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant grid */}
        {filteredMerchants.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No merchants match your filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMerchants.map((m) => {
              const isLinked = linkedMerchantIds.has(m.id);
              return (
                <div
                  key={m.id}
                  className={`glass-card p-4 space-y-3 transition-all hover:border-primary/20 ${
                    isLinked ? "ring-1 ring-primary/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {CATEGORY_LABELS[m.category] || m.category} ·{" "}
                        {m.type}
                      </p>
                    </div>
                    {isLinked && (
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20 text-[10px] shrink-0"
                      >
                        Linked
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {m.supports_trade_account && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        <CreditCard className="h-3 w-3" />
                        Trade
                      </span>
                    )}
                    {m.supports_delivery && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        <Truck className="h-3 w-3" />
                        Delivery
                      </span>
                    )}
                    {m.supports_click_collect && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        <ShoppingBag className="h-3 w-3" />
                        Click & Collect
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${PRICE_COLORS[m.average_price_band] || ""}`}
                    >
                      {m.average_price_band}
                    </Badge>
                    {!isLinked && m.supports_trade_account && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-primary hover:text-primary"
                        onClick={() => {
                          setSelectedMerchant(m.id);
                          setShowForm(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Link
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeAccountsPage;
