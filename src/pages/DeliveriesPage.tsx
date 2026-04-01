import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Truck, MapPin, User, Clock, Package, CheckCircle, AlertTriangle, Radio } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

type DeliveryRow = {
  id: string;
  status: DeliveryStatus;
  price_charged: number;
  driver_payout: number;
  platform_margin: number;
  estimated_distance_miles: number | null;
  driver_profile_id: string | null;
  assigned_at: string | null;
  delivered_at: string | null;
  created_at: string;
  material_order: {
    id: string;
    delivery_address: string;
    pickup_address: string | null;
    urgency: string;
    required_vehicle: string | null;
    delivery_mode: string;
    notes: string | null;
    merchant: { name: string } | null;
    job: { title: string; postcode: string } | null;
  } | null;
  driver_profile: {
    profile: { full_name: string } | null;
  } | null;
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof Truck }> = {
  unassigned: { label: "Unassigned", className: "bg-muted text-muted-foreground border-border", icon: Package },
  broadcast: { label: "Broadcasting", className: "bg-warning/15 text-warning border-warning/20", icon: Radio },
  assigned: { label: "Assigned", className: "bg-info/15 text-info border-info/20", icon: User },
  arrived_at_pickup: { label: "At Pickup", className: "bg-accent/15 text-accent border-accent/20", icon: MapPin },
  collected: { label: "Collected", className: "bg-accent/15 text-accent border-accent/20", icon: Package },
  en_route: { label: "En Route", className: "bg-info/15 text-info border-info/20", icon: Truck },
  delivered: { label: "Delivered", className: "bg-success/15 text-success border-success/20", icon: CheckCircle },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/20", icon: AlertTriangle },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/20", icon: AlertTriangle },
};

const urgencyBadge: Record<string, string> = {
  standard: "bg-muted text-muted-foreground border-border",
  priority: "bg-warning/10 text-warning border-warning/20",
  emergency: "bg-destructive/15 text-destructive border-destructive/20",
};

