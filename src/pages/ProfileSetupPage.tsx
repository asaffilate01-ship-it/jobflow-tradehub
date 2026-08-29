import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Wrench, TruckIcon, ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import type { Database } from "@/integrations/supabase/types";
import { usePageMeta } from "@/hooks/use-page-meta";

type TradeType = Database["public"]["Enums"]["trade_type"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];

const trades: TradeType[] = [
  "builder", "plumber", "electrician", "gas_engineer", "tiler",
  "carpenter", "bricklayer", "roofer", "plasterer", "painter", "landscaper", "other",
];

const vehicles: VehicleType[] = ["car", "small_van", "medium_van", "large_van", "luton", "flatbed"];

const ProfileSetupPage = () => {
  usePageMeta("Complete your profile", "Finish setting up your Craftvaro profile to get started.");
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
  const [serviceAreas, setServiceAreas] = useState("");
  const [acceptingWork, setAcceptingWork] = useState(true);
  const [emergencyWork, setEmergencyWork] = useState(false);

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
      const { data: existingCompany } = await supabase
        .from("trade_companies")
        .select("id")
        .eq("owner_profile_id", user.id)
        .limit(1)
        .maybeSingle();
      let companyId = existingCompany?.id;
      if (companyId) {
        const { error: companyUpdateError } = await supabase
          .from("trade_companies")
          .update({ legal_name: companyName || "My Company" })
          .eq("id", companyId);
        if (companyUpdateError) toast.error(companyUpdateError.message);
      } else {
        const { data: newCompany, error: compErr } = await supabase.from("trade_companies").insert({
          legal_name: companyName || "My Company",
          owner_profile_id: user.id,
        }).select("id").single();
        if (compErr) toast.error(compErr.message);
        companyId = newCompany?.id;
      }

      if (companyId) {
        const prefixes = serviceAreas
          .split(",")
          .map((area) => area.trim().toUpperCase().replace(/\s+/g, ""))
          .filter(Boolean)
          .slice(0, 30);
        const { error: repairProfileError } = await supabase
          .from("trade_repair_profiles")
          .upsert({
            trade_company_id: companyId,
            trade: tradeSpecialism,
            service_postcode_prefixes: prefixes,
            available: acceptingWork,
            emergency_work: emergencyWork,
          }, { onConflict: "trade_company_id,trade" });
        if (repairProfileError) toast.error(repairProfileError.message);
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
    <div className="auth-shell">
      <div className="glass-card-elevated p-8 w-full max-w-lg space-y-6 page-enter">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex">
            <Logo variant="full" height={42} priority className="mx-auto" />
          </Link>
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
                <label className="text-sm font-medium text-muted-foreground">Postcode areas served</label>
                <Input placeholder="NW6, NW3, W9" value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Comma-separated postcode districts or areas. Only subscribed, verified traders are matched.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <input type="checkbox" checked={acceptingWork} onChange={(e) => setAcceptingWork(e.target.checked)} />
                  Accepting work now
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <input type="checkbox" checked={emergencyWork} onChange={(e) => setEmergencyWork(e.target.checked)} />
                  Emergency call-outs
                </label>
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
