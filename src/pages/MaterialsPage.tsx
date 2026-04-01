import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, Calculator, Truck, Search, Plus, Trash2, ShoppingCart, Clock, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type UrgencyLevel = Database["public"]["Enums"]["urgency_level"];
type DeliveryMode = Database["public"]["Enums"]["merchant_delivery_mode"];

type Merchant = {
  id: string;
  name: string;
  slug: string;
  supports_trade_account: boolean;
  supports_delivery: boolean;
  supports_click_collect: boolean;
};

type MerchantBranch = {
  id: string;
  merchant_id: string;
  branch_name: string | null;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
};

type TradeAccount = {
  id: string;
  merchant_id: string;
  account_reference: string;
  account_name: string | null;
};

type Job = {
  id: string;
  title: string;
  address_line1: string;
  postcode: string;
};

type OrderItem = {
  key: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  category: string;
};

type RateRow = {
  base_fee: number;
  per_mile_fee: number;
  manpower_fee: number;
  percentage_markup: number;
};

const vehicleOptions: { value: VehicleType; label: string }[] = [
  { value: "car", label: "Car" },
  { value: "small_van", label: "Small Van" },
  { value: "medium_van", label: "Medium Van" },
  { value: "luton", label: "Luton" },
  { value: "flatbed", label: "Flatbed" },
];

const urgencyOptions: { value: UrgencyLevel; label: string; desc: string }[] = [
  { value: "standard", label: "Standard", desc: "24 hours" },
  { value: "priority", label: "Priority", desc: "6 hours" },
  { value: "emergency", label: "Emergency", desc: "2 hours" },
];

const deliveryModeOptions: { value: DeliveryMode; label: string; icon: string }[] = [
  { value: "platform_driver", label: "Platform driver (fastest)", icon: "🚀" },
  { value: "merchant_delivery", label: "Merchant delivery", icon: "🏪" },
  { value: "trade_collect", label: "Collect yourself", icon: "🛒" },
];

