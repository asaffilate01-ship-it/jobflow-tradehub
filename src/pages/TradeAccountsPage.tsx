import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, Trash2, CheckCircle, XCircle, Store } from "lucide-react";

type TradeAccount = {
  id: string;
  merchant_id: string;
  account_reference: string;
  account_name: string | null;
  verified: boolean;
  merchant?: { name: string; slug: string };
};

type Merchant = {
  id: string;
  name: string;
  slug: string;
  supports_trade_account: boolean;
  supports_delivery: boolean;
  supports_click_collect: boolean;
};

const TradeAccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Form
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      // Get or create trade company
      const { data: companies } = await supabase
        .from("trade_companies")
        .select("id")
        .eq("owner_profile_id", user.id);

      let cId = companies?.[0]?.id;
      if (!cId) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        const { data: newCo } = await supabase
          .from("trade_companies")
          .insert({ legal_name: profile?.full_name ?? "My Company", owner_profile_id: user.id })
          .select("id")
          .single();
        cId = newCo?.id;
      }
      setCompanyId(cId ?? null);

      // Fetch merchants
      const { data: merch } = await supabase.from("merchants").select("*").order("name");
      setMerchants((merch as Merchant[]) ?? []);

      // Fetch accounts
      if (cId) {
        const { data: accs } = await supabase
          .from("trade_accounts")
          .select("id, merchant_id, account_reference, account_name, verified")
          .eq("trade_company_id", cId);
        
        // Join merchant names client-side
        const enriched = (accs ?? []).map((a) => ({
          ...a,
          merchant: (merch ?? []).find((m: Merchant) => m.id === a.merchant_id),
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
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Trade account added!");
      setShowForm(false);
      setAccountRef("");
      setAccountName("");
      // Refresh
      const { data: accs } = await supabase
        .from("trade_accounts")
        .select("id, merchant_id, account_reference, account_name, verified")
        .eq("trade_company_id", companyId);
      const enriched = (accs ?? []).map((a) => ({
        ...a,
        merchant: merchants.find((m) => m.id === a.merchant_id),
      }));
      setAccounts(enriched as TradeAccount[]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your merchant trade accounts for ordering materials at trade prices
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card p-6 space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Link a trade account
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Merchant</label>
              <select className={selectClass} value={selectedMerchant} onChange={(e) => setSelectedMerchant(e.target.value)} required>
                <option value="">Select merchant…</option>
                {merchants.filter(m => m.supports_trade_account).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Account reference</label>
              <Input placeholder="e.g. TP-12345" value={accountRef} onChange={(e) => setAccountRef(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Account name (optional)</label>
              <Input placeholder="e.g. Main site account" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="font-semibold" disabled={submitting}>
            {submitting ? "Adding…" : "Add trade account"}
          </Button>
        </form>
      )}

      {/* Accounts list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card p-5 h-20 animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No trade accounts linked yet.</p>
          <p className="text-xs text-muted-foreground">Add your merchant accounts to start ordering materials at trade prices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="glass-card p-5 flex items-center gap-4 hover:border-primary/20 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{acc.merchant?.name ?? "Unknown"}</span>
                  {acc.verified ? (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/20 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-warning/15 text-warning border-warning/20 gap-1">
                      <XCircle className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Ref: <span className="font-mono">{acc.account_reference}</span>
                  {acc.account_name && ` — ${acc.account_name}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available merchants */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Merchants</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {merchants.map((m) => (
            <div key={m.id} className="glass-card p-4 space-y-2">
              <div className="font-semibold text-foreground">{m.name}</div>
              <div className="flex flex-wrap gap-1">
                {m.supports_trade_account && <Badge variant="outline" className="text-[10px]">Trade account</Badge>}
                {m.supports_delivery && <Badge variant="outline" className="text-[10px]">Delivery</Badge>}
                {m.supports_click_collect && <Badge variant="outline" className="text-[10px]">Click & collect</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeAccountsPage;
