import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Plus, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/integrations/supabase/client";
import { pilotCheckLabels, pilotProgress, type PilotCheckStatus } from "@/lib/pilot-runs";

type PilotRun = {
  id: string; name: string; postcode_area: string; status: string; notes: string | null;
  started_at: string; signed_off_at: string | null; signed_off_by: string | null;
};
type PilotCheck = {
  id: string; run_id: string; check_key: string; category: string; label: string;
  required: boolean; status: PilotCheckStatus; notes: string | null; evidence_reference: string | null;
  tested_at: string | null; sort_order: number;
};

const statusTone: Record<PilotCheckStatus, string> = {
  not_run: "bg-muted text-muted-foreground",
  pass: "bg-success/15 text-success border-success/25",
  fail: "bg-destructive/15 text-destructive border-destructive/25",
  blocked: "bg-warning/15 text-warning border-warning/25",
};

export default function AdminPilotRunsPage() {
  const { lang } = useLanguage();
  const [runs, setRuns] = useState<PilotRun[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [checks, setChecks] = useState<PilotCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmSignOff, setConfirmSignOff] = useState(false);
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notes, setNotes] = useState("");
  usePageMeta(lang === "de" ? "Pilotläufe" : "Pilot runs");

  const loadRuns = useCallback(async (preferredId?: string) => {
    const { data, error } = await supabase.from("launch_pilot_runs").select("id,name,postcode_area,status,notes,started_at,signed_off_at,signed_off_by").order("started_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const next = (data ?? []) as PilotRun[];
    setRuns(next);
    setSelectedId(preferredId ?? ((current) => current || next[0]?.id || ""));
    setLoading(false);
  }, []);

  const loadChecks = useCallback(async () => {
    if (!selectedId) { setChecks([]); return; }
    const { data, error } = await supabase.from("launch_pilot_checks").select("id,run_id,check_key,category,label,required,status,notes,evidence_reference,tested_at,sort_order").eq("run_id", selectedId).order("sort_order");
    if (error) return toast.error(error.message);
    setChecks((data ?? []) as PilotCheck[]);
  }, [selectedId]);

  useEffect(() => { void loadRuns(); }, [loadRuns]);
  useEffect(() => { void loadChecks(); }, [loadChecks]);

  const selected = runs.find((run) => run.id === selectedId);
  const progress = pilotProgress(checks);
  const groups = useMemo(() => Object.entries(checks.reduce<Record<string, PilotCheck[]>>((all, check) => {
    (all[check.category] ??= []).push(check); return all;
  }, {})), [checks]);

  const createRun = async () => {
    if (name.trim().length < 3 || postcode.trim().length < 2) return toast.error(lang === "de" ? "Name und Postleitzahlgebiet sind erforderlich" : "Name and postcode area are required");
    setCreating(true);
    const { data, error } = await supabase.rpc("create_launch_pilot_run", { p_name: name.trim(), p_postcode_area: postcode.trim(), p_notes: notes.trim() || null });
    setCreating(false);
    if (error) return toast.error(error.message);
    setName(""); setPostcode(""); setNotes("");
    await loadRuns(data);
    toast.success(lang === "de" ? "Pilotlauf erstellt" : "Pilot run created");
  };

  const updateLocal = (id: string, patch: Partial<PilotCheck>) => setChecks((current) => current.map((check) => check.id === id ? { ...check, ...patch } : check));
  const saveCheck = async (check: PilotCheck) => {
    const { error } = await supabase.from("launch_pilot_checks").update({ status: check.status, notes: check.notes, evidence_reference: check.evidence_reference }).eq("id", check.id);
    if (error) return toast.error(error.message);
    await Promise.all([loadChecks(), loadRuns(selectedId)]);
    toast.success(lang === "de" ? "Prüfung gespeichert" : "Check saved");
  };

  const signOff = async () => {
    setConfirmSignOff(false);
    if (!selected) return;
    const { error } = await supabase.rpc("sign_off_launch_pilot", { p_run_id: selected.id });
    if (error) return toast.error(error.message);
    await Promise.all([loadRuns(selected.id), loadChecks()]);
    toast.success(lang === "de" ? "Pilot verbindlich freigegeben" : "Pilot formally signed off");
  };

  return <div className="space-y-6 page-enter">
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardCheck className="h-6 w-6 text-primary" />{lang === "de" ? "Pilotläufe und Freigabe" : "Pilot runs and sign-off"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{lang === "de" ? "End-to-End-Tests pro Postleitzahlgebiet dokumentieren. Freigegebene Läufe sind unveränderlich." : "Record postcode-area end-to-end tests. Signed-off runs are immutable."}</p>
    </div>

    <Card>
      <CardHeader><CardTitle className="text-lg">{lang === "de" ? "Neuen Pilotlauf erstellen" : "Create pilot run"}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        <div><Label htmlFor="pilot-name">{lang === "de" ? "Name" : "Name"}</Label><Input id="pilot-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="NW6 controlled pilot" /></div>
        <div><Label htmlFor="pilot-postcode">{lang === "de" ? "Postleitzahlgebiet" : "Postcode area"}</Label><Input id="pilot-postcode" value={postcode} onChange={(event) => setPostcode(event.target.value.toUpperCase())} placeholder="NW6" /></div>
        <div><Label htmlFor="pilot-notes">{lang === "de" ? "Hinweise" : "Notes"}</Label><Input id="pilot-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        <div className="flex items-end"><Button onClick={() => void createRun()} disabled={creating} className="w-full gap-2"><Plus className="h-4 w-4" />{creating ? (lang === "de" ? "Erstellen…" : "Creating…") : (lang === "de" ? "Pilot erstellen" : "Create pilot")}</Button></div>
      </CardContent>
    </Card>

    {runs.length > 0 && <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit"><CardHeader><CardTitle className="text-base">{lang === "de" ? "Läufe" : "Runs"}</CardTitle></CardHeader><CardContent className="space-y-2">
        {runs.map((run) => <button key={run.id} onClick={() => setSelectedId(run.id)} className={`w-full rounded-lg border p-3 text-left ${selectedId === run.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
          <div className="flex items-center justify-between gap-2"><span className="font-medium">{run.name}</span><Badge variant="outline">{run.status}</Badge></div>
          <p className="mt-1 text-xs text-muted-foreground">{run.postcode_area} · {new Date(run.started_at).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB")}</p>
        </button>)}
      </CardContent></Card>

      {selected && <div className="space-y-5">
        <Card className="border-primary/20"><CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{selected.name}</h2><p className="text-sm text-muted-foreground">{selected.postcode_area}{selected.notes ? ` · ${selected.notes}` : ""}</p></div><Badge variant="outline">{selected.signed_off_at ? (lang === "de" ? "Freigegeben" : "Signed off") : selected.status}</Badge></div>
          <div className="mt-4"><div className="mb-2 flex justify-between text-sm"><span>{progress.passed}/{progress.total} {lang === "de" ? "bestanden" : "passed"}</span><span>{progress.percent}%</span></div><Progress value={progress.percent} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{progress.failed} {lang === "de" ? "fehlgeschlagen" : "failed"} · {progress.blocked} {lang === "de" ? "blockiert" : "blocked"}</span><Button className="gap-2" disabled={!progress.canSignOff || Boolean(selected.signed_off_at)} onClick={() => setConfirmSignOff(true)}><ShieldCheck className="h-4 w-4" />{lang === "de" ? "Pilot freigeben" : "Sign off pilot"}</Button></div>
        </CardContent>
        </Card>

        {groups.map(([category, categoryChecks]) => <section key={category} className="space-y-3"><h2 className="font-semibold">{category}</h2>{categoryChecks.map((check) => {
          const label = pilotCheckLabels[check.check_key]?.[lang] ?? check.label;
          const locked = Boolean(selected.signed_off_at);
          return <Card key={check.id}><CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex gap-2"><CheckCircle2 className={`mt-0.5 h-4 w-4 ${check.status === "pass" ? "text-success" : "text-muted-foreground"}`} /><div><h3 className="font-medium">{label}</h3>{check.tested_at && <p className="text-xs text-muted-foreground">{lang === "de" ? "Geprüft" : "Tested"}: {new Date(check.tested_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}</p>}</div></div><Badge variant="outline" className={statusTone[check.status]}>{check.status.replace("_", " ")}</Badge></div>
            <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
              <Select disabled={locked} value={check.status} onValueChange={(value: PilotCheckStatus) => updateLocal(check.id, { status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_run">{lang === "de" ? "Nicht geprüft" : "Not run"}</SelectItem><SelectItem value="pass">{lang === "de" ? "Bestanden" : "Pass"}</SelectItem><SelectItem value="fail">{lang === "de" ? "Fehlgeschlagen" : "Fail"}</SelectItem><SelectItem value="blocked">{lang === "de" ? "Blockiert" : "Blocked"}</SelectItem></SelectContent></Select>
              <Textarea disabled={locked} value={check.notes ?? ""} onChange={(event) => updateLocal(check.id, { notes: event.target.value })} placeholder={lang === "de" ? "Testhinweise" : "Test notes"} className="min-h-10" />
              <Input disabled={locked} value={check.evidence_reference ?? ""} onChange={(event) => updateLocal(check.id, { evidence_reference: event.target.value })} placeholder={lang === "de" ? "Nachweis-Link oder Referenz" : "Evidence link or reference"} />
              <Button variant="outline" disabled={locked} onClick={() => void saveCheck(check)} className="gap-2"><Save className="h-4 w-4" />{lang === "de" ? "Speichern" : "Save"}</Button>
            </div>
          </CardContent></Card>;
        })}</section>)}
      </div>}
    </div>}

    {!loading && runs.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">{lang === "de" ? "Noch keine Pilotläufe. Erstellen Sie den ersten Lauf für Ihr Startgebiet." : "No pilot runs yet. Create the first run for your launch area."}</CardContent></Card>}

    <AlertDialog open={confirmSignOff} onOpenChange={setConfirmSignOff}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{lang === "de" ? "Pilot verbindlich freigeben?" : "Formally sign off this pilot?"}</AlertDialogTitle><AlertDialogDescription>{lang === "de" ? "Nach der Freigabe können dieser Lauf und seine Nachweise nicht mehr geändert werden." : "After sign-off, this run and its evidence cannot be changed."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{lang === "de" ? "Abbrechen" : "Cancel"}</AlertDialogCancel><AlertDialogAction onClick={() => void signOff()}>{lang === "de" ? "Freigabe bestätigen" : "Confirm sign-off"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
