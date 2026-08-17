import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Search, Plus, Trash2, ShoppingCart, MapPin, Truck,
  Store, CreditCard, CheckCircle, ArrowRight, Package,
  Zap, BarChart3, ArrowLeft, ShoppingBag, DollarSign,
} from "lucide-react";

type ShoppingItem = { key: string; item_name: string; quantity: number; unit: string };
type Job = { id: string; title: string; address_line1: string; postcode: string; city: string };

type ComparisonItem = {
  item_name: string;
  quantity: number;
  unit: string;
  best_merchant_id: string;
  best_merchant_name: string;
  best_price: number;
  trade_account_price: number | null;
  retail_price: number;
  has_trade_account: boolean;
  line_total: number;
  alternatives: { merchant_id: string; merchant_name: string; price: number; has_trade_account: boolean; trade_price: number | null }[];
};

type DeliverySummary = {
  merchant_id: string;
  merchant_name: string;
  item_count: number;
  subtotal: number;
  delivery_options: { method: string; label: string; cost: number }[];
};

const SmartOrderPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<"list" | "results">("list");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Shopping list
  const [selectedJob, setSelectedJob] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [items, setItems] = useState<ShoppingItem[]>([
    { key: crypto.randomUUID(), item_name: "", quantity: 1, unit: "each" },
  ]);
  const [comparing, setComparing] = useState(false);

  // Results
  const [results, setResults] = useState<ComparisonItem[]>([]);
  const [deliverySummary, setDeliverySummary] = useState<DeliverySummary[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [totalDelivery, setTotalDelivery] = useState(0);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [selectedDeliveryMethods, setSelectedDeliveryMethods] = useState<Record<string, string>>({});

  // Past quotes
  const [pastQuotes, setPastQuotes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const [{ data: companies }, { data: jobsData }, { data: quotes }] = await Promise.all([
        supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id),
        supabase.from("jobs").select("id, title, address_line1, postcode, city").in("status", ["awarded", "active"]),
        supabase.from("price_quotes").select("id, delivery_postcode, status, total_cost, total_delivery_cost, created_at")
          .order("created_at", { ascending: false }).limit(10),
      ]);
      setCompanyId(companies?.[0]?.id ?? null);
      setJobs((jobsData as Job[]) ?? []);
      setPastQuotes(quotes ?? []);
      setLoading(false);
    };
    init();
  }, [user]);

  // Auto-fill address from job
  useEffect(() => {
    if (selectedJob) {
      const job = jobs.find(j => j.id === selectedJob);
      if (job) {
        setDeliveryPostcode(job.postcode);
        setDeliveryAddress(`${job.address_line1}, ${job.city}, ${job.postcode}`);
      }
    }
  }, [selectedJob, jobs]);

  const addItem = () => setItems([...items, { key: crypto.randomUUID(), item_name: "", quantity: 1, unit: "each" }]);
  const removeItem = (key: string) => { if (items.length > 1) setItems(items.filter(i => i.key !== key)); };
  const updateItem = (key: string, field: keyof ShoppingItem, value: any) =>
    setItems(items.map(i => i.key === key ? { ...i, [field]: value } : i));

  const handleCompare = async () => {
    const validItems = items.filter(i => i.item_name.trim());
    if (!validItems.length) { toast.error("Add at least one item"); return; }
    if (!deliveryPostcode) { toast.error("Enter a delivery postcode"); return; }
    if (!companyId) { toast.error("No trade company found"); return; }

    setComparing(true);
    const { data, error } = await supabase.functions.invoke("compare-prices", {
      body: {
        items: validItems.map(i => ({ item_name: i.item_name, quantity: i.quantity, unit: i.unit })),
        trade_company_id: companyId,
        delivery_postcode: deliveryPostcode,
        delivery_address: deliveryAddress,
        job_id: selectedJob || null,
      },
    });
    setComparing(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Comparison failed");
      return;
    }

    setResults(data.items ?? []);
    setDeliverySummary(data.delivery_summary ?? []);
    setTotalMaterials(data.materials_cost ?? 0);
    setTotalDelivery(data.delivery_cost ?? 0);
    setQuoteId(data.quote_id ?? null);

    // Default delivery methods
    const defaults: Record<string, string> = {};
    (data.delivery_summary ?? []).forEach((d: DeliverySummary) => {
      defaults[d.merchant_id] = "platform_driver";
    });
    setSelectedDeliveryMethods(defaults);

    setStep("results");
    toast.success(`Found prices from ${data.merchant_count} suppliers`);
  };

  const handleAcceptQuote = async () => {
    if (!quoteId) return;
    // In a real implementation, this would create material_orders per merchant group
    toast.success("Orders placed! Merchants will be notified.");
  };

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="glass-card p-6 h-96 animate-pulse" />
      </div>
    );
  }

  // ---- RESULTS VIEW ----
  if (step === "results") {
    const grandTotal = totalMaterials + Object.entries(selectedDeliveryMethods).reduce((sum, [merchantId, method]) => {
      if (method === "platform_driver") {
        const ds = deliverySummary.find(d => d.merchant_id === merchantId);
        return sum + (ds?.delivery_options.find(o => o.method === "platform_driver")?.cost ?? 0);
      }
      return sum;
    }, 0);

    return (
      <div className="space-y-6">
        <button onClick={() => setStep("list")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to shopping list
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Price Comparison Report</h1>
            <p className="text-sm text-muted-foreground mt-1">Best prices found across {deliverySummary.length} supplier{deliverySummary.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">£{grandTotal.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">estimated total</div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Materials</div>
            <div className="text-xl font-bold mt-1">£{totalMaterials.toFixed(2)}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" />Delivery</div>
            <div className="text-xl font-bold mt-1">£{(grandTotal - totalMaterials).toFixed(2)}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" />Items</div>
            <div className="text-xl font-bold mt-1">{results.length}</div>
          </motion.div>
        </div>

        {/* Itemised table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" />Itemised Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Qty</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Best Supplier</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Unit Price</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Retail</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Saving</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, i) => {
                  const saving = item.retail_price > 0 && item.best_price < item.retail_price
                    ? ((item.retail_price - item.best_price) / item.retail_price * 100).toFixed(0)
                    : null;
                  return (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="p-3 font-medium">{item.item_name}</td>
                      <td className="p-3 text-muted-foreground">{item.quantity} {item.unit}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span>{item.best_merchant_name}</span>
                          {item.has_trade_account && (
                            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20"><CreditCard className="h-2.5 w-2.5 mr-0.5" />Trade</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">£{item.best_price.toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {item.retail_price > 0 ? `£${item.retail_price.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {saving ? <span className="text-success font-medium">-{saving}%</span> : "—"}
                      </td>
                      <td className="p-3 text-right font-bold">£{item.line_total.toFixed(2)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-secondary/30">
                  <td colSpan={6} className="p-3 text-right font-semibold">Materials Subtotal</td>
                  <td className="p-3 text-right font-bold text-primary">£{totalMaterials.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Delivery options per merchant */}
        <div className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />Delivery Options</h2>
          {deliverySummary.map(ds => (
            <div key={ds.merchant_id} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">{ds.merchant_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{ds.item_count} item{ds.item_count !== 1 ? "s" : ""} · £{ds.subtotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ds.delivery_options.map(opt => (
                  <button
                    key={opt.method}
                    onClick={() => setSelectedDeliveryMethods(prev => ({ ...prev, [ds.merchant_id]: opt.method }))}
                    className={`p-3 rounded-lg border text-center text-xs transition-all ${
                      selectedDeliveryMethods[ds.merchant_id] === opt.method
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="mt-1">{opt.cost > 0 ? `£${opt.cost.toFixed(2)}` : "Free"}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Grand total + accept */}
        <div className="glass-card p-6 glow space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Grand Total (Materials + Delivery)</div>
              <div className="text-3xl font-bold text-primary">£{grandTotal.toFixed(2)}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Materials paid direct to merchants</div>
              <div>Platform delivery fees paid to Craftvaro</div>
            </div>
          </div>
          <Button className="w-full font-semibold gap-2 h-12 text-base" onClick={handleAcceptQuote}>
            <CheckCircle className="h-5 w-5" />
            Accept & Place Orders
          </Button>
        </div>
      </div>
    );
  }

  // ---- SHOPPING LIST VIEW ----
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          Smart Order
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your materials list and we'll find the cheapest prices across all suppliers
        </p>
      </div>

      {/* Site / delivery info */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold">Delivery Location</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Link to job (optional)</label>
            <select className={selectClass} value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
              <option value="">No job selected</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.postcode})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Delivery postcode *</label>
            <Input placeholder="LU3 1AA" value={deliveryPostcode} onChange={(e) => setDeliveryPostcode(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Full address</label>
            <Input placeholder="123 High Street, Luton" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Shopping list */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" />Shopping List</h2>
          <Button size="sm" variant="outline" onClick={addItem} className="gap-1 text-xs"><Plus className="h-3 w-3" />Add item</Button>
        </div>

        {/* Column headers — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-muted-foreground border-b border-border pb-2">
          <span className="w-6 text-right shrink-0">#</span>
          <span className="flex-1">Material / Product</span>
          <span className="w-20 text-center">Qty</span>
          <span className="w-24 text-center">Unit</span>
          <span className="w-8 shrink-0"></span>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.key} className="space-y-2 sm:space-y-0">
              {/* Mobile: stacked layout */}
              <div className="flex items-start gap-2 sm:hidden">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0 tabular-nums pt-2.5">{i + 1}.</span>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="e.g. 50kg cement, 2.4m timber"
                    value={item.item_name}
                    onChange={(e) => updateItem(item.key, "item_name", e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={1} className="w-20 text-center"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, "quantity", Number(e.target.value))}
                    />
                    <select
                      className={`${selectClass} flex-1`}
                      value={item.unit}
                      onChange={(e) => updateItem(item.key, "unit", e.target.value)}
                    >
                      <option value="each">each</option>
                      <option value="bag">bag (25kg)</option>
                      <option value="sheet">sheet</option>
                      <option value="metre">metre</option>
                      <option value="length">length</option>
                      <option value="kg">kg</option>
                      <option value="tonne">tonne</option>
                      <option value="box">box</option>
                      <option value="pack">pack</option>
                      <option value="roll">roll</option>
                      <option value="tin">tin</option>
                      <option value="litre">litre</option>
                      <option value="pallet">pallet</option>
                      <option value="bundle">bundle</option>
                    </select>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => removeItem(item.key)} disabled={items.length === 1}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Desktop: row layout */}
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6 text-right shrink-0 tabular-nums">{i + 1}.</span>
                <Input
                  placeholder="e.g. 50kg cement, 2.4m timber, plasterboard"
                  className="flex-1 min-w-0"
                  value={item.item_name}
                  onChange={(e) => updateItem(item.key, "item_name", e.target.value)}
                />
                <Input
                  type="number" min={1} className="w-20 text-center shrink-0"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, "quantity", Number(e.target.value))}
                />
                <select
                  className={`${selectClass} w-24 shrink-0`}
                  value={item.unit}
                  onChange={(e) => updateItem(item.key, "unit", e.target.value)}
                >
                  <option value="each">each</option>
                  <option value="bag">bag (25kg)</option>
                  <option value="sheet">sheet</option>
                  <option value="metre">metre</option>
                  <option value="length">length</option>
                  <option value="kg">kg</option>
                  <option value="tonne">tonne</option>
                  <option value="box">box</option>
                  <option value="pack">pack</option>
                  <option value="roll">roll</option>
                  <option value="tin">tin</option>
                  <option value="litre">litre</option>
                  <option value="pallet">pallet</option>
                  <option value="bundle">bundle</option>
                </select>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => removeItem(item.key)} disabled={items.length === 1}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full font-semibold gap-2 h-11" onClick={handleCompare} disabled={comparing}>
          {comparing ? (
            <>
              <Search className="h-4 w-4 animate-spin" />
              Comparing prices across all suppliers…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Compare Prices
            </>
          )}
        </Button>
      </div>

      {/* Past quotes */}
      {pastQuotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">Recent Comparisons</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastQuotes.map(q => (
              <div key={q.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />{q.delivery_postcode}
                </div>
                <div className="text-sm font-semibold text-primary">£{(q.total_cost + q.total_delivery_cost).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartOrderPage;
