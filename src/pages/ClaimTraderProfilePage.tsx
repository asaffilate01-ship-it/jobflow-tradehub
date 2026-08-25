/* eslint-disable @typescript-eslint/no-explicit-any -- new tables are added by this release migration */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, ShieldCheck, Store, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import usePageMeta from "@/hooks/use-page-meta";

type DirectoryProfile = {
  id: string;
  business_name: string;
  trade: string;
  country_code: string;
  city: string;
  region: string | null;
  postcode_district: string;
  services: string[];
  languages: string[];
  factual_summary: string | null;
  registration_authority: string | null;
  verification_status: string;
  claim_status: string;
  source_name: string;
  source_checked_at: string;
};

export default function ClaimTraderProfilePage() {
  usePageMeta("Claim your trader profile", "Verify ownership of an imported Craftvaro trader directory profile.");
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const db = supabase as any;
  const [profile, setProfile] = useState<DirectoryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ role: "Owner", registration: "", method: "business_email", message: "" });

  useEffect(() => {
    const load = async () => {
      const { data } = await db.from("marketplace_directory_public").select("*").eq("id", id).maybeSingle();
      setProfile(data as DirectoryProfile | null);
      setLoading(false);
    };
    void load();
  }, [db, id]);

  const submit = async () => {
    if (!user || !profile) return;
    if (form.role.trim().length < 2) return toast.error("Tell us your role at the business");
    setSubmitting(true);
    const { error } = await db.from("trader_profile_claims").insert({
      directory_profile_id: profile.id,
      claimant_profile_id: user.id,
      role_at_business: form.role.trim(),
      registration_number: form.registration.trim() || null,
      verification_method: form.method,
      message: form.message.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message.includes("idx_one_open_directory_claim") ? "You already have a pending claim for this profile" : error.message);
    setSubmitted(true);
  };

  if (loading) return <div className="mx-auto max-w-3xl space-y-4"><div className="glass-card h-56 animate-pulse" /><div className="glass-card h-72 animate-pulse" /></div>;
  if (!profile) return <div className="glass-card mx-auto max-w-xl p-10 text-center"><h1 className="font-semibold">Profile unavailable</h1><p className="mt-2 text-sm text-muted-foreground">It may already have been claimed or removed.</p><Button asChild className="mt-5"><Link to="/marketplace">Back to marketplace</Link></Button></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to marketplace</Link>

      <section className="glass-card-elevated overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-secondary p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><Badge variant="outline" className="mb-3 bg-background/70"><Store className="mr-1.5 h-3.5 w-3.5" />Unclaimed directory profile</Badge><h1 className="text-2xl font-bold sm:text-3xl">{profile.business_name}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{profile.city}, {profile.postcode_district} · {profile.country_code}</p></div>
            <Badge variant="secondary" className="w-fit capitalize">{profile.trade.replace(/_/g, " ")}</Badge>
          </div>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          {profile.factual_summary && <p className="text-sm leading-relaxed text-muted-foreground">{profile.factual_summary}</p>}
          <div className="flex flex-wrap gap-2">{profile.services.map((service) => <Badge key={service} variant="outline">{service}</Badge>)}{profile.languages.map((language) => <Badge key={language} variant="secondary">{language}</Badge>)}</div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><div><strong>This is a factual directory record, not a Craftvaro member.</strong><p className="mt-1 text-xs text-muted-foreground">Contact details, quote requests and AI matching remain disabled until ownership, credentials and subscription are approved.</p></div></div>
          </div>
          <p className="text-xs text-muted-foreground">Source recorded as {profile.source_name}; facts last checked {new Date(profile.source_checked_at).toLocaleDateString("en-GB")}.</p>
        </div>
      </section>

      {submitted ? (
        <section className="glass-card p-8 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><h2 className="mt-3 text-xl font-semibold">Claim submitted</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">An administrator will verify your connection to the business. Once approved, complete KYC and activate a subscription before receiving leads.</p><Button asChild className="mt-5"><Link to="/marketplace">Return to marketplace</Link></Button></section>
      ) : (
        <section className="glass-card space-y-5 p-6 sm:p-8">
          <div><div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Claim this business</h2></div><p className="mt-1 text-sm text-muted-foreground">Use a method that lets our team independently verify your ownership or authority.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">Your role<Input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Owner, director, manager" /></label>
            <label className="space-y-1.5 text-sm font-medium">Registration number <span className="font-normal text-muted-foreground">(optional)</span><Input value={form.registration} onChange={(event) => setForm({ ...form, registration: event.target.value })} placeholder="Companies House or Handwerksrolle" /></label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">Preferred verification method<select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="business_email">Business email</option><option value="business_phone">Business telephone</option><option value="company_document">Company document</option><option value="regulator_record">Official regulator record</option></select></label>
          <label className="block space-y-1.5 text-sm font-medium">Additional information <span className="font-normal text-muted-foreground">(optional)</span><Textarea rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Explain how you are connected to this business." /></label>
          <Button size="lg" className="w-full" onClick={() => void submit()} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}Submit ownership claim</Button>
        </section>
      )}
    </div>
  );
}