const categories = ["Timber", "Cement & Aggregates", "Plasterboard & Dry Lining", "Fixings", "Plumbing", "Electrical", "Insulation", "Roofing", "Other"];

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const MaterialsPage = () => {
  const { user } = useAuth();

  // Data from DB
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [branches, setBranches] = useState<MerchantBranch[]>([]);
  const [tradeAccounts, setTradeAccounts] = useState<TradeAccount[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rateRows, setRateRows] = useState<RateRow[]>([]);

  // Order form state
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("platform_driver");
  const [vehicle, setVehicle] = useState<VehicleType>("small_van");
  const [urgency, setUrgency] = useState<UrgencyLevel>("priority");
  const [miles, setMiles] = useState(8);
  const [manpower, setManpower] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<OrderItem[]>([
    { key: crypto.randomUUID(), item_name: "", quantity: 1, unit: "each", unit_price: 0, category: "Other" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Parallel fetch
      const [merchRes, branchRes, companyRes, jobsRes, rateRes] = await Promise.all([
        supabase.from("merchants").select("id, name, slug, supports_trade_account, supports_delivery, supports_click_collect").order("name"),
        supabase.from("merchant_branches").select("id, merchant_id, branch_name, address_line1, city, postcode"),
        supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id),
        supabase.from("jobs").select("id, title, address_line1, postcode").in("status", ["awarded", "active"]),
        supabase.from("delivery_rate_card_rows").select("base_fee, per_mile_fee, manpower_fee, percentage_markup"),
      ]);

      setMerchants((merchRes.data as Merchant[]) ?? []);
      setBranches((branchRes.data as MerchantBranch[]) ?? []);
      setRateRows((rateRes.data as RateRow[]) ?? []);

      const cId = companyRes.data?.[0]?.id ?? null;
      setCompanyId(cId);

      if (cId) {
        const [accRes, ordersRes] = await Promise.all([
          supabase.from("trade_accounts").select("id, merchant_id, account_reference, account_name").eq("trade_company_id", cId),
          supabase.from("material_orders").select("*, merchants(name)").eq("trade_company_id", cId).order("created_at", { ascending: false }).limit(20),
        ]);
        setTradeAccounts((accRes.data as TradeAccount[]) ?? []);
        setOrders(ordersRes.data ?? []);
      }

      setJobs((jobsRes.data as Job[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  // When job selected, auto-fill delivery address
  useEffect(() => {
    if (selectedJob) {
      const job = jobs.find(j => j.id === selectedJob);
      if (job) setDeliveryAddress(`${job.address_line1}, ${job.postcode}`);
    }
  }, [selectedJob, jobs]);

  // Filter branches by merchant
  const filteredBranches = useMemo(() =>
    branches.filter(b => b.merchant_id === selectedMerchant), [branches, selectedMerchant]);

  // Filter trade accounts by merchant
  const filteredAccounts = useMemo(() =>
    tradeAccounts.filter(a => a.merchant_id === selectedMerchant), [tradeAccounts, selectedMerchant]);

  // Goods total
  const goodsTotal = useMemo(() =>
    items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0), [items]);

  // Delivery pricing from rate card
  const pricing = useMemo(() => {
    if (deliveryMode !== "platform_driver") {
      return { total: 0, driverPayout: 0, platformMargin: 0, subtotal: 0, manpowerCost: 0, markupCost: 0 };
    }
    // Find matching rate row or use defaults
    const rate = rateRows.length > 0 ? rateRows[0] : { base_fee: 15, per_mile_fee: 1.5, manpower_fee: 10, percentage_markup: 20 };
    const urgencyMult = urgency === "emergency" ? 1.3 : urgency === "priority" ? 1.15 : 1;
    const subtotal = (rate.base_fee + miles * rate.per_mile_fee) * urgencyMult;
    const manpowerCost = Math.max(0, manpower - 1) * rate.manpower_fee;
    const markupCost = subtotal * (rate.percentage_markup / 100);
    const total = subtotal + manpowerCost + markupCost;
    const driverPayout = total * 0.75;
    const platformMargin = total - driverPayout;
    return { total, driverPayout, platformMargin, subtotal, manpowerCost, markupCost };
  }, [deliveryMode, vehicle, urgency, miles, manpower, rateRows]);

  const addItem = () => {
    setItems([...items, { key: crypto.randomUUID(), item_name: "", quantity: 1, unit: "each", unit_price: 0, category: "Other" }]);
  };

  const updateItem = (key: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(i => i.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user || !selectedMerchant || !selectedJob) {
      toast.error("Please select a merchant and job");
      return;
    }
    const validItems = items.filter(i => i.item_name.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setSubmitting(true);
    try {
      // Create material order
      const { data: order, error: orderErr } = await supabase.from("material_orders").insert({
        trade_company_id: companyId,
        created_by: user.id,
        merchant_id: selectedMerchant,
        merchant_branch_id: selectedBranch || null,
        job_id: selectedJob,
        trade_account_id: selectedAccount || null,
        delivery_mode: deliveryMode,
        delivery_address: deliveryAddress,
        pickup_address: filteredBranches.find(b => b.id === selectedBranch)?.address_line1 ?? null,
        required_vehicle: deliveryMode === "platform_driver" ? vehicle : null,
        urgency,
        manpower_required: manpower,
        goods_total: goodsTotal,
        platform_delivery_fee: pricing.total,
        notes: notes || null,
        order_status: "draft",
      }).select("id").single();

      if (orderErr) throw orderErr;

      // Insert order items
      const orderItems = validItems.map(i => ({
        material_order_id: order!.id,
        item_name: i.item_name,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unit_price,
        category: i.category,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // If platform driver, create a delivery record
      if (deliveryMode === "platform_driver") {
        await supabase.from("deliveries").insert({
          material_order_id: order!.id,
          price_charged: pricing.total,
          driver_payout: pricing.driverPayout,
          platform_margin: pricing.platformMargin,
          estimated_distance_miles: miles,
          status: "broadcast",
        });
      }

      toast.success("Material order submitted!");
      // Reset
      setItems([{ key: crypto.randomUUID(), item_name: "", quantity: 1, unit: "each", unit_price: 0, category: "Other" }]);
      setNotes("");
      // Refresh orders
      const { data: refreshed } = await supabase.from("material_orders")
        .select("*, merchants(name)")
        .eq("trade_company_id", companyId)
        .order("created_at", { ascending: false }).limit(20);
      setOrders(refreshed ?? []);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  const orderStatusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    submitted: { label: "Submitted", className: "bg-info/15 text-info" },
    confirmed: { label: "Confirmed", className: "bg-accent/15 text-accent" },
    ready_for_pickup: { label: "Ready", className: "bg-warning/15 text-warning" },
    collected: { label: "Collected", className: "bg-success/15 text-success" },
    delivered: { label: "Delivered", className: "bg-success/15 text-success" },
    cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive" },
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 glass-card p-6 h-96 animate-pulse" />
          <div className="lg:col-span-2 glass-card p-6 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Materials & Delivery</h1>
        <p className="text-sm text-muted-foreground mt-1">Order materials from merchants and get them delivered to site</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Order form — left */}
          <div className="lg:col-span-3 space-y-6">
            {/* Merchant & Job */}
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Order Details</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Job *</label>
                  <select className={selectClass} value={selectedJob} onChange={e => setSelectedJob(e.target.value)} required>
                    <option value="">Select job…</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title} — {j.postcode}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Merchant *</label>
                  <select className={selectClass} value={selectedMerchant} onChange={e => { setSelectedMerchant(e.target.value); setSelectedBranch(""); setSelectedAccount(""); }} required>
                    <option value="">Select merchant…</option>
                    {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Branch</label>
                  <select className={selectClass} value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                    <option value="">Any / nearest</option>
                    {filteredBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.branch_name || b.city || b.postcode}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Trade account</label>
                  <select className={selectClass} value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                    <option value="">None</option>
                    {filteredAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_reference}{a.account_name ? ` — ${a.account_name}` : ""}</option>
                    ))}
                  </select>
                  {selectedMerchant && filteredAccounts.length === 0 && (
                    <p className="text-xs text-warning">No trade account linked for this merchant. <a href="/trade-accounts" className="underline">Add one →</a></p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Delivery mode *</label>
                  <select className={selectClass} value={deliveryMode} onChange={e => setDeliveryMode(e.target.value as DeliveryMode)}>
                    {deliveryModeOptions.map(d => (
                      <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {deliveryMode !== "trade_collect" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Delivery address</label>
                  <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Auto-filled from job, or enter manually" />
                </div>
              )}
            </div>

            {/* Items */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Items
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.key} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-1">
                      {idx === 0 && <label className="text-xs text-muted-foreground">Item name</label>}
                      <Input
                        placeholder="e.g. CLS Timber 4x2"
                        value={item.item_name}
                        onChange={e => updateItem(item.key, "item_name", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      {idx === 0 && <label className="text-xs text-muted-foreground">Category</label>}
                      <select className={selectClass} value={item.category} onChange={e => updateItem(item.key, "category", e.target.value)}>
                        {categories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 space-y-1">
                      {idx === 0 && <label className="text-xs text-muted-foreground">Qty</label>}
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.key, "quantity", Number(e.target.value))} />
                    </div>
                    <div className="col-span-1 space-y-1">
                      {idx === 0 && <label className="text-xs text-muted-foreground">Unit</label>}
                      <select className={selectClass} value={item.unit} onChange={e => updateItem(item.key, "unit", e.target.value)}>
                        {["each", "m", "m²", "m³", "kg", "bag", "sheet", "pack", "box", "roll"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      {idx === 0 && <label className="text-xs text-muted-foreground">Unit £</label>}
                      <Input type="number" min={0} step={0.01} value={item.unit_price} onChange={e => updateItem(item.key, "unit_price", Number(e.target.value))} />
                    </div>
                    <div className="col-span-1 space-y-1">
                      {idx === 0 && <label className="text-xs text-muted-foreground">&nbsp;</label>}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                          £{(item.quantity * item.unit_price).toFixed(2)}
                        </span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(item.key)} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1" />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Goods total: <span className="text-foreground font-semibold">£{goodsTotal.toFixed(2)}</span>
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special instructions, access details, etc."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right — delivery pricing + submit */}
          <div className="lg:col-span-2 space-y-6">
            {deliveryMode === "platform_driver" && (
              <div className="glass-card p-6 space-y-5 glow">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Delivery Pricing</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Vehicle</label>
                    <select className={selectClass} value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
                      {vehicleOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Urgency</label>
                    <select className={selectClass} value={urgency} onChange={e => setUrgency(e.target.value as UrgencyLevel)}>
                      {urgencyOptions.map(u => <option key={u.value} value={u.value}>{u.label} ({u.desc})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Distance (miles)</label>
                    <Input type="number" value={miles} onChange={e => setMiles(Number(e.target.value))} min={0} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Manpower</label>
                    <Input type="number" value={manpower} onChange={e => setManpower(Number(e.target.value))} min={1} max={4} />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Base + distance</span>
                    <span>£{pricing.subtotal.toFixed(2)}</span>
                  </div>
                  {pricing.manpowerCost > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Extra manpower</span>
                      <span>£{pricing.manpowerCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform fee</span>
                    <span>£{pricing.markupCost.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-muted-foreground">Delivery fee</span>
                      <span className="text-3xl font-bold text-gradient">£{pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order summary */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Materials ({items.filter(i => i.item_name).length} items)</span>
                  <span>£{goodsTotal.toFixed(2)}</span>
                </div>
                {deliveryMode === "platform_driver" && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform delivery</span>
                    <span>£{pricing.total.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Total</span>
                    <span>£{(goodsTotal + pricing.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full font-semibold gap-2" disabled={submitting}>
                <Package className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit Material Order"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <div className="space-y-3">
            {orders.map((o: any) => {
              const sc = orderStatusConfig[o.order_status] || orderStatusConfig.draft;
              return (
                <div key={o.id} className="glass-card p-4 flex items-center gap-4 hover:border-primary/20 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{o.id.slice(0, 8)}</span>
                      <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                      <Badge variant="outline" className="text-xs">{o.urgency}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(o.merchants as any)?.name ?? "Unknown"} — {o.delivery_mode?.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">£{Number(o.goods_total + o.platform_delivery_fee).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsPage;
