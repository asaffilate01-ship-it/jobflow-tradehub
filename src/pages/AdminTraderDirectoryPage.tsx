/* eslint-disable @typescript-eslint/no-explicit-any -- new tables are added by this release migration */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Download, ExternalLink, FileUp, Loader2, MapPin,
  RefreshCw, Search, ShieldCheck, Store, UserCheck, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { buildTraderImportTemplate, parseTraderImportCsv, type TraderImportRow } from "@/lib/trader-directory-import";

type DirectoryProfile = {
  id: string;
  business_name: string;
  trade: string;
  country_code: string;
  city: string;
  postcode_district: string;
  source_name: string;
  source_url: string;
  source_checked_at: string;
  verification_status: string;
  claim_status: string;
  is_active: boolean;
};

type Claim = {
  id: string;
  claimant_profile_id: string;
  role_at_business: string;
  registration_number: string | null;
  verification_method: string;
  message: string | null;
  status: string;
  created_at: string;
  trader_directory_profiles: Pick<DirectoryProfile, "id" | "business_name" | "trade" | "city" | "postcode_district"> | null;
  claimant?: { full_name: string; email: string | null };
};

export default function AdminTraderDirectoryPage() {
  const db = supabase as any;
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [preview, setPreview] = useState<TraderImportRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [profileResult, claimResult] = await Promise.all([
      db.from("trader_directory_profiles")
        .select("id,business_name,trade,country_code,city,postcode_district,source_name,source_url,source_checked_at,verification_status,claim_status,is_active")
        .order("imported_at", { ascending: false }).limit(500),
      db.from("trader_profile_claims")
        .select("id,claimant_profile_id,role_at_business,registration_number,verification_method,message,status,created_at,trader_directory_profiles(id,business_name,trade,city,postcode_district)")
        .order("created_at", { ascending: false }).limit(200),
    ]);
    if (profileResult.error) toast.error(profileResult.error.message);
    if (claimResult.error) toast.error(claimResult.error.message);

    const claimRows = (claimResult.data ?? []) as Claim[];
    const claimantIds = [...new Set(claimRows.map((claim) => claim.claimant_profile_id))];
    const { data: claimantRows } = claimantIds.length
      ? await db.from("profiles").select("id,full_name,email").in("id", claimantIds)
      : { data: [] };
    const claimantMap = new Map((claimantRows ?? []).map((profile: any) => [profile.id, profile]));
    setProfiles((profileResult.data ?? []) as DirectoryProfile[]);
    setClaims(claimRows.map((claim) => ({ ...claim, claimant: claimantMap.get(claim.claimant_profile_id) })));
    setLoading(false);
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((profile) => [
      profile.business_name, profile.trade, profile.city, profile.postcode_district, profile.source_name,
    ].some((value) => value.toLowerCase().includes(needle)));
  }, [profiles, search]);

  const readCsv = async (file?: File) => {
    if (!file) return;
    try {
      const rows = parseTraderImportCsv(await file.text());
      if (rows.length > 500) throw new Error("Import no more than 500 traders per batch");
      setPreview(rows);
      toast.success(`${rows.length} trader${rows.length === 1 ? "" : "s"} ready to import`);
    } catch (error) {
      setPreview([]);
      toast.error(error instanceof Error ? error.message : "Could not read this CSV");
    }
  };

  const importRows = async () => {
    if (!preview.length) return;
    setBusy("import");
    const { data, error } = await supabase.functions.invoke("trader-directory-import", { body: { rows: preview } });
    setBusy(null);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Import failed");
    toast.success(`${data.imported} directory profile${data.imported === 1 ? "" : "s"} imported`);
    setPreview([]);
    await load();
  };

  const reviewClaim = async (claim: Claim, approve: boolean) => {
    setBusy(claim.id);
    const result = approve
      ? await db.rpc("approve_trader_profile_claim", { p_claim_id: claim.id })
      : await db.rpc("reject_trader_profile_claim", { p_claim_id: claim.id, p_reason: "Ownership could not be verified" });
    setBusy(null);
    if (result.error) return toast.error(result.error.message);
    toast.success(approve ? "Claim approved; subscription is still required for marketplace leads" : "Claim rejected");
    await load();
  };

  const setVerification = async (profile: DirectoryProfile, status: "verified" | "unverified") => {
    setBusy(profile.id);
    const { error } = await db.from("trader_directory_profiles")
      .update({ verification_status: status, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    await load();
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([buildTraderImportTemplate()], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "craftvaro-trader-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2"><Store className="mr-1.5 h-3.5 w-3.5" />Marketplace growth</Badge>
          <h1 className="text-3xl font-bold">Trader directory & claims</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Import factual public records, hide contact details, verify ownership and convert claimed profiles into subscribing members.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <section className="glass-card-elevated space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">CSV import</h2><p className="text-xs text-muted-foreground">Use lawful sources, keep source URLs and import only factual business information. Never copy competitor reviews.</p></div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Template</Button>
        </div>
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-primary/50 hover:bg-primary/5">
          <FileUp className="h-7 w-7 text-primary" />
          <span className="mt-2 text-sm font-medium">Choose a CSV file</span>
          <span className="mt-1 text-xs text-muted-foreground">Maximum 500 records per batch</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void readCsv(event.target.files?.[0])} />
        </label>
        {preview.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm"><strong>{preview.length}</strong> validated rows ready. Contacts will be stored privately.</div>
            <Button onClick={() => void importRows()} disabled={busy === "import"}>{busy === "import" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import traders</Button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Pending ownership claims</h2><p className="text-xs text-muted-foreground">Approval creates the trader role and company, but does not bypass KYC or subscription.</p></div><Badge>{claims.filter((claim) => claim.status === "pending").length} pending</Badge></div>
        {!claims.some((claim) => claim.status === "pending") ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">No ownership claims need review.</div>
        ) : claims.filter((claim) => claim.status === "pending").map((claim) => (
          <div key={claim.id} className="glass-card grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{claim.trader_directory_profiles?.business_name}</h3><Badge variant="outline" className="capitalize">{claim.trader_directory_profiles?.trade.replace(/_/g, " ")}</Badge></div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{claim.claimant?.full_name || "Account holder"}</span><span>{claim.claimant?.email}</span><span>{claim.role_at_business}</span><span>{claim.verification_method.replace(/_/g, " ")}</span></div>
              {claim.registration_number && <p className="text-xs">Registration: <span className="font-mono">{claim.registration_number}</span></p>}
              {claim.message && <p className="text-sm text-muted-foreground">{claim.message}</p>}
            </div>
            <div className="flex gap-2"><Button onClick={() => void reviewClaim(claim, true)} disabled={busy === claim.id}><UserCheck className="mr-2 h-4 w-4" />Approve</Button><Button variant="outline" onClick={() => void reviewClaim(claim, false)} disabled={busy === claim.id}><XCircle className="mr-2 h-4 w-4" />Reject</Button></div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold">Imported directory</h2><p className="text-xs text-muted-foreground">Unclaimed profiles remain contact-free and cannot receive leads.</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search imports" className="pl-9" /></div></div>
        {loading ? <div className="glass-card h-40 animate-pulse" /> : filtered.length === 0 ? <div className="glass-card p-8 text-center text-sm text-muted-foreground">No imported traders found.</div> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((profile) => (
              <article key={profile.id} className="glass-card space-y-4 p-5">
                <div><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{profile.business_name}</h3><Badge variant={profile.claim_status === "claimed" ? "default" : "outline"} className="capitalize">{profile.claim_status}</Badge></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{profile.city}, {profile.postcode_district} · {profile.country_code}</p></div>
                <div className="flex flex-wrap gap-2"><Badge variant="secondary" className="capitalize">{profile.trade.replace(/_/g, " ")}</Badge><Badge variant="outline">{profile.source_name}</Badge>{profile.verification_status === "verified" && <Badge className="bg-success text-success-foreground"><ShieldCheck className="mr-1 h-3 w-3" />Source verified</Badge>}</div>
                <div className="flex flex-wrap gap-2 border-t pt-3"><Button size="sm" variant="outline" onClick={() => void setVerification(profile, profile.verification_status === "verified" ? "unverified" : "verified")} disabled={busy === profile.id}>{profile.verification_status === "verified" ? <XCircle className="mr-1.5 h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}{profile.verification_status === "verified" ? "Clear check" : "Mark checked"}</Button><Button asChild size="sm" variant="ghost"><a href={profile.source_url} target="_blank" rel="noreferrer">Source<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
