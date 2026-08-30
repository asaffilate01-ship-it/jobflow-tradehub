import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, CircleDotDashed, Database, ClipboardCheck,
  RefreshCw, Rocket, ShieldAlert, Users, Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/integrations/supabase/client";
import {
  launchDecision,
  type LaunchReadinessCheck,
  type LaunchReadinessReport,
} from "@/lib/launch-readiness";

const stateStyle = {
  ready: { icon: CheckCircle2, badge: "bg-success/15 text-success border-success/25", card: "border-success/20" },
  warning: { icon: AlertTriangle, badge: "bg-warning/15 text-warning border-warning/25", card: "border-warning/20" },
  blocker: { icon: ShieldAlert, badge: "bg-destructive/15 text-destructive border-destructive/25", card: "border-destructive/20" },
};

export default function AdminLaunchReadinessPage() {
  const { lang } = useLanguage();
  const [report, setReport] = useState<LaunchReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  usePageMeta(lang === "de" ? "Startbereitschaft" : "Launch readiness");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke<LaunchReadinessReport>("launch-readiness", {
      body: { action: "check" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setReport(data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const configureStorage = async () => {
    setConfiguring(true);
    const { data, error } = await supabase.functions.invoke<LaunchReadinessReport>("launch-readiness", {
      body: { action: "ensure_repair_bucket" },
    });
    setConfiguring(false);
    if (error) return toast.error(error.message);
    setReport(data);
    toast.success(lang === "de" ? "Privater Reparaturspeicher konfiguriert" : "Private repair storage configured");
  };

  const decision = launchDecision(report);
  const metrics = report ? [
    { label: lang === "de" ? "Bezahlte Händler" : "Paid traders", value: report.metrics.paid_marketplace_profiles, icon: Users },
    { label: lang === "de" ? "Beanspruchbare Profile" : "Claimable profiles", value: report.metrics.active_claimable_directory_profiles, icon: CircleDotDashed },
    { label: lang === "de" ? "Reparaturanbieter" : "Repair providers", value: report.metrics.verified_available_repair_profiles, icon: Wrench },
    { label: lang === "de" ? "Freigegebene Piloten" : "Signed pilots", value: report.metrics.signed_off_pilot_runs, icon: ClipboardCheck },
    { label: lang === "de" ? "Löschanfragen" : "Deletion requests", value: report.metrics.pending_deletion_requests, icon: ShieldAlert },
  ] : [];

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Rocket className="h-6 w-6 text-primary" />
            {lang === "de" ? "Startbereitschaft" : "Launch readiness"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "de"
              ? "Live-Prüfung von Infrastruktur, Integrationen, Händlerangebot und Betriebswarteschlangen. Geheimwerte werden nie angezeigt."
              : "Live checks for infrastructure, integrations, trader supply and operational queues. Secret values are never shown."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={stateStyle[decision.state].badge}>{decision.label}</Badge>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {lang === "de" ? "Aktualisieren" : "Refresh"}
          </Button>
        </div>
      </div>

      {loading && !report ? <div className="glass-card h-56 animate-pulse" /> : report && <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => <Card key={metric.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{metric.value}</p></div>
              <metric.icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>)}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {report.checks.map((check) => <ReadinessCard key={check.id} check={check} />)}
        </div>

        <Card className="border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Database className="h-5 w-5 text-primary" />{lang === "de" ? "Reparaturspeicher" : "Repair storage"}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-2xl text-sm text-muted-foreground">
              {lang === "de"
                ? "Erstellt oder aktualisiert repair-intake als privaten 50-MB-Bucket über die Supabase Storage API. Es wird kein SQL in storage.buckets ausgeführt."
                : "Creates or updates repair-intake as a private 50 MB bucket through the Supabase Storage API. It does not run SQL against storage.buckets."}
            </p>
            <Button onClick={() => void configureStorage()} disabled={configuring} className="gap-2">
              <Database className="h-4 w-4" />
              {configuring ? (lang === "de" ? "Konfiguration…" : "Configuring…") : (lang === "de" ? "Speicher konfigurieren" : "Configure storage")}
            </Button>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          <span>{lang === "de" ? "Letzte Prüfung" : "Last checked"}: {new Date(report.generated_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}</span>
        </div>
      </>}
    </div>
  );
}

function ReadinessCard({ check }: { check: LaunchReadinessCheck }) {
  const style = stateStyle[check.state];
  const Icon = style.icon;
  return <Card className={style.card}>
    <CardContent className="flex gap-3 p-5">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${check.state === "ready" ? "text-success" : check.state === "warning" ? "text-warning" : "text-destructive"}`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{check.label}</h2><Badge variant="outline" className={style.badge}>{check.state}</Badge></div>
        <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
      </div>
    </CardContent>
  </Card>;
}
