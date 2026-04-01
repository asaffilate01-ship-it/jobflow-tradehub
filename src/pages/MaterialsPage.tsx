import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Calculator, Truck } from "lucide-react";

const merchants = ["TradePoint / B&Q", "Wickes", "Selco", "Butterfields", "Jewson"];
const deliveryModes = [
  { value: "platform_driver", label: "Platform driver (fastest)" },
  { value: "merchant_delivery", label: "Merchant delivery" },
  { value: "trade_collect", label: "Collect yourself" },
];
const vehicles = [
  { value: "car", label: "Car" },
  { value: "small_van", label: "Small van" },
  { value: "medium_van", label: "Medium van" },
  { value: "luton", label: "Luton" },
  { value: "flatbed", label: "Flatbed" },
];
const urgencies = [
  { value: "standard", label: "Standard" },
  { value: "priority", label: "Priority" },
  { value: "emergency", label: "Emergency" },
];

const rateData: Record<string, { base: number; perMile: number; manpower: number; markup: number }> = {
  car: { base: 8, perMile: 1.2, manpower: 0, markup: 15 },
  small_van: { base: 15, perMile: 1.5, manpower: 10, markup: 20 },
  medium_van: { base: 22, perMile: 1.9, manpower: 12, markup: 22 },
  luton: { base: 40, perMile: 3.2, manpower: 20, markup: 30 },
  flatbed: { base: 55, perMile: 3.8, manpower: 25, markup: 35 },
};

const urgencyMultiplier: Record<string, number> = {
  standard: 1,
  priority: 1.15,
  emergency: 1.3,
};

const MaterialsPage = () => {
  const [vehicle, setVehicle] = useState("small_van");
  const [urgency, setUrgency] = useState("priority");
  const [miles, setMiles] = useState(8);
  const [manpower, setManpower] = useState(2);

  const pricing = useMemo(() => {
    const rate = rateData[vehicle] || rateData.small_van;
    const subtotal = (rate.base + miles * rate.perMile) * (urgencyMultiplier[urgency] || 1);
    const manpowerCost = Math.max(0, manpower - 1) * rate.manpower;
    const markupCost = subtotal * (rate.markup / 100);
    const total = subtotal + manpowerCost + markupCost;
    const driverPayout = total * 0.75;
    const platformMargin = total - driverPayout;
    return { total, driverPayout, platformMargin, subtotal, manpowerCost, markupCost };
  }, [vehicle, urgency, miles, manpower]);

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Materials & Delivery</h1>
        <p className="text-sm text-muted-foreground mt-1">Order materials and get them delivered to site</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Order form */}
        <div className="lg:col-span-3 glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Create material order</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Merchant</label>
              <select className={selectClass}>
                {merchants.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Delivery mode</label>
              <select className={selectClass}>
                {deliveryModes.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Trade account ref</label>
              <Input placeholder="ACC-12345" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Items (one per line)</label>
            <textarea
              rows={6}
              defaultValue={"20 x Cement bags\n12 x CLS timber 4x2\n10 x Plasterboard\n5 x Bag of sand"}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none font-mono"
            />
          </div>

          <Button className="font-semibold gap-2">
            <Package className="h-4 w-4" />
            Submit material order
          </Button>
        </div>

        {/* Price calculator */}
        <div className="lg:col-span-2 glass-card p-6 space-y-5 glow">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Delivery price preview</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Vehicle</label>
              <select className={selectClass} value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                {vehicles.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Urgency</label>
              <select className={selectClass} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                {urgencies.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Distance (miles)</label>
              <Input type="number" value={miles} onChange={(e) => setMiles(Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Manpower</label>
              <Input type="number" value={manpower} onChange={(e) => setManpower(Number(e.target.value))} min={1} max={4} />
            </div>
          </div>

          {/* Price breakdown */}
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
                <span className="text-sm font-medium text-muted-foreground">Estimated delivery fee</span>
                <span className="text-3xl font-bold text-gradient">£{pricing.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground/70 pt-1">
              <span>Driver payout: £{pricing.driverPayout.toFixed(2)}</span>
              <span>Platform margin: £{pricing.platformMargin.toFixed(2)}</span>
            </div>
          </div>

          <Button variant="secondary" className="w-full gap-2 font-semibold">
            <Truck className="h-4 w-4" />
            Request delivery
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaterialsPage;
