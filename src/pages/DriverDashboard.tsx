import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import {
  Truck, MapPin, Clock, DollarSign, Package, CheckCircle,
  Navigation, AlertCircle, TrendingUp, Play, Square, Flag,
} from "lucide-react";

const statusColors: Record<string, string> = {
  unassigned: "bg-secondary text-secondary-foreground",
  broadcast: "bg-warning/15 text-warning border-warning/20",
  assigned: "bg-info/15 text-info border-info/20",
  arrived_at_pickup: "bg-accent/15 text-accent border-accent/20",
  collected: "bg-primary/15 text-primary border-primary/20",
  en_route: "bg-primary/15 text-primary border-primary/20",
  delivered: "bg-success/15 text-success border-success/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
};

const statusFlow = ["broadcast", "assigned", "arrived_at_pickup", "collected", "en_route", "delivered"];

const nextStatusMap: Record<string, { next: string; label: string; icon: any }> = {
  assigned: { next: "arrived_at_pickup", label: "Arrived at Pickup", icon: MapPin },
  arrived_at_pickup: { next: "collected", label: "Collected", icon: Package },
  collected: { next: "en_route", label: "En Route", icon: Truck },
  en_route: { next: "delivered", label: "Mark Delivered", icon: Flag },
};

const DriverDashboard = () => {
  const { user } = useAuth();
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [broadcastDeliveries, setBroadcastDeliveries] = useState<any[]>([]);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const [{ data: dp }, { data: mine }, { data: available }] = await Promise.all([
      supabase.from("driver_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
      supabase.from("deliveries")
        .select("*, material_orders(delivery_address, pickup_address, goods_total, urgency, merchants(name))")
        .eq("driver_profile_id", user.id)
        .order("created_at", { ascending: false }).limit(30),
      supabase.from("deliveries")
        .select("*, material_orders(delivery_address, pickup_address, goods_total, urgency, required_vehicle, merchants(name))")
        .in("status", ["unassigned", "broadcast"])
        .is("driver_profile_id", null)
        .order("created_at", { ascending: false }).limit(20),
    ]);
    setDriverProfile(dp);
    setMyDeliveries(mine ?? []);
    setBroadcastDeliveries(available ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const acceptDelivery = async (deliveryId: string) => {
    if (!user) return;
    setAccepting(deliveryId);
    const { error } = await supabase.from("deliveries")
      .update({ driver_profile_id: user.id, status: "assigned", assigned_at: new Date().toISOString() })
      .eq("id", deliveryId);
    if (error) { toast.error(error.message); }
    else {
      await supabase.from("delivery_events").insert({
        delivery_id: deliveryId, event_type: "accepted", created_by: user.id, notes: "Driver accepted delivery",
      });
      toast.success("Delivery accepted!");
      fetchData();
    }
    setAccepting(null);
  };

  const updateStatus = async (deliveryId: string, nextStatus: string) => {
    if (!user) return;
    setUpdating(deliveryId);
    const updateData: any = { status: nextStatus };
    if (nextStatus === "delivered") updateData.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("deliveries").update(updateData).eq("id", deliveryId);
    if (error) { toast.error(error.message); }
    else {
      await supabase.from("delivery_events").insert({
        delivery_id: deliveryId, event_type: nextStatus, created_by: user.id,
      });
      toast.success(`Status updated to ${nextStatus.replace(/_/g, " ")}`);
      fetchData();
    }
    setUpdating(null);
  };

  const active = myDeliveries.filter(d => !["delivered", "failed", "cancelled"].includes(d.status));
  const completed = myDeliveries.filter(d => d.status === "delivered");
  const totalEarnings = completed.reduce((sum: number, d: any) => sum + (d.driver_payout ?? 0), 0);

  const kpis = [
    { label: "Available Jobs", value: broadcastDeliveries.length, icon: Package, color: "text-warning" },
    { label: "Active Deliveries", value: active.length, icon: Truck, color: "text-primary" },
    { label: "Completed", value: completed.length, icon: CheckCircle, color: "text-success" },
    { label: "Earnings", value: `£${totalEarnings.toFixed(0)}`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Accept deliveries, track progress, and manage earnings</p>
        </div>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <StaggerItem key={label}>
            <div className="glass-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${color}`} />
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <div className="text-2xl font-bold text-foreground capitalize">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Available deliveries (broadcast) */}
      <FadeIn delay={0.1}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            Available Deliveries
          </h2>
          {loading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="glass-card h-28 animate-pulse" />)}</div>
          ) : broadcastDeliveries.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-3">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No deliveries available right now.</p>
              <p className="text-xs text-muted-foreground">New jobs will appear here when traders place orders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcastDeliveries.map(d => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 space-y-3 border-warning/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-warning/15 text-warning text-xs">Broadcast</Badge>
                        <Badge variant="outline" className="text-xs">{d.material_orders?.urgency}</Badge>
                        {d.material_orders?.required_vehicle && (
                          <Badge variant="outline" className="text-xs capitalize">{d.material_orders.required_vehicle.replace(/_/g, " ")}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{(d.material_orders?.merchants as any)?.name}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        {d.material_orders?.pickup_address && (
                          <div className="flex items-start gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
                            <span><span className="text-xs font-medium">Pickup:</span> {d.material_orders.pickup_address}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                          <span><span className="text-xs font-medium">Deliver:</span> {d.material_orders?.delivery_address}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {d.estimated_distance_miles && (
                          <span className="text-muted-foreground flex items-center gap-1"><Navigation className="h-3 w-3" />{d.estimated_distance_miles} miles</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <div className="text-2xl font-bold text-primary">£{Number(d.driver_payout).toFixed(2)}</div>
                      <Button size="sm" className="gap-1.5 font-semibold w-full" onClick={() => acceptDelivery(d.id)} disabled={accepting === d.id}>
                        <Play className="h-3.5 w-3.5" />
                        {accepting === d.id ? "Accepting…" : "Accept"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Active deliveries */}
      <FadeIn delay={0.2}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Active Deliveries</h2>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active deliveries. Accept one above to get started.</p>
          ) : (
            <div className="space-y-3">
              {active.map(d => {
                const next = nextStatusMap[d.status];
                const currentIdx = statusFlow.indexOf(d.status);
                return (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${statusColors[d.status] ?? ""}`}>{d.status.replace(/_/g, " ")}</Badge>
                          {d.material_orders?.urgency === "emergency" && (
                            <Badge variant="destructive" className="text-[10px] gap-1"><AlertCircle className="h-3 w-3" />Urgent</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{(d.material_orders?.merchants as any)?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{d.material_orders?.delivery_address ?? "—"}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-primary">£{Number(d.driver_payout).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-1">
                      {statusFlow.slice(1).map((s, i) => {
                        const done = i < currentIdx;
                        const active = i === currentIdx;
                        return (
                          <div key={s} className="flex-1 flex items-center gap-1">
                            <div className={`h-1.5 flex-1 rounded-full ${done ? "bg-primary" : active ? "bg-primary/40" : "bg-border"}`} />
                          </div>
                        );
                      })}
                    </div>

                    {next && (
                      <Button size="sm" className="gap-1.5 font-semibold" onClick={() => updateStatus(d.id, next.next)} disabled={updating === d.id}>
                        <next.icon className="h-3.5 w-3.5" />
                        {updating === d.id ? "Updating…" : next.label}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Completed */}
      <FadeIn delay={0.3}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Completed</h2>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {completed.slice(0, 10).map(d => (
                <div key={d.id} className="glass-card p-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground truncate max-w-xs">{d.material_orders?.delivery_address ?? "Delivery"}</span>
                    <span className="text-xs text-muted-foreground">{d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : ""}</span>
                  </div>
                  <span className="font-medium text-foreground">£{Number(d.driver_payout).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
};

export default DriverDashboard;
