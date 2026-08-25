/* eslint-disable @typescript-eslint/no-explicit-any -- generated Supabase types are updated after the new migration is applied */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, FileVideo, Loader2, MapPin, ShieldCheck, Sparkles, Upload, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/use-page-meta";

type DiagnosisResult = {
  job_id: string;
  diagnosis: {
    emergency_stop: boolean;
    risk_level: string;
    probable_causes: string[];
    likely_remedies: string[];
    confidence: number;
    suggested_trade: string;
    safety_actions: string[];
    prohibited_actions: string[];
    emergency_contacts: Array<{ label: string; number: string; when: string }>;
    follow_up_questions: string[];
    estimated_cost: { currency: string; minimum: number; typical: number; maximum: number; confidence: string; notice: string };
  };
  dispatch: { mode: string; invite_count: number };
  vision_status: string;
};

const categories = ["Water or leak", "Heating or boiler", "Electrical", "Roof or gutter", "Door or lock", "Crack or structure", "Mould or damp", "Other"];

export default function RepairAssistPage() {
  usePageMeta("AI Repair Assist", "Upload photos or video, understand the likely issue and request offers from verified local tradespeople.");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: "Water or leak", description: "", address: "", city: "", postcode: "", mode: "compare" });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const mediaLabel = useMemo(() => files.length ? `${files.length} file${files.length === 1 ? "" : "s"} ready` : "Add up to 5 photos or short videos", [files]);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const accepted = Array.from(selected).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/")).slice(0, 5);
    if (accepted.some((file) => file.size > 50 * 1024 * 1024)) return toast.error("Each file must be 50 MB or smaller");
    setFiles(accepted);
  };

  const submit = async () => {
    if (!user) return toast.error("Please sign in first");
    if (form.description.trim().length < 12) return toast.error("Please describe the problem in a little more detail");
    if (!form.address || !form.city || !form.postcode) return toast.error("The property address is required");
    setSubmitting(true);
    let jobId: string | null = null;
    try {
      const { data: createdJobId, error: jobError } = await supabase.rpc("create_repair_job", {
        p_title: form.category,
        p_description: form.description.trim(),
        p_address_line1: form.address.trim(),
        p_city: form.city.trim(),
        p_postcode: form.postcode.trim().toUpperCase(),
      });
      if (jobError) throw jobError;
      if (!createdJobId) throw new Error("Repair job could not be created");
      const job = { id: createdJobId as string };
      jobId = job.id;

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${job.id}/${crypto.randomUUID()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from("repair-intake").upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { error: mediaError } = await supabase.from("repair_intake_media").insert({
          job_id: job.id,
          uploaded_by: user.id,
          storage_path: path,
          media_type: file.type.startsWith("video/") ? "video" : "image",
          captured_at: new Date(file.lastModified || Date.now()).toISOString(),
        });
        if (mediaError) throw mediaError;
      }

      const { data, error } = await supabase.functions.invoke("repair-diagnose", { body: { job_id: job.id, mode: form.mode } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as DiagnosisResult);
      void supabase.functions.invoke("dokuvera-sync", { body: { job_id: job.id } }).then(({ error: syncError }) => {
        if (syncError) console.warn("Dokuvera evidence sync remains queued", syncError.message);
      });
      toast.success(data.diagnosis.emergency_stop ? "Safety guidance is ready" : "Repair assessment completed");
    } catch (error: any) {
      toast.error(error?.message ?? "Repair assessment failed");
      if (jobId) navigate(`/jobs/${jobId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const diagnosis = result.diagnosis;
    return (
      <div className="mx-auto max-w-4xl space-y-6 page-enter">
        <div className={`rounded-2xl border p-6 ${diagnosis.emergency_stop ? "border-destructive/40 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
          <div className="flex items-start gap-4">
            {diagnosis.emergency_stop ? <AlertTriangle className="h-9 w-9 shrink-0 text-destructive" /> : <CheckCircle2 className="h-9 w-9 shrink-0 text-success" />}
            <div>
              <Badge variant="outline" className="mb-2 capitalize">{diagnosis.risk_level} priority</Badge>
              <h1 className="text-2xl font-bold">{diagnosis.emergency_stop ? "Stop and follow the safety guidance" : "Your repair assessment is ready"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">AI provides possible causes, not a final diagnosis. A qualified professional must confirm the fault and price.</p>
            </div>
          </div>
        </div>

        {diagnosis.emergency_stop && (
          <div className="glass-card p-6 space-y-5">
            <div><h2 className="font-semibold text-lg">Do this now</h2><ul className="mt-2 space-y-2 text-sm">{diagnosis.safety_actions.map((item) => <li key={item}>• {item}</li>)}</ul></div>
            <div><h2 className="font-semibold text-lg text-destructive">Do not</h2><ul className="mt-2 space-y-2 text-sm">{diagnosis.prohibited_actions.map((item) => <li key={item}>• {item}</li>)}</ul></div>
            <div className="grid gap-3 sm:grid-cols-2">{diagnosis.emergency_contacts.map((contact) => <a key={contact.label} href={`tel:${contact.number.replace(/\s/g, "")}`} className="rounded-xl border border-destructive/20 p-4 hover:bg-destructive/5"><div className="font-semibold">{contact.label}</div><div className="text-xl font-bold text-destructive">{contact.number}</div><div className="text-xs text-muted-foreground">{contact.when}</div></a>)}</div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-semibold text-lg">Possible causes</h2></div>
            <ul className="space-y-2 text-sm text-muted-foreground">{diagnosis.probable_causes.map((cause) => <li key={cause}>• {cause}</li>)}</ul>
            <div className="text-sm"><span className="text-muted-foreground">Suggested trade:</span> <strong className="capitalize">{diagnosis.suggested_trade.replace("_", " ")}</strong></div>
          </div>
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /><h2 className="font-semibold text-lg">Indicative repair cost</h2></div>
            <div className="text-3xl font-bold">£{diagnosis.estimated_cost.minimum}–£{diagnosis.estimated_cost.maximum}</div>
            <p className="text-sm text-muted-foreground">Typical around £{diagnosis.estimated_cost.typical}. {diagnosis.estimated_cost.notice}</p>
          </div>
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /><h2 className="font-semibold text-lg">How it may be repaired</h2></div>
          <ul className="space-y-2 text-sm text-muted-foreground">{diagnosis.likely_remedies.map((remedy) => <li key={remedy}>• {remedy}</li>)}</ul>
          <p className="text-xs text-muted-foreground">The attending professional must inspect the property and choose the safe, compliant repair method.</p>
        </div>

        {!diagnosis.emergency_stop && (
          <div className="glass-card p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">Verified provider dispatch</h2><p className="text-sm text-muted-foreground">{result.dispatch.invite_count ? `${result.dispatch.invite_count} suitable provider${result.dispatch.invite_count === 1 ? "" : "s"} received the postcode sector, problem and safe evidence.` : "No verified provider matched yet. The case remains open for manual matching."}</p></div>
            <Button onClick={() => navigate(`/jobs/${result.job_id}`)} className="gap-2">View repair and offers <ArrowRight className="h-4 w-4" /></Button>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Dokuvera evidence case prepared. Original media remains private and providers see only redacted evidence.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7 page-enter">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Repair Assist</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Show us the problem. Get the right help.</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">Upload photos or video for a safety-first assessment, indicative cost and controlled dispatch to up to four verified local tradespeople.</p>
      </div>

      <div className="glass-card p-6 sm:p-8 space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><label className="text-sm font-medium">Problem type</label><select value={form.category} onChange={(event) => set("category", event.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
          <div className="space-y-2"><label className="text-sm font-medium">Dispatch mode</label><select value={form.mode} onChange={(event) => set("mode", event.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="compare">Compare offers</option><option value="rapid">Rapid response</option></select></div>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">What is happening?</label><Textarea rows={5} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Describe what you can see, hear or smell, when it started and whether it is getting worse. Do not approach anything dangerous." /></div>
        <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border p-7 text-center transition hover:border-primary/50 hover:bg-primary/5">
          <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(event) => handleFiles(event.target.files)} />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Upload className="h-5 w-5 text-primary" /></div>
          <div className="mt-3 font-medium">{mediaLabel}</div><div className="mt-1 text-xs text-muted-foreground">Wide view, close-up and any model or fault-code label. Never move closer to danger.</div>
          {files.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-2">{files.map((file) => <Badge key={`${file.name}-${file.size}`} variant="secondary" className="gap-1">{file.type.startsWith("video/") ? <FileVideo className="h-3 w-3" /> : <Camera className="h-3 w-3" />}{file.name}</Badge>)}</div>}
        </label>
        <div className="space-y-4">
          <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><h2 className="font-semibold">Property location</h2></div>
          <Input value={form.address} onChange={(event) => set("address", event.target.value)} placeholder="Street address" />
          <div className="grid gap-3 sm:grid-cols-2"><Input value={form.city} onChange={(event) => set("city", event.target.value)} placeholder="Town or city" /><Input value={form.postcode} onChange={(event) => set("postcode", event.target.value)} placeholder="Postcode" /></div>
          <p className="text-xs text-muted-foreground">Tradespeople receive only the postcode sector initially. The full address is released only after you accept an offer.</p>
        </div>
        <Button onClick={submit} disabled={submitting} size="lg" className="w-full gap-2 font-semibold">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Assessing safely…</> : <><Sparkles className="h-4 w-4" />Analyse and find help</>}</Button>
      </div>
    </div>
  );
}

function postcodeSector(postcode: string) {
  const compact = postcode.trim().toUpperCase().replace(/\s+/g, " ");
  const [outward, inward = ""] = compact.split(" ");
  return inward ? `${outward} ${inward.slice(0, 1)}` : outward.slice(0, 4);
}
