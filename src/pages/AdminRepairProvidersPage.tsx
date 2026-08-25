import { useEffect, useState } from "react";
import { ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RepairProfile = Database["public"]["Tables"]["trade_repair_profiles"]["Row"] & {
  company_name: string;
  owner_name: string;
  subscription_active: boolean;
};

const AdminRepairProvidersPage = () => {
  const [providers, setProviders] = useState<RepairProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: repairProfiles, error } = await supabase
      .from("trade_repair_profiles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const companyIds = (repairProfiles ?? []).map((profile) => profile.trade_company_id);
    const { data: companies } = companyIds.length
      ? await supabase.from("trade_companies").select("id,owner_profile_id,legal_name,trading_name").in("id", companyIds)
      : { data: [] };
    const ownerIds = (companies ?? []).map((company) => company.owner_profile_id);
    const [{ data: owners }, { data: subscribers }] = await Promise.all([
      ownerIds.length ? supabase.from("profiles").select("id,full_name,company_name").in("id", ownerIds) : Promise.resolve({ data: [] }),
      ownerIds.length ? supabase.from("subscribers").select("user_id,tier,subscribed,subscription_end").in("user_id", ownerIds) : Promise.resolve({ data: [] }),
    ]);
    const now = Date.now();

    setProviders((repairProfiles ?? []).map((profile) => {
      const company = (companies ?? []).find((item) => item.id === profile.trade_company_id);
      const owner = (owners ?? []).find((item) => item.id === company?.owner_profile_id);
      const subscription = (subscribers ?? []).find((item) => item.user_id === company?.owner_profile_id);
      return {
        ...profile,
        company_name: company?.trading_name || company?.legal_name || owner?.company_name || "Unnamed company",
        owner_name: owner?.full_name || "Unknown owner",
        subscription_active: Boolean(
          subscription?.subscribed &&
          subscription.tier !== "free" &&
          (!subscription.subscription_end || new Date(subscription.subscription_end).getTime() > now),
        ),
      };
    }));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const setField = <K extends keyof RepairProfile>(id: string, key: K, value: RepairProfile[K]) => {
    setProviders((current) => current.map((provider) => provider.id === id ? { ...provider, [key]: value } : provider));
  };

  const save = async (provider: RepairProfile) => {
    setSaving(provider.id);
    const { error } = await supabase.from("trade_repair_profiles").update({
      capability_verified: provider.capability_verified,
      insurance_verified: provider.insurance_verified,
      insurance_expires_at: provider.insurance_expires_at || null,
      credential_type: provider.credential_type || null,
      credential_number: provider.credential_number || null,
      credential_verified: provider.credential_verified,
      credential_expires_at: provider.credential_expires_at || null,
    }).eq("id", provider.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Provider verification saved");
  };

  if (loading) return <div className="glass-card h-64 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-6 w-6 text-primary" />Repair provider verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verify capability, insurance and regulated credentials. Only active subscribers can be matched.</p>
      </div>

      {providers.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">No repair provider profiles yet.</div>
      ) : providers.map((provider) => (
        <div key={provider.id} className="glass-card space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{provider.company_name}</h2>
              <p className="text-xs text-muted-foreground">{provider.owner_name} Â· {provider.trade.replace(/_/g, " ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">Coverage: {provider.service_postcode_prefixes.join(", ") || "Not configured"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={provider.subscription_active ? "default" : "destructive"}>{provider.subscription_active ? "Active subscriber" : "Not subscribed"}</Badge>
              <Badge variant={provider.available ? "secondary" : "outline"}>{provider.available ? "Accepting work" : "Unavailable"}</Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={provider.capability_verified} onChange={(event) => setField(provider.id, "capability_verified", event.target.checked)} />
              Capability verified
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={provider.insurance_verified} onChange={(event) => setField(provider.id, "insurance_verified", event.target.checked)} />
              Insurance verified
            </label>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Insurance expiry</label>
              <Input type="date" value={provider.insurance_expires_at ?? ""} onChange={(event) => setField(provider.id, "insurance_expires_at", event.target.value || null)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Credential type</label><Input value={provider.credential_type ?? ""} placeholder="Gas Safe / NICEIC" onChange={(event) => setField(provider.id, "credential_type", event.target.value)} /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Credential number</label><Input value={provider.credential_number ?? ""} onChange={(event) => setField(provider.id, "credential_number", event.target.value)} /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Credential expiry</label><Input type="date" value={provider.credential_expires_at ?? ""} onChange={(event) => setField(provider.id, "credential_expires_at", event.target.value || null)} /></div>
            <label className="flex items-center gap-2 self-end rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={provider.credential_verified} onChange={(event) => setField(provider.id, "credential_verified", event.target.checked)} />
              Credential verified
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void save(provider)} disabled={saving === provider.id} className="gap-2"><Wrench className="h-4 w-4" />{saving === provider.id ? "Savingâ€¦" : "Save verification"}</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminRepairProvidersPage;
