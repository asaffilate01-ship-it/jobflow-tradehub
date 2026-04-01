import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Truck, User, Wrench, TruckIcon, ArrowRight, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TradeType = Database["public"]["Enums"]["trade_type"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];

const trades: TradeType[] = [
  "builder", "plumber", "electrician", "gas_engineer", "tiler",
  "carpenter", "bricklayer", "roofer", "plasterer", "painter", "landscaper", "other",
];

const vehicles: VehicleType[] = ["car", "small_van", "medium_van", "large_van", "luton", "flatbed"];

const ProfileSetupPage = () => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Trade fields
  const [companyName, setCompanyName] = useState("");
  const [tradeSpecialism, setTradeSpecialism] = useState<TradeType>("builder");
  const [servicesDesc, setServicesDesc] = useState("");
  const [serviceRadius, setServiceRadius] = useState(25);
  const [yearsExp, setYearsExp] = useState(5);
  const [tradeBodies, setTradeBodies] = useState("");

  // Driver fields
  const [vehicleType, setVehicleType] = useState<VehicleType>("small_van");
  const [vehicleReg, setVehicleReg] = useState("");

  // Common
  const [phone, setPhone] = useState("");

  const isTrade = roles.includes("trade");
  const isDriver = roles.includes("driver");
  const isCustomer = roles.includes("customer");

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Update profile
    const profileUpdate: Record<string, any> = { phone };
    if (isTrade) {
      profileUpdate.company_name = companyName;
      profileUpdate.trade_specialism = tradeSpecialism;
      profileUpdate.services_description = servicesDesc;
      profileUpdate.service_radius_miles = serviceRadius;
      profileUpdate.years_experience = yearsExp;
      profileUpdate.trade_bodies = tradeBodies.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    if (profileErr) {
      toast.error(profileErr.message);
      setLoading(false);
      return;
    }

    // Create trade company
    if (isTrade) {
      const { error: compErr } = await supabase.from("trade_companies").insert({
        legal_name: companyName || "My Company",
        owner_profile_id: user.id,
      });
      if (compErr && !compErr.message.includes("duplicate")) {
        toast.error(compErr.message);
      }
    }

    // Create driver profile
    if (isDriver) {
      const { error: driverErr } = await supabase.from("driver_profiles").insert({
        profile_id: user.id,
        vehicle_type: vehicleType,
        vehicle_reg: vehicleReg,
      });
      if (driverErr && !driverErr.message.includes("duplicate")) {
        toast.error(driverErr.message);
      }
    }

    toast.success("Profile setup complete!");
    setLoading(false);

    if (isTrade) navigate("/dashboard");
    else if (isDriver) navigate("/deliveries");
    else navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card p-8 w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Complete your profile
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTrade
              ? "Set up your trade profile so customers can find you"
              : isDriver
              ? "Set up your driver profile to start accepting delivery jobs"
              : "Add a few details to get started"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Phone number</label>
            <Input placeholder="07xxx xxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {isTrade && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Company name</label>
                <Input placeholder="Smith & Sons Builders Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Primary trade</label>
                  <select className={selectClass} value={tradeSpecialism} onChange={(e) => setTradeSpecialism(e.target.value as TradeType)}>
                    {trades.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Years experience</label>
                  <Input type="number" value={yearsExp} onChange={(e) => setYearsExp(Number(e.target.value))} min={0} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Services offered</label>
                <textarea
                  rows={3}
                  value={servicesDesc}
                  onChange={(e) => setServicesDesc(e.target.value)}
                  placeholder="Describe the services you provide..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Service radius (miles)</label>
                  <Input type="number" value={serviceRadius} onChange={(e) => setServiceRadius(Number(e.target.value))} min={1} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Trade bodies (comma-separated)</label>
                  <Input placeholder="Gas Safe, NICEIC" value={tradeBodies} onChange={(e) => setTradeBodies(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {isDriver && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Vehicle type</label>
                <select className={selectClass} value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
                  {vehicles.map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Vehicle reg</label>
                <Input placeholder="AB12 CDE" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} required />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full font-semibold gap-2" disabled={loading}>
            {loading ? "Saving…" : "Complete setup"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
