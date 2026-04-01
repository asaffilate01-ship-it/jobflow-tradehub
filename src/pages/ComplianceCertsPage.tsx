import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileCheck, Plus, Save, ClipboardList } from "lucide-react";

type CertType = {
  key: string;
  label: string;
  fields: { name: string; label: string; type: "text" | "number" | "date" | "select" | "textarea"; options?: string[] }[];
};

const certTypes: CertType[] = [
  {
    key: "gas_safe_cp12",
    label: "Gas Safe CP12 (Landlord Gas Safety)",
    fields: [
      { name: "property_address", label: "Property address", type: "textarea" },
      { name: "landlord_name", label: "Landlord/agent name", type: "text" },
      { name: "engineer_name", label: "Engineer name", type: "text" },
      { name: "gas_safe_id", label: "Gas Safe ID number", type: "text" },
      { name: "inspection_date", label: "Inspection date", type: "date" },
      { name: "appliance_1_type", label: "Appliance 1 — type", type: "text" },
      { name: "appliance_1_make", label: "Appliance 1 — make/model", type: "text" },
      { name: "appliance_1_location", label: "Appliance 1 — location", type: "text" },
      { name: "appliance_1_flue_type", label: "Appliance 1 — flue type", type: "select", options: ["Open flue", "Room sealed", "Flueless", "N/A"] },
      { name: "appliance_1_operating_pressure", label: "Appliance 1 — operating pressure (mbar)", type: "number" },
      { name: "appliance_1_safety_check", label: "Appliance 1 — safety result", type: "select", options: ["Pass", "Fail", "Not tested"] },
      { name: "appliance_2_type", label: "Appliance 2 — type (if applicable)", type: "text" },
      { name: "appliance_2_make", label: "Appliance 2 — make/model", type: "text" },
      { name: "appliance_2_safety_check", label: "Appliance 2 — safety result", type: "select", options: ["Pass", "Fail", "Not tested", "N/A"] },
      { name: "gas_tightness_test", label: "Gas tightness test result", type: "select", options: ["Pass", "Fail"] },
      { name: "co_alarm_present", label: "CO alarm present", type: "select", options: ["Yes", "No"] },
      { name: "overall_result", label: "Overall result", type: "select", options: ["Satisfactory", "Unsatisfactory", "At Risk — Do Not Use"] },
      { name: "defects_noted", label: "Defects/observations", type: "textarea" },
      { name: "next_inspection_date", label: "Next inspection due", type: "date" },
    ],
  },
  {
    key: "eicr",
    label: "EICR (Electrical Installation Condition Report)",
    fields: [
      { name: "property_address", label: "Property address", type: "textarea" },
      { name: "client_name", label: "Client name", type: "text" },
      { name: "contractor_name", label: "Contractor name", type: "text" },
      { name: "niceic_number", label: "NICEIC/NAPIT number", type: "text" },
      { name: "inspection_date", label: "Inspection date", type: "date" },
      { name: "installation_date", label: "Installation date (approx)", type: "text" },
      { name: "type_of_supply", label: "Type of supply", type: "select", options: ["Single phase", "Three phase", "TN-S", "TN-C-S", "TT"] },
      { name: "main_switch_rating", label: "Main switch rating (A)", type: "number" },
      { name: "rcd_present", label: "RCD protection present", type: "select", options: ["Yes — all circuits", "Yes — some circuits", "No"] },
      { name: "ze_value", label: "Ze value (Ω)", type: "number" },
      { name: "pscc", label: "Prospective short-circuit current (kA)", type: "number" },
      { name: "number_of_circuits", label: "Number of circuits", type: "number" },
      { name: "c1_codes", label: "C1 (danger present) observations", type: "textarea" },
      { name: "c2_codes", label: "C2 (potentially dangerous) observations", type: "textarea" },
      { name: "c3_codes", label: "C3 (improvement recommended) observations", type: "textarea" },
      { name: "fi_codes", label: "FI (further investigation) observations", type: "textarea" },
      { name: "overall_condition", label: "Overall assessment", type: "select", options: ["Satisfactory", "Unsatisfactory"] },
      { name: "next_inspection_date", label: "Next inspection due", type: "date" },
    ],
  },
  {
    key: "part_p",
    label: "Part P (Building Regs Electrical Notification)",
    fields: [
      { name: "property_address", label: "Property address", type: "textarea" },
      { name: "homeowner_name", label: "Homeowner name", type: "text" },
      { name: "installer_name", label: "Installer name", type: "text" },
      { name: "scheme_provider", label: "Scheme provider", type: "select", options: ["NICEIC", "NAPIT", "ELECSA", "Stroma", "Other"] },
      { name: "scheme_number", label: "Scheme membership number", type: "text" },
      { name: "work_date", label: "Date of work", type: "date" },
      { name: "work_description", label: "Description of work", type: "textarea" },
      { name: "location_of_work", label: "Location within property", type: "text" },
      { name: "notifiable", label: "Is work notifiable?", type: "select", options: ["Yes", "No"] },
      { name: "building_control_notified", label: "Building control notified", type: "select", options: ["Yes — via scheme", "Yes — direct", "No — not required"] },
      { name: "certificate_number", label: "Certificate/notification number", type: "text" },
      { name: "test_results_summary", label: "Test results summary", type: "textarea" },
    ],
  },
  {
    key: "rics_survey",
    label: "RICS Condition Report / Survey",
    fields: [
      { name: "property_address", label: "Property address", type: "textarea" },
      { name: "client_name", label: "Client name", type: "text" },
      { name: "surveyor_name", label: "Surveyor name", type: "text" },
      { name: "rics_number", label: "RICS membership number", type: "text" },
      { name: "survey_date", label: "Survey date", type: "date" },
      { name: "property_type", label: "Property type", type: "select", options: ["Detached", "Semi-detached", "Terraced", "Flat", "Bungalow", "Commercial"] },
      { name: "construction_type", label: "Construction type", type: "select", options: ["Traditional brick", "Timber frame", "Steel frame", "Concrete", "Other"] },
      { name: "approx_age", label: "Approximate age", type: "text" },
      { name: "roof_condition", label: "Roof condition", type: "select", options: ["1 — No repair needed", "2 — Minor repair", "3 — Significant repair"] },
      { name: "walls_condition", label: "External walls condition", type: "select", options: ["1 — No repair needed", "2 — Minor repair", "3 — Significant repair"] },
      { name: "windows_condition", label: "Windows condition", type: "select", options: ["1 — No repair needed", "2 — Minor repair", "3 — Significant repair"] },
      { name: "damp_issues", label: "Damp/moisture issues", type: "select", options: ["None noted", "Rising damp", "Penetrating damp", "Condensation", "Multiple"] },
      { name: "subsidence_risk", label: "Subsidence risk", type: "select", options: ["No evidence", "Minor cracking", "Significant movement", "Further investigation required"] },
      { name: "services_condition", label: "Services (heating, plumbing, electrical)", type: "textarea" },
      { name: "overall_condition", label: "Overall condition rating", type: "select", options: ["1 — Good", "2 — Fair", "3 — Poor"] },
      { name: "key_concerns", label: "Key concerns and recommendations", type: "textarea" },
      { name: "estimated_repair_costs", label: "Estimated repair costs (£)", type: "number" },
    ],
  },
  {
    key: "generic_snag",
    label: "Generic Snagging Report",
    fields: [
      { name: "property_address", label: "Property address", type: "textarea" },
      { name: "inspector_name", label: "Inspector name", type: "text" },
      { name: "inspection_date", label: "Inspection date", type: "date" },
      { name: "total_items", label: "Total items found", type: "number" },
      { name: "critical_items", label: "Critical items", type: "textarea" },
      { name: "major_items", label: "Major items", type: "textarea" },
      { name: "minor_items", label: "Minor/cosmetic items", type: "textarea" },
      { name: "recommendations", label: "Overall recommendations", type: "textarea" },
      { name: "follow_up_date", label: "Follow-up date", type: "date" },
    ],
  },
];

