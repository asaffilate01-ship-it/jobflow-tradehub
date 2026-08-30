import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, ShieldAlert, UserRoundX, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RequestRow = Database["public"]["Tables"]["account_deletion_requests"]["Row"] & {
  full_name: string | null;
  email: string | null;
  company_name: string | null;
};

const statusStyle: Record<string, string> = {
  requested: "bg-warning/15 text-warning border-warning/25",
  processing: "bg-info/15 text-info border-info/25",
  completed: "bg-success/15 text-success border-success/25",
  cancelled: "bg-muted text-muted-foreground",
};

export default function AdminDeletionRequestsPage() {
  const { lang } = useLanguage();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [completionTarget, setCompletionTarget] = useState<RequestRow | null>(null);
  usePageMeta(lang === "de" ? "Löschanfragen" : "Deletion requests");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("account_deletion_requests").select("*").order("requested_at", { ascending: false });
    if (error) { setLoading(false); return toast.error(error.message); }
    const userIds = (data ?? []).map((request) => request.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id,full_name,email,company_name").in("id", userIds)
      : { data: [] };
    setRequests((data ?? []).map((request) => {
      const profile = (profiles ?? []).find((item) => item.id === request.user_id);
      return { ...request, full_name: profile?.full_name ?? null, email: profile?.email ?? null, company_name: profile?.company_name ?? null };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCount = useMemo(() => requests.filter((request) => ["requested", "processing"].includes(request.status)).length, [requests]);

  const setStatus = async (request: RequestRow, status: "processing" | "completed" | "cancelled") => {
    setSaving(request.id);
    const processedAt = status === "completed" || status === "cancelled" ? new Date().toISOString() : null;
    const { error } = await supabase.from("account_deletion_requests").update({ status, processed_at: processedAt }).eq("id", request.id);
    if (!error) {
      const { data: { user: actor } } = await supabase.auth.getUser();
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: actor?.id ?? request.user_id,
        action: `privacy.deletion.${status}`,
        entity_type: "account_deletion_request",
        entity_id: request.id,
        metadata: { previous_status: request.status, target_user_id: request.user_id },
      });
      if (auditError) toast.warning(lang === "de" ? "Status gespeichert, aber Audit-Eintrag fehlgeschlagen" : "Status saved, but the audit event failed");
    }
    setSaving(null);
    if (error) return toast.error(error.message);
    setCompletionTarget(null);
    toast.success(lang === "de" ? "Status aktualisiert" : "Status updated");
    await load();
  };

  return <div className="space-y-6 page-enter">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><UserRoundX className="h-6 w-6 text-primary" />{lang === "de" ? "Löschanfragen" : "Account deletion requests"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "de" ? "Kontrollierte Bearbeitung mit Prüfpfad. Der Abschluss löscht keine Daten automatisch." : "Controlled operations queue with an audit trail. Marking complete does not automatically delete data."}</p>
      </div>
      <div className="flex items-center gap-2"><Badge variant="outline">{openCount} {lang === "de" ? "offen" : "open"}</Badge><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{lang === "de" ? "Aktualisieren" : "Refresh"}</Button></div>
    </div>

    {loading ? <div className="glass-card h-64 animate-pulse" /> : requests.length === 0 ? <div className="glass-card p-12 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" /><p className="font-medium">{lang === "de" ? "Keine Löschanfragen" : "No deletion requests"}</p></div> : <div className="space-y-3">
      {requests.map((request) => <div key={request.id} className="glass-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{request.full_name || request.company_name || (lang === "de" ? "Unbekanntes Konto" : "Unknown account")}</h2><Badge variant="outline" className={statusStyle[request.status] ?? ""}>{request.status}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{request.email || request.user_id}</p>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{new Date(request.requested_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}</p>
            {request.reason && <p className="mt-3 max-w-3xl rounded-lg bg-muted/40 p-3 text-sm">{request.reason}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {request.status === "requested" && <Button size="sm" variant="outline" disabled={saving === request.id} onClick={() => void setStatus(request, "processing")}><ShieldAlert className="mr-2 h-4 w-4" />{lang === "de" ? "Bearbeitung starten" : "Start review"}</Button>}
            {["requested", "processing"].includes(request.status) && <>
              <Button size="sm" variant="outline" disabled={saving === request.id} onClick={() => void setStatus(request, "cancelled")}><XCircle className="mr-2 h-4 w-4" />{lang === "de" ? "Abbrechen" : "Cancel"}</Button>
              <Button size="sm" disabled={saving === request.id} onClick={() => setCompletionTarget(request)}><CheckCircle2 className="mr-2 h-4 w-4" />{lang === "de" ? "Abschluss erfassen" : "Record completion"}</Button>
            </>}
          </div>
        </div>
      </div>)}
    </div>}

    <AlertDialog open={Boolean(completionTarget)} onOpenChange={(open) => { if (!open) setCompletionTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{lang === "de" ? "Löschung als abgeschlossen erfassen?" : "Record deletion as completed?"}</AlertDialogTitle><AlertDialogDescription>{lang === "de" ? "Bestätigen Sie dies erst, nachdem Identität, offene Aufträge und gesetzliche Aufbewahrung geprüft und die Daten in Auth, Stripe, Dokuvera und allen Produkt-Systemen gelöscht oder anonymisiert wurden." : "Only confirm after identity, open work and legal retention have been checked and data has been deleted or anonymised across Auth, Stripe, Dokuvera and connected product systems."}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{lang === "de" ? "Zurück" : "Go back"}</AlertDialogCancel><AlertDialogAction onClick={() => completionTarget && void setStatus(completionTarget, "completed")}>{lang === "de" ? "Abschluss bestätigen" : "Confirm completion"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