const DeliveriesPage = () => {
  const { user, roles } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const isDriver = roles.includes("driver");

  const fetchDeliveries = async () => {
    // The RLS handles what data the user can see
    const { data, error } = await supabase
      .from("deliveries")
      .select(`
        id, status, price_charged, driver_payout, platform_margin,
        estimated_distance_miles, driver_profile_id, assigned_at, delivered_at, created_at,
        material_orders!inner(
          id, delivery_address, pickup_address, urgency, required_vehicle, delivery_mode, notes,
          merchants(name),
          jobs(title, postcode)
        ),
        driver_profiles(
          profiles(full_name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Deliveries fetch error:", error);
      // Fallback: simpler query without joins that might fail
      const { data: simple } = await supabase
        .from("deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      // Map to expected shape
      const mapped = (simple ?? []).map((d: any) => ({
        ...d,
        material_order: null,
        driver_profile: null,
      }));
      setDeliveries(mapped);
    } else {
      // Normalize nested data
      const mapped = (data ?? []).map((d: any) => ({
        ...d,
        material_order: d.material_orders ?? null,
        driver_profile: d.driver_profiles ?? null,
      }));
      setDeliveries(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchDeliveries();

    // Realtime subscription
    const channel = supabase
      .channel("deliveries-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        fetchDeliveries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Driver: accept a broadcast delivery
  const acceptDelivery = async (deliveryId: string) => {
    if (!user) return;
    const { error } = await supabase.from("deliveries").update({
      driver_profile_id: user.id,
      status: "assigned" as DeliveryStatus,
      assigned_at: new Date().toISOString(),
    }).eq("id", deliveryId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Delivery accepted!");
      fetchDeliveries();
    }
  };

  // Driver: update delivery status
  const updateStatus = async (deliveryId: string, newStatus: DeliveryStatus) => {
    const updates: any = { status: newStatus };
    if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("deliveries").update(updates).eq("id", deliveryId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Status updated to ${statusConfig[newStatus]?.label ?? newStatus}`);
      fetchDeliveries();
    }
  };

  const filtered = filter === "all" ? deliveries : deliveries.filter(d => d.status === filter);

  const stats = {
    broadcasting: deliveries.filter(d => ["unassigned", "broadcast"].includes(d.status)).length,
    inTransit: deliveries.filter(d => ["assigned", "arrived_at_pickup", "collected", "en_route"].includes(d.status)).length,
    delivered: deliveries.filter(d => d.status === "delivered").length,
    totalValue: deliveries.reduce((sum, d) => sum + Number(d.price_charged), 0),
  };

  const nextStatusMap: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
    assigned: "arrived_at_pickup",
    arrived_at_pickup: "collected",
    collected: "en_route",
    en_route: "delivered",
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="glass-card p-4 h-20 animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="glass-card p-5 h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isDriver ? "Available Deliveries" : "Delivery Board"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isDriver ? "Accept and manage delivery jobs" : "Track all material deliveries across your jobs"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Broadcasting", value: stats.broadcasting, color: "text-warning" },
          { label: "In transit", value: stats.inTransit, color: "text-info" },
          { label: "Delivered", value: stats.delivered, color: "text-success" },
          { label: "Total value", value: `£${stats.totalValue.toFixed(2)}`, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "broadcast", "assigned", "collected", "en_route", "delivered"].map(s => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s === "all" ? "All" : statusConfig[s]?.label ?? s}
          </Button>
        ))}
      </div>

      {/* Delivery cards */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            {filter === "all" ? "No deliveries yet. Create a material order with platform delivery." : `No ${filter.replace(/_/g, " ")} deliveries.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const sc = statusConfig[d.status] || statusConfig.broadcast;
            const StatusIcon = sc.icon;
            const mo = d.material_order;
            const urgencyClass = urgencyBadge[mo?.urgency ?? "standard"] ?? urgencyBadge.standard;
            const driverName = (d.driver_profile as any)?.profiles?.full_name
              ?? (d.driver_profile as any)?.profile?.full_name
              ?? null;
            const nextStatus = nextStatusMap[d.status];

            return (
              <div key={d.id} className="glass-card p-5 hover:border-primary/20 transition-colors">
                <div className="flex flex-col gap-4">
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium text-foreground">{d.id.slice(0, 8)}</span>
                          <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                          {mo?.urgency && (
                            <Badge variant="outline" className={urgencyClass}>{mo.urgency}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {(mo?.merchant as any)?.name ?? "Unknown merchant"}
                          {mo?.required_vehicle ? ` — ${mo.required_vehicle.replace(/_/g, " ")}` : ""}
                          {mo?.job ? ` — ${(mo.job as any).title}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      {(mo?.pickup_address || mo?.delivery_address) && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {mo?.pickup_address ? `${mo.pickup_address.split(",")[0]} → ` : ""}
                            {mo?.delivery_address?.split(",")[0] ?? ""}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{driverName || "Awaiting driver"}</span>
                      </div>
                      <div className="font-semibold text-primary whitespace-nowrap">
                        £{Number(d.price_charged).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Driver actions */}
                  {isDriver && d.status === "broadcast" && !d.driver_profile_id && (
                    <div className="flex gap-2 pl-13">
                      <Button size="sm" onClick={() => acceptDelivery(d.id)} className="gap-1 font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" /> Accept Delivery
                      </Button>
                      <span className="text-sm text-muted-foreground self-center">
                        {d.estimated_distance_miles ? `${d.estimated_distance_miles} miles` : ""}
                        {" — Driver payout: £"}{Number(d.driver_payout).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Status progression */}
                  {isDriver && d.driver_profile_id === user?.id && nextStatus && (
                    <div className="flex gap-2 pl-13">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(d.id, nextStatus)}
                        className="gap-1"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Mark as {statusConfig[nextStatus]?.label ?? nextStatus}
                      </Button>
                    </div>
                  )}

                  {/* Notes */}
                  {mo?.notes && (
                    <div className="text-xs text-muted-foreground pl-13 italic">
                      {mo.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveriesPage;
