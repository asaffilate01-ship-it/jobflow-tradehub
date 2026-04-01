import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/MotionWrapper";
import {
  Truck, MapPin, Clock, DollarSign, Package, CheckCircle,
  Navigation, AlertCircle, TrendingUp
} from "lucide-react";

const statusColors: Record<string, string> = {
  unassigned: "bg-secondary text-secondary-foreground",
  broadcast: "bg-warning/15 text-warning border-warning/20",
  assigned: "bg-info/15 text-info border-info/20",
  en_route: "bg-primary/15 text-primary border-primary/20",
  delivered: "bg-success/15 text-success border-success/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
};

const DriverDashboard = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: dp }, { data: dels }] = await Promise.all([
        supabase.from("driver_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
        supabase.from("deliveries").select("*, material_orders(delivery_address, pickup_address, goods_total, urgency)")
          .eq("driver_profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setDriverProfile(dp);
      setDeliveries(dels ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const active = deliveries.filter((d) => !["delivered", "failed", "cancelled"].includes(d.status));
  const completed = deliveries.filter((d) => d.status === "delivered");
  const totalEarnings = completed.reduce((sum: number, d: any) => sum + (d.driver_payout ?? 0), 0);

  const kpis = [
    { label: "Active Deliveries", value: active.length, icon: Truck, color: "text-primary" },
    { label: "Completed", value: completed.length, icon: CheckCircle, color: "text-success" },
    { label: "Earnings", value: `£${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Vehicle", value: driverProfile?.vehicle_type?.replace("_", " ") ?? "—", icon: Navigation, color: "text-info" },
  ];

  return (
    <div className="space-y-8">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your deliveries and earnings</p>
        </div>
      </FadeIn>

      {/* KPIs */}
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

      {/* Active deliveries */}
      <FadeIn delay={0.2}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Deliveries</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
            </div>
          ) : active.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-3">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No active deliveries right now.</p>
              <p className="text-xs text-muted-foreground">New delivery requests will appear here when available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((d) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${statusColors[d.status] ?? ""}`}>
                        {d.status.replace("_", " ")}
                      </Badge>
                      {d.material_orders?.urgency === "emergency" && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertCircle className="h-3 w-3" /> Urgent
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{d.material_orders?.delivery_address ?? "—"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Payout: <span className="font-medium text-foreground">£{d.driver_payout?.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                    View
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Recent completed */}
      <FadeIn delay={0.3}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Completed</h2>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {completed.slice(0, 5).map((d) => (
                <div key={d.id} className="glass-card p-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground truncate max-w-xs">{d.material_orders?.delivery_address ?? "Delivery"}</span>
                  </div>
                  <span className="font-medium text-foreground">£{d.driver_payout?.toFixed(2)}</span>
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
