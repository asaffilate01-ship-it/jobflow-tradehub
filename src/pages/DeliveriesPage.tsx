import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, User } from "lucide-react";

type Delivery = {
  ref: string;
  merchant: string;
  pickup: string;
  dropoff: string;
  driver: string | null;
  vehicle: string;
  status: string;
  fee: string;
  urgency: string;
};

const deliveries: Delivery[] = [
  { ref: "D-1001", merchant: "Selco", pickup: "Selco Luton", dropoff: "LU3 Site", driver: null, vehicle: "Small van", status: "broadcast", fee: "£42.00", urgency: "priority" },
  { ref: "D-1002", merchant: "Wickes", pickup: "Wickes Dunstable", dropoff: "MK Site", driver: "A. Khan", vehicle: "Luton", status: "assigned", fee: "£67.50", urgency: "emergency" },
  { ref: "D-1003", merchant: "TradePoint", pickup: "B&Q Bedford", dropoff: "LU4 Site", driver: "J. Smith", vehicle: "Medium van", status: "collected", fee: "£38.20", urgency: "standard" },
  { ref: "D-1004", merchant: "Jewson", pickup: "Jewson MK", dropoff: "MK7 Site", driver: "R. Patel", vehicle: "Flatbed", status: "delivered", fee: "£95.00", urgency: "priority" },
  { ref: "D-1005", merchant: "Butterfields", pickup: "Butterfields Luton", dropoff: "LU2 Site", driver: null, vehicle: "Small van", status: "broadcast", fee: "£29.80", urgency: "standard" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  broadcast: { label: "Broadcasting", className: "bg-warning/15 text-warning border-warning/20 animate-pulse-glow" },
  assigned: { label: "Assigned", className: "bg-info/15 text-info border-info/20" },
  collected: { label: "Collected", className: "bg-accent/15 text-accent border-accent/20" },
  en_route: { label: "En route", className: "bg-info/15 text-info border-info/20" },
  delivered: { label: "Delivered", className: "bg-success/15 text-success border-success/20" },
};

const urgencyBadge: Record<string, string> = {
  standard: "bg-muted text-muted-foreground border-border",
  priority: "bg-warning/10 text-warning border-warning/20",
  emergency: "bg-destructive/15 text-destructive border-destructive/20",
};

const DeliveriesPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery Board</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all material deliveries across your jobs</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Broadcasting", value: deliveries.filter((d) => d.status === "broadcast").length, color: "text-warning" },
          { label: "In transit", value: deliveries.filter((d) => ["assigned", "collected", "en_route"].includes(d.status)).length, color: "text-info" },
          { label: "Delivered today", value: deliveries.filter((d) => d.status === "delivered").length, color: "text-success" },
          { label: "Total value", value: "£" + deliveries.reduce((sum, d) => sum + parseFloat(d.fee.replace("£", "")), 0).toFixed(2), color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Delivery cards */}
      <div className="space-y-3">
        {deliveries.map((d) => {
          const sc = statusConfig[d.status] || statusConfig.broadcast;
          return (
            <div key={d.ref} className="glass-card p-5 hover:border-primary/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-foreground">{d.ref}</span>
                      <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                      <Badge variant="outline" className={urgencyBadge[d.urgency]}>{d.urgency}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{d.merchant} — {d.vehicle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{d.pickup} → {d.dropoff}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{d.driver || "Awaiting driver"}</span>
                  </div>
                  <div className="font-semibold text-primary whitespace-nowrap">{d.fee}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeliveriesPage;
