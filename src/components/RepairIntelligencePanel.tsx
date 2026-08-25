/* eslint-disable @typescript-eslint/no-explicit-any -- generated Supabase types are updated after the new migration is applied */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, FileCheck2, Loader2, RefreshCw, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RepairIntelligencePanel({ job }: { job: any }) {
  const db = supabase as any;
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [dokuvera, setDokuvera] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (job?.job_kind !== "repair") return;
    const [diagnosisResult, linkResult] = await Promise.all([
      db.from("repair_diagnoses").select("*").eq("job_id", job.id).maybeSingle(),
      db.from("dokuvera_case_links").select("*").eq("job_id", job.id).maybeSingle(),
    ]);
    setDiagnosis(diagnosisResult.data);
    setDokuvera(linkResult.data);
  }, [db, job?.id, job?.job_kind]);

  useEffect(() => { void load(); }, [load]);
  if (job?.job_kind !== "repair") return null;

  const sync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("dokuvera-sync", { body: { job_id: job.id } });
    setSyncing(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Dokuvera sync failed");
    toast.success(data.configured ? "Dokuvera evidence case synchronised" : "Evidence queued; Dokuvera credentials still need configuring");
    await load();
  };

  const cost = diagnosis?.estimated_cost ?? {};
  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${diagnosis?.emergency_stop ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {diagnosis?.emergency_stop ? <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-destructive" /> : <Sparkles className="mt-0.5 h-6 w-6 shrink-0 text-primary" />}
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">AI repair assessment</h2>{diagnosis?.risk_level && <Badge variant="outline" className="capitalize">{diagnosis.risk_level} priority</Badge>}</div><p className="mt-1 max-w-2xl text-xs text-muted-foreground">Possible causes and indicative cost only. A competent professional must diagnose, make safe and confirm the final price.</p></div>
        </div>
        <div className="flex items-center gap-2"><Badge variant="secondary" className="gap-1.5 capitalize"><FileCheck2 className="h-3.5 w-3.5" />Dokuvera: {dokuvera?.status ?? "pending"}</Badge><Button variant="outline" size="sm" onClick={sync} disabled={syncing} className="gap-1.5">{syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Sync</Button></div>
      </div>

      {diagnosis ? <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div><div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Wrench className="h-3.5 w-3.5" />Likely causes</div><ul className="mt-2 space-y-1 text-sm">{(diagnosis.probable_causes ?? []).map((cause: string) => <li key={cause}>• {cause}</li>)}</ul></div>
        <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indicative cost</div><div className="mt-2 text-2xl font-bold">£{cost.minimum ?? "?"}–£{cost.maximum ?? "?"}</div><div className="mt-1 text-xs text-muted-foreground capitalize">Suggested: {diagnosis.suggested_trade?.replace("_", " ")}</div></div>
        <div><div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Safety</div>{diagnosis.emergency_stop ? <ul className="mt-2 space-y-1 text-sm text-destructive">{(diagnosis.safety_actions ?? []).map((action: string) => <li key={action}>• {action}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No emergency stop was triggered. Stay away from anything unsafe and wait for the professional assessment.</p>}</div>
      </div> : <p className="mt-4 text-sm text-muted-foreground">Assessment is being prepared.</p>}

      {diagnosis?.likely_remedies?.length > 0 && <div className="mt-4 border-t border-border/60 pt-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How it may be repaired</div><ul className="mt-2 space-y-1 text-sm">{diagnosis.likely_remedies.map((remedy: string) => <li key={remedy}>• {remedy}</li>)}</ul></div>}

      {dokuvera?.evidence_pack_url && <a href={dokuvera.evidence_pack_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Open Dokuvera evidence pack <ExternalLink className="h-3.5 w-3.5" /></a>}
    </section>
  );
}
