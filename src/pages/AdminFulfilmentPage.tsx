import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/** Keep operator-entered totals/distance aligned with numeric(12,2) storage. */
const parseNonNegativeDecimal = (value: string, maximum: number): number | null => {
  const trimmed = value.trim();
  if (!/^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$/.test(trimmed)) return null;
  const result = Number(trimmed);
  return Number.isFinite(result) && result >= 0 && result <= maximum ? result : null;
};

type Order = {
  id: string; status: string; mode: string; goods_total: number; delivery_fee: number;
  reference: string | null; pickup_address: string | null; delivery_address: string;
  merchant: string; company: string; delivery_status: string | null; distance_miles: number | null;
  items: { name: string; quantity: number; unit: string; unit_price: number }[];
  events: { action: string; evidence: string; created_at: string }[];
};

function FulfilmentCard({ order, refresh }: { order: Order; refresh: () => Promise<void> }) {
  const [reference, setReference] = useState(order.reference ?? "");
  const [pickup, setPickup] = useState(order.pickup_address ?? "");
  const [total, setTotal] = useState("");
  const [distance, setDistance] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const retry = useRef<{ fingerprint: string; key: string }>();
  const run = async (action: string) => {
    if (inFlight.current || busy) return;
    if (evidence.trim().length < 5) { toast.error("Record the source and details of the confirmation first."); return; }
    const confirmedTotal = parseNonNegativeDecimal(total, 100_000_000);
    const confirmedDistance = parseNonNegativeDecimal(distance, 1000);
    if (action === "confirm" && confirmedTotal === null) { toast.error("Enter a valid goods total to two decimal places."); return; }
    if (action === "dispatch" && confirmedDistance === null) { toast.error("Enter a verified route distance to two decimal places."); return; }
    if (action === "confirm" && (!reference.trim() || (order.mode === "platform_driver" && pickup.trim().length < 5))) {
      toast.error("Record the merchant reference and any required pickup address.");
      return;
    }
    const input = { p_order: order.id, p_action: action, p_evidence: evidence.trim(),
      ...(action === "confirm" ? { p_reference: reference.trim(), p_pickup: pickup.trim(), p_goods_total: confirmedTotal! } : {}),
      ...(action === "dispatch" ? { p_distance: confirmedDistance! } : {}),
    };
    const fingerprint = JSON.stringify(input);
    if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, key: crypto.randomUUID() };
    inFlight.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("material_fulfilment_action", { ...input, p_request_key: retry.current.key });
      if (error) throw error;
      toast.success("Fulfilment update recorded");
      setEvidence(""); retry.current = undefined;
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : (error as { message?: string }).message ?? "Update failed. Retry with the same details."); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const unassigned = !order.delivery_status || ["unassigned", "broadcast"].includes(order.delivery_status);
  return <article className="rounded-xl border bg-card p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold">{order.merchant} · {order.company}</h2><p className="text-xs text-muted-foreground break-all">{order.id}</p></div><Badge variant="outline">{order.status.replace(/_/g, " ")}</Badge></div>
    <p className="text-sm">{order.mode.replace(/_/g, " ")} · Goods {order.goods_total.toFixed(2)} · Platform delivery {order.delivery_fee.toFixed(2)} (order currency)</p>
    <p className="text-sm">To: {order.delivery_address}</p>
    <ul className="text-sm list-disc pl-5">{order.items.map((item, i) => <li key={i}>{item.quantity} {item.unit} {item.name} @ {item.unit_price.toFixed(2)}</li>)}</ul>
    {order.reference && <p className="text-sm">Merchant reference: {order.reference}</p>}
    {order.delivery_status && <p className="text-sm">Delivery: {order.delivery_status.replace(/_/g, " ")} · Quoted distance: {order.distance_miles} miles</p>}
    {!["delivered", "cancelled", "collected"].includes(order.status) && <fieldset disabled={busy} className="space-y-3">
      {order.status === "submitted" && <div className="grid gap-3 sm:grid-cols-3">
        <div><Label htmlFor={`ref-${order.id}`}>Merchant order reference</Label><Input id={`ref-${order.id}`} value={reference} onChange={e => setReference(e.target.value)} maxLength={200} /></div>
        <div><Label htmlFor={`total-${order.id}`}>Confirmed goods total</Label><Input id={`total-${order.id}`} type="number" min="0" step="0.01" value={total} onChange={e => setTotal(e.target.value)} /></div>
        <div><Label htmlFor={`pickup-${order.id}`}>Confirmed pickup address</Label><Input id={`pickup-${order.id}`} value={pickup} onChange={e => setPickup(e.target.value)} maxLength={1000} /></div>
      </div>}
      {order.mode === "platform_driver" && order.status === "ready_for_pickup" && order.delivery_status === "unassigned" && <div><Label htmlFor={`distance-${order.id}`}>Verified route miles (must match quote)</Label><Input id={`distance-${order.id}`} type="number" min="0" max="1000" step="0.01" value={distance} onChange={e => setDistance(e.target.value)} /></div>}
      <div><Label htmlFor={`evidence-${order.id}`}>Confirmation evidence / reason</Label><Textarea id={`evidence-${order.id}`} value={evidence} onChange={e => setEvidence(e.target.value)} maxLength={2000} placeholder="Merchant contact/reference, confirmed stock and prices, pickup readiness or route verification source. Do not include payment-card data." /></div>
      <div className="flex flex-wrap gap-2">
        {order.status === "submitted" && <Button onClick={() => run("confirm")}>Record merchant confirmation</Button>}
        {order.status === "confirmed" && <Button onClick={() => run("ready")}>Record ready for pickup</Button>}
        {order.status === "ready_for_pickup" && order.mode === "platform_driver" && order.delivery_status === "unassigned" && <Button onClick={() => run("dispatch")}>Release to driver board</Button>}
        {order.status === "ready_for_pickup" && order.mode === "trade_collect" && <Button onClick={() => run("collected")}>Record collection</Button>}
        {["confirmed", "ready_for_pickup"].includes(order.status) && order.mode === "merchant_delivery" && <Button onClick={() => run("delivered")}>Record merchant delivery</Button>}
        {unassigned && <Button variant="destructive" onClick={() => run("cancel")}>Cancel request</Button>}
      </div>
    </fieldset>}
    <details><summary className="cursor-pointer text-sm">Confirmation history ({order.events.length})</summary><ul className="mt-3 space-y-2 text-sm">{order.events.map((e, i) => <li key={i}><strong>{e.action}</strong> · {new Date(e.created_at).toLocaleString()}<p className="whitespace-pre-wrap">{e.evidence}</p></li>)}</ul></details>
  </article>;
}

export default function AdminFulfilmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const result = await supabase.rpc("material_fulfilment_board");
      if (result.error) throw result.error;
      setOrders((result.data ?? []) as unknown as Order[]);
    } catch (e) { setError((e as { message?: string }).message ?? "Unable to load fulfilment requests"); setOrders([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <div className="space-y-5"><div className="flex justify-between gap-3"><h1 className="text-2xl font-bold">Material fulfilment</h1><Button variant="outline" disabled={loading} onClick={load}>Refresh</Button></div>
    <p className="text-muted-foreground">Record merchant-confirmed stock, prices and pickup readiness before dispatch. This records offline confirmation; it does not place a supplier purchase, collect payment or pay drivers. Changed prices or distances require a new agreed request.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p role="status">Loading requests…</p> : !error && !orders.length ? <p>No material requests yet.</p> : orders.map(order => <FulfilmentCard key={`${order.id}-${order.status}-${order.delivery_status}`} order={order} refresh={load} />)}
    <p className="text-xs text-muted-foreground">Shows up to 200 requests, with open requests first.</p>
  </div>;
}