const ComplianceCertsPage = () => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [jobsRes, companyRes] = await Promise.all([
        supabase.from("jobs").select("id, title").in("status", ["awarded", "active", "completed"]),
        supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id),
      ]);
      setJobs((jobsRes.data ?? []) as { id: string; title: string }[]);
      const cId = companyRes.data?.[0]?.id ?? null;
      setCompanyId(cId);

      if (cId) {
        const { data } = await supabase
          .from("compliance_certificates")
          .select("*")
          .eq("trade_company_id", cId)
          .order("created_at", { ascending: false });
        setCerts(data ?? []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const certType = certTypes.find(c => c.key === selectedType);

  const handleSave = async () => {
    if (!certType || !selectedJob || !companyId || !user) {
      toast.error("Select a certificate type and job");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("compliance_certificates").insert({
      job_id: selectedJob,
      trade_company_id: companyId,
      cert_type: certType.key,
      data: formData,
      issued_by: user.id,
      issued_date: formData.inspection_date || formData.survey_date || formData.work_date || new Date().toISOString().split("T")[0],
      expiry_date: formData.next_inspection_date || null,
      cert_number: formData.certificate_number || formData.gas_safe_id || formData.niceic_number || null,
      status: "draft",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Certificate saved as draft!");
      setFormData({});
      setSelectedType("");
      const { data } = await supabase
        .from("compliance_certificates")
        .select("*")
        .eq("trade_company_id", companyId)
        .order("created_at", { ascending: false });
      setCerts(data ?? []);
    }
    setSaving(false);
  };

  const statusConfig: Record<string, { label: string; class: string }> = {
    draft: { label: "Draft", class: "bg-muted text-muted-foreground" },
    issued: { label: "Issued", class: "bg-success/15 text-success" },
    expired: { label: "Expired", class: "bg-destructive/15 text-destructive" },
  };

  if (loading) {
    return <div className="h-8 w-48 bg-muted animate-pulse rounded" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Certificates</h1>
        <p className="text-sm text-muted-foreground mt-1">Gas Safe, EICR, Part P, RICS surveys and snagging reports</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Create Certificate
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Certificate type *</label>
            <select
              className={selectClass}
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value); setFormData({}); }}
            >
              <option value="">Select type…</option>
              {certTypes.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Job *</label>
            <select className={selectClass} value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
              <option value="">Select job…</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        </div>

        {certType && (
          <div className="space-y-4 pt-2 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground">{certType.label}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {certType.fields.map(f => (
                <div key={f.name} className={`space-y-1 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      className={selectClass}
                      value={formData[f.name] || ""}
                      onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {f.options?.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={formData[f.name] || ""}
                      onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  ) : (
                    <Input
                      type={f.type}
                      value={formData[f.name] || ""}
                      onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2 font-semibold">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Certificate"}
            </Button>
          </div>
        )}
      </div>

      {certs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Issued Certificates ({certs.length})
          </h2>
          <div className="space-y-3">
            {certs.map(c => {
              const sc = statusConfig[c.status] || statusConfig.draft;
              const typeLabel = certTypes.find(t => t.key === c.cert_type)?.label ?? c.cert_type;
              return (
                <div key={c.id} className="glass-card p-4 flex items-center gap-4 hover:border-primary/20 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <FileCheck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{typeLabel}</span>
                      <Badge variant="outline" className={sc.class}>{sc.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.cert_number && <span className="font-mono mr-2">{c.cert_number}</span>}
                      Issued: {c.issued_date || "—"}
                      {c.expiry_date && ` • Expires: ${c.expiry_date}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceCertsPage;
