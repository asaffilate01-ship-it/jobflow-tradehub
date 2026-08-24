/* eslint-disable @typescript-eslint/no-explicit-any -- generated Supabase types are updated after the new migration is applied */
import { useCallback, useEffect, useState } from "react";
import { Clock3, Eye, Image, Loader2, MapPin, ShieldCheck, Siren, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Invite = {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  scoped_payload: {
    title?: string;
    description?: string;
    postcode_sector?: string;
    trade?: string;
    risk_level?: string;
    estimated_cost?: { minimum?: number; maximum?: number };
  };
};

type OfferDraft = {
  offerType: string;
  labour: string;
  materials: string;
  etaMinutes: string;
  durationMinutes: string;
  warrantyDays: string;
  assumptions: string;
  exclusions: string;
  notes: string;
};

const emptyOffer: OfferDraft = {
  offerType: "fixed",
  labour: "",
  materials: "0",
  etaMinutes: "60",
  durationMinutes: "120",
  warrantyDays: "30",
  assumptions: "",
  exclusions: "",
  notes: "",
};

export default function RepairOpportunitiesPage() {
  usePageMeta("Repair opportunities", "Private, verified repair opportunities matched to your trade and service area.");
  const { user } = useAuth();
  const db = supabase as any;
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInvite, setActiveInvite] = useState<string | null>(null);
  const [offer, setOffer] = useState<OfferDraft>(emptyOffer);
  const [media, setMedia] = useState<Record<string, Array<{ id: string; media_type: string; signed_url: string }>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: companies, error: companyError } = await db.from("trade_companies").select("id").eq("owner_profile_id", user.id);
    if (companyError) toast.error(companyError.message);
    const companyIds = (companies ?? []).map((company: any) => company.id);
    if (!companyIds.length) {
      setInvites([]);
      setLoading(false);
      return;
    }
    const { data, error } = await db.from("repair_dispatch_invites").select("id, job_id, status, created_at, scoped_payload").in("trade_company_id", companyIds).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setInvites((data ?? []) as Invite[]);
    setLoading(false);
  }, [db, user]);

  useEffect(() => { void load(); }, [load]);

  const viewEvidence = async (inviteId: string) => {
    setBusy(inviteId);
    const { data, error } = await supabase.functions.invoke("repair-provider-media", { body: { invite_id: inviteId } });
    setBusy(null);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Evidence could not be opened");
    setMedia((current) => ({ ...current, [inviteId]: data.media ?? [] }));
    await load();
  };

  const submitOffer = async (inviteId: string) => {
    if (!offer.labour || Number(offer.labour) < 0 || Number(offer.etaMinutes) <= 0) return toast.error("Add a valid price and arrival time");
    setBusy(inviteId);
    const toList = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
    const { error } = await db.rpc("submit_repair_offer", {
      p_invite_id: inviteId,
      p_offer_type: offer.offerType,
      p_labour: Number(offer.labour),
      p_materials: Number(offer.materials || 0),
      p_eta_minutes: Number(offer.etaMinutes),
      p_duration_minutes: Number(offer.durationMinutes),
      p_assumptions: toList(offer.assumptions),
      p_exclusions: toList(offer.exclusions),
      p_warranty_days: Number(offer.warrantyDays || 0),
      p_notes: offer.notes.trim() || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Offer sent. The exact address stays hidden until the owner accepts.");
    setActiveInvite(null);
    setOffer(emptyOffer);
    await load();
  };

  const decline = async (inviteId: string) => {
    setBusy(inviteId);
    const { error } = await db.rpc("decline_repair_invite", { p_invite_id: inviteId });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Opportunity declined");
    await load();
  };

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="glass-card h-40 animate-pulse" />)}</div>;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><Badge variant="outline" className="mb-2 gap-1.5"><Siren className="h-3.5 w-3.5" />Repair network</Badge><h1 className="text-3xl font-bold">Repair opportunities</h1><p className="mt-1 text-sm text-muted-foreground">Private requests matched to your verified capabilities. Up to four providers are invited.</p></div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" />Full address only after award</div>
      </div>

      {!invites.length ? (
        <div className="glass-card p-10 text-center"><Wrench className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-3 font-semibold">No matched repairs yet</h2><p className="mt-1 text-sm text-muted-foreground">Complete your repair capability, insurance and service-area profile to receive suitable work.</p></div>
      ) : invites.map((invite) => {
        const payload = invite.scoped_payload ?? {};
        const canRespond = invite.status === "invited" || invite.status === "viewed";
        const evidence = media[invite.id];
        return (
          <section key={invite.id} className="glass-card overflow-hidden">
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{payload.title ?? "Repair request"}</h2><Badge variant="outline" className="capitalize">{invite.status.replace("_", " ")}</Badge>{payload.risk_level && <Badge variant="secondary" className="capitalize">{payload.risk_level} risk</Badge>}</div><div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{payload.postcode_sector ?? "Approximate area"}</span><span className="flex items-center gap-1 capitalize"><Wrench className="h-3.5 w-3.5" />{payload.trade?.replace("_", " ")}</span><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Sent {new Date(invite.created_at).toLocaleString("en-GB")}</span></div></div>
                {payload.estimated_cost && <div className="text-right"><div className="text-xs text-muted-foreground">AI indication</div><div className="font-bold">Â£{payload.estimated_cost.minimum ?? "?"}â€“Â£{payload.estimated_cost.maximum ?? "?"}</div></div>}
              </div>
              <p className="text-sm text-muted-foreground">{payload.description}</p>

              {evidence ? (
                evidence.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{evidence.map((item) => item.media_type === "video" ? <video key={item.id} src={item.signed_url} controls className="aspect-square w-full rounded-xl border object-cover" /> : <img key={item.id} src={item.signed_url} alt="Redacted repair evidence" className="aspect-square w-full rounded-xl border object-cover" />)}</div> : <p className="text-xs text-muted-foreground">No redacted evidence is available yet.</p>
              ) : canRespond && <Button variant="outline" size="sm" className="gap-2" disabled={busy === invite.id} onClick={() => viewEvidence(invite.id)}>{busy === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}View safe evidence</Button>}

              {canRespond && activeInvite !== invite.id && <div className="flex flex-wrap gap-2"><Button onClick={() => setActiveInvite(invite.id)}>Make an offer</Button><Button variant="outline" onClick={() => decline(invite.id)} disabled={busy === invite.id}>Decline</Button></div>}
            </div>

            {canRespond && activeInvite === invite.id && (
              <div className="border-t bg-secondary/20 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2"><Image className="h-4 w-4 text-primary" /><h3 className="font-semibold">Price and arrival offer</h3></div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="space-y-1 text-xs font-medium">Offer type<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={offer.offerType} onChange={(event) => setOffer({ ...offer, offerType: event.target.value })}><option value="fixed">Fixed price</option><option value="estimate">Estimate</option><option value="diagnostic_callout">Diagnostic call-out</option></select></label>
                  <label className="space-y-1 text-xs font-medium">Labour (Â£)<Input type="number" min="0" value={offer.labour} onChange={(event) => setOffer({ ...offer, labour: event.target.value })} /></label>
                  <label className="space-y-1 text-xs font-medium">Materials (Â£)<Input type="number" min="0" value={offer.materials} onChange={(event) => setOffer({ ...offer, materials: event.target.value })} /></label>
                  <label className="space-y-1 text-xs font-medium">Arrival in minutes<Input type="number" min="1" value={offer.etaMinutes} onChange={(event) => setOffer({ ...offer, etaMinutes: event.target.value })} /></label>
                  <label className="space-y-1 text-xs font-medium">Expected duration (minutes)<Input type="number" min="1" value={offer.durationMinutes} onChange={(event) => setOffer({ ...offer, durationMinutes: event.target.value })} /></label>
                  <label className="space-y-1 text-xs font-medium">Warranty (days)<Input type="number" min="0" value={offer.warrantyDays} onChange={(event) => setOffer({ ...offer, warrantyDays: event.target.value })} /></label>
                  <label className="space-y-1 text-xs font-medium sm:col-span-1 lg:col-span-3">Assumptions (one per line)<Textarea rows={2} value={offer.assumptions} onChange={(event) => setOffer({ ...offer, assumptions: event.target.value })} /></label>
                  <label className="space-y-1 text-xs font-medium sm:col-span-1 lg:col-span-3">Exclusions (one per line)<Textarea rows={2} value={offer.exclusions} onChange={(event) => setOffer({ ...offer, exclusions: event.target.value })} /></label>
                  <label className="space-y-1 text-xs font-medium sm:col-span-2 lg:col-span-3">Message to owner<Textarea rows={3} value={offer.notes} onChange={(event) => setOffer({ ...offer, notes: event.target.value })} /></label>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Your offer is subject to an on-site professional assessment. Never rely on the AI indication for safety-critical work.</p>
                <div className="mt-4 flex gap-2"><Button disabled={busy === invite.id} onClick={() => submitOffer(invite.id)}>{busy === invite.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send offer</Button><Button variant="outline" onClick={() => setActiveInvite(null)}>Cancel</Button></div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
