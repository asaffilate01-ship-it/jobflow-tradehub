import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock3, FileCheck2, Play,
  RefreshCw, RotateCcw, Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OutboxRow = Database["public"]["Tables"]["repair_integration_outbox"]["Row"];
type DokuveraRow = Database["public"]["Tables"]["dokuvera_case_links"]["Row"] & { job_title: string | null };

const problemStatuses = new Set(["failed", "retry", "pending", "processing", "syncing"]);
const statusStyle: Record<string, string> = {
  delivered: "bg-success/15 text-success border-success/25",
  synced: "bg-success/15 text-success border-success/25",
  completed: "bg-success/15 text-success border-success/25",
  failed: "bg-destructive/15 text-destructive border-destructive/25",
  retry: "bg-warning/15 text-warning border-warning/25",
  pending: "bg-warning/15 text-warning border-warning/25",
  processing: "bg-info/15 text-info border-info/25",
  syncing: "bg-info/15 text-info border-info/25",
};

export default function AdminIntegrationOperationsPage() {
  const { lang } = useLanguage();
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);
  const [dokuvera, setDokuvera] = useState<DokuveraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(true);
  usePageMeta(lang === "de" ? "Integrationsbetrieb" : "Integration operations");

  const load = useCallback(async () => {
    setLoading(true);
    const [outboxResult, dokuveraResult] = await Promise.all([
      supabase.from("repair_integration_outbox").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("dokuvera_case_links").select("*").order("updated_at", { ascending: false }).limit(100),
    ]);
    if (outboxResult.error) toast.error(outboxResult.error.message);
    if (dokuveraResult.error) toast.error(dokuveraResult.error.message);
    const jobIds = (dokuveraResult.data ?? []).map((row) => row.job_id);
    const { data: jobs } = jobIds.length
      ? await supabase.from("jobs").select("id,title").in("id", jobIds)
      : { data: [] };
    setOutbox(outboxResult.data ?? []);
    setDokuvera((dokuveraResult.data ?? []).map((row) => ({
      ...row,
      job_title: (jobs ?? []).find((job) => job.id === row.job_id)?.title ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runQueue = async (retryEventId?: string) => {
    if (retryEventId) setRetrying(retryEventId);
    else setRunning(true);
    const { data, error } = await supabase.functions.invoke<{
      error?: string;
      processed?: number;
      results?: Array<{ id: string; status: string; error?: string }>;
    }>("integration-outbox-worker", { body: retryEventId ? { retry_event_id: retryEventId } : {} });
    setRunning(false);
    setRetrying(null);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Integration worker failed");
    const failed = (data?.results ?? []).filter((result) => result.status === "failed" || result.status === "retry");
    if (failed.length) toast.warning(lang === "de" ? `${failed.length} Zustellung(en) benötigen weitere Prüfung` : `${failed.length} delivery attempt(s) still need attention`);
    else toast.success(lang === "de" ? `${data?.processed ?? 0} Ereignis(se) verarbeitet` : `${data?.processed ?? 0} event(s) processed`);
    await load();
  };

  const retryDokuvera = async (row: DokuveraRow) => {
    setRetrying(`dokuvera:${row.id}`);
    const { data, error } = await supabase.functions.invoke<{ error?: string; status?: string }>("dokuvera-sync", { body: { job_id: row.job_id } });
    setRetrying(null);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Dokuvera sync failed");
    toast.success(lang === "de" ? "Dokuvera-Synchronisierung abgeschlossen" : "Dokuvera sync completed");
    await load();
  };

  const shownOutbox = useMemo(() => problemsOnly ? outbox.filter((row) => problemStatuses.has(row.status)) : outbox, [outbox, problemsOnly]);
  const shownDokuvera = useMemo(() => problemsOnly ? dokuvera.filter((row) => problemStatuses.has(row.status)) : dokuvera, [dokuvera, problemsOnly]);
  const queueProblems = outbox.filter((row) => problemStatuses.has(row.status)).length;
  const dokuveraProblems = dokuvera.filter((row) => problemStatuses.has(row.status)).length;

  return <div className="space-y-6 page-enter">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Webhook className="h-6 w-6 text-primary" />{lang === "de" ? "Integrationsbetrieb" : "Integration operations"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "de" ? "Gabley-, Immoviq- und Dokuvera-Zustellungen prüfen und kontrolliert erneut ausführen." : "Inspect and safely retry Gabley, Immoviq and Dokuvera deliveries."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setProblemsOnly((value) => !value)}>{problemsOnly ? (lang === "de" ? "Alle anzeigen" : "Show all") : (lang === "de" ? "Nur Probleme" : "Problems only")}</Button>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{lang === "de" ? "Aktualisieren" : "Refresh"}</Button>
        <Button size="sm" onClick={() => void runQueue()} disabled={running}><Play className="mr-2 h-4 w-4" />{running ? (lang === "de" ? "Wird ausgeführt…" : "Running…") : (lang === "de" ? "Fällige Warteschlange starten" : "Run due queue")}</Button>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label={lang === "de" ? "Warteschlangenprobleme" : "Queue problems"} value={queueProblems} problem={queueProblems > 0} />
      <Metric label={lang === "de" ? "Dokuvera-Probleme" : "Dokuvera problems"} value={dokuveraProblems} problem={dokuveraProblems > 0} />
      <Metric label={lang === "de" ? "Zugestellte Ereignisse" : "Delivered events"} value={outbox.filter((row) => row.status === "delivered").length} />
      <Metric label={lang === "de" ? "Synchronisierte Fälle" : "Synced cases"} value={dokuvera.filter((row) => ["synced", "completed"].includes(row.status)).length} />
    </div>

    <section className="space-y-3">
      <div><h2 className="text-lg font-semibold">Gabley / Immoviq</h2><p className="text-xs text-muted-foreground">{lang === "de" ? "Fehlgeschlagene Ereignisse können nur durch Administratoren zurückgesetzt werden. Idempotenzschlüssel bleiben unverändert." : "Only administrators can reset failed events. Idempotency keys are preserved."}</p></div>
      {loading ? <div className="glass-card h-40 animate-pulse" /> : shownOutbox.length === 0 ? <EmptyState lang={lang} /> : shownOutbox.map((row) => <Card key={row.id} className={row.status === "failed" ? "border-destructive/25" : ""}>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={statusStyle[row.status] ?? ""}>{row.status}</Badge><strong className="text-sm capitalize">{row.destination}</strong><span className="text-sm text-muted-foreground">{row.event_type}</span></div>
            <p className="font-mono text-xs text-muted-foreground">{row.aggregate_type} · {row.aggregate_id}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{new Date(row.created_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")} · {lang === "de" ? "Versuche" : "Attempts"}: {row.attempts}</p>
            {row.last_error && <p className="max-w-3xl rounded-lg bg-destructive/5 p-3 text-xs text-destructive">{row.last_error}</p>}
          </div>
          {["failed", "retry"].includes(row.status) && <Button variant="outline" size="sm" disabled={retrying === row.id} onClick={() => void runQueue(row.id)}><RotateCcw className={`mr-2 h-4 w-4 ${retrying === row.id ? "animate-spin" : ""}`} />{lang === "de" ? "Jetzt erneut versuchen" : "Retry now"}</Button>}
        </CardContent>
      </Card>)}
    </section>

    <section className="space-y-3">
      <div><h2 className="text-lg font-semibold">Dokuvera</h2><p className="text-xs text-muted-foreground">{lang === "de" ? "Die erneute Synchronisierung nutzt weiterhin ausschließlich als sicher markierte, geschwärzte Medien." : "Retries continue to use only media already marked safe with a redacted path."}</p></div>
      {loading ? <div className="glass-card h-40 animate-pulse" /> : shownDokuvera.length === 0 ? <EmptyState lang={lang} /> : shownDokuvera.map((row) => <Card key={row.id} className={row.status === "failed" ? "border-destructive/25" : ""}>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={statusStyle[row.status] ?? ""}>{row.status}</Badge><FileCheck2 className="h-4 w-4 text-primary" /><Link to={`/jobs/${row.job_id}`} className="text-sm font-semibold hover:text-primary">{row.job_title || row.job_id}</Link></div>
            {row.dokuvera_case_id && <p className="font-mono text-xs text-muted-foreground">Dokuvera: {row.dokuvera_case_id}</p>}
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{new Date(row.updated_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}</p>
            {row.last_error && <p className="max-w-3xl rounded-lg bg-destructive/5 p-3 text-xs text-destructive">{row.last_error}</p>}
          </div>
          {["failed", "pending"].includes(row.status) && <Button variant="outline" size="sm" disabled={retrying === `dokuvera:${row.id}`} onClick={() => void retryDokuvera(row)}><RotateCcw className={`mr-2 h-4 w-4 ${retrying === `dokuvera:${row.id}` ? "animate-spin" : ""}`} />{lang === "de" ? "Synchronisierung erneut starten" : "Retry sync"}</Button>}
        </CardContent>
      </Card>)}
    </section>
  </div>;
}

function Metric({ label, value, problem = false }: { label: string; value: number; problem?: boolean }) {
  return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>{problem ? <AlertTriangle className="h-5 w-5 text-warning" /> : <CheckCircle2 className="h-5 w-5 text-success" />}</CardContent></Card>;
}

function EmptyState({ lang }: { lang: "en" | "de" }) {
  return <div className="glass-card p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-success" /><p className="mt-2 text-sm text-muted-foreground">{lang === "de" ? "Keine passenden Ereignisse." : "No matching events."}</p></div>;
}
