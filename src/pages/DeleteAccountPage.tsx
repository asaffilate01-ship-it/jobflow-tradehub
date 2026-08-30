import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function DeleteAccountPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);
  usePageMeta(lang === "de" ? "Konto löschen" : "Delete account");

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    // Generated database types are refreshed after the forward migration is applied.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("account_deletion_requests").insert({ user_id: user.id, status: "requested", reason: reason.trim() || null });
    setSubmitting(false);
    if (error && error.code !== "23505") return toast.error(error.message);
    setRequested(true);
    toast.success(lang === "de" ? "Löschanfrage gesendet" : "Deletion request submitted");
  };

  return <main className="container max-w-2xl py-12">
    <h1 className="text-3xl font-bold">{lang === "de" ? "Konto und Daten löschen" : "Delete account and data"}</h1>
    <p className="mt-3 text-muted-foreground">{lang === "de" ? "Wir prüfen offene Aufträge, Zahlungen, Nachweise und gesetzliche Aufbewahrungspflichten. Danach löschen oder anonymisieren wir Ihre Daten und bestätigen den Abschluss per E-Mail." : "We will review open jobs, payments, evidence and legal retention duties, then delete or anonymise your data and confirm completion by email."}</p>
    {requested ? <div className="mt-8 rounded-xl border border-success/30 bg-success/5 p-5">{lang === "de" ? "Ihre Anfrage wurde erfasst." : "Your request has been recorded."}</div> : <div className="mt-8 space-y-4">
      <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={lang === "de" ? "Optionaler Grund" : "Optional reason"} />
      <Button variant="destructive" disabled={submitting} onClick={submit} className="gap-2"><Trash2 className="h-4 w-4" />{submitting ? (lang === "de" ? "Wird gesendet…" : "Submitting…") : (lang === "de" ? "Löschung anfordern" : "Request deletion")}</Button>
    </div>}
  </main>;
}
