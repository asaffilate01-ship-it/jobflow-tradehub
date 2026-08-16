import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { notify, getCompanyOwner } from "@/lib/notify";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Briefcase, FileText, CheckCircle, Clock, DollarSign,
  Camera, AlertTriangle, Shield, Plus, Trash2, Edit2, Upload,
  ChevronRight, MapPin, User, Building2, Star
} from "lucide-react";

type Tab = "overview" | "quotes" | "tasks" | "milestones" | "evidence" | "snags" | "compliance" | "changes";

const statusColor: Record<string, string> = {
  posted: "bg-info/15 text-info border-info/20",
  quoted: "bg-warning/15 text-warning border-warning/20",
  active: "bg-success/15 text-success border-success/20",
  awarded: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const taskStatusColor: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-warning/15 text-warning",
  done: "bg-success/15 text-success",
};

const severityColor: Record<string, string> = {
  minor: "bg-info/15 text-info",
  major: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, roles } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sub-data
  const [quotes, setQuotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);

  const isCustomer = job?.customer_profile_id === user?.id;
  const isTrade = roles.includes("trade");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [jobRes, quotesRes, tasksRes, milestonesRes, snagsRes, certsRes, changesRes, evidenceRes] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", id).single(),
        supabase.from("quotes").select("*, quote_lines(*)").eq("job_id", id).order("created_at", { ascending: false }),
        supabase.from("job_tasks").select("*").eq("job_id", id).order("sort_order"),
        supabase.from("job_milestones").select("*").eq("job_id", id).order("sort_order"),
        supabase.from("snag_items").select("*").eq("job_id", id).order("created_at", { ascending: false }),
        supabase.from("compliance_certificates").select("*").eq("job_id", id).order("created_at", { ascending: false }),
        supabase.from("change_orders").select("*").eq("job_id", id).order("created_at", { ascending: false }),
        supabase.from("job_media").select("*").eq("job_id", id).order("created_at", { ascending: false }),
      ]);
      setJob(jobRes.data);
      setQuotes(quotesRes.data ?? []);
      setTasks(tasksRes.data ?? []);
      setMilestones(milestonesRes.data ?? []);
      setSnags(snagsRes.data ?? []);
      setCerts(certsRes.data ?? []);
      setChanges(changesRes.data ?? []);
      setEvidence(evidenceRes.data ?? []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  // --- Quote acceptance ---
  const handleAcceptQuote = async (quoteId: string, tradeCompanyId: string) => {
    const { error: quoteErr } = await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteId);
    if (quoteErr) { toast.error(quoteErr.message); return; }
    // Reject others
    await supabase.from("quotes").update({ status: "rejected" }).eq("job_id", id).neq("id", quoteId);
    // Create job award
    await supabase.from("job_awards").insert({ job_id: id!, accepted_quote_id: quoteId, trade_company_id: tradeCompanyId });
    // Update job status
    await supabase.from("jobs").update({ status: "awarded", trade_company_id: tradeCompanyId }).eq("id", id!);

    // Notify winning trade + audit
    const ownerId = await getCompanyOwner(tradeCompanyId);
    if (ownerId) {
      await notify({
        recipientId: ownerId,
        title: "Your quote was accepted",
        body: `You have been awarded the job${job?.title ? ` "${job.title}"` : ""}.`,
        link: `/jobs/${id}`,
        type: "quote_accepted",
        channels: ["in_app", "email"],
      });
    }
    await logAudit({ action: "quote.accept", entityType: "job", entityId: id, metadata: { quote_id: quoteId, trade_company_id: tradeCompanyId } });

    toast.success("Quote accepted! Job awarded.");
    window.location.reload();
  };

  // --- Add task ---
  const [newTask, setNewTask] = useState("");
  const handleAddTask = async () => {
    if (!newTask.trim() || !id) return;
    const { error } = await supabase.from("job_tasks").insert({ job_id: id, title: newTask.trim(), sort_order: tasks.length });
    if (error) toast.error(error.message);
    else { setNewTask(""); const { data } = await supabase.from("job_tasks").select("*").eq("job_id", id).order("sort_order"); setTasks(data ?? []); }
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("job_tasks").update({ status }).eq("id", taskId);
    const { data } = await supabase.from("job_tasks").select("*").eq("job_id", id!).order("sort_order");
    setTasks(data ?? []);
  };

  // --- Milestones ---
  const [newMilestone, setNewMilestone] = useState({ title: "", amount: "" });
  const handleAddMilestone = async () => {
    if (!newMilestone.title || !id) return;
    await supabase.from("job_milestones").insert({
      job_id: id, title: newMilestone.title, amount: Number(newMilestone.amount) || 0, sort_order: milestones.length
    });
    setNewMilestone({ title: "", amount: "" });
    const { data } = await supabase.from("job_milestones").select("*").eq("job_id", id).order("sort_order");
    setMilestones(data ?? []);
  };

  const handleMilestoneStatus = async (msId: string, status: string) => {
    await supabase.from("job_milestones").update({ status }).eq("id", msId);
    const { data } = await supabase.from("job_milestones").select("*").eq("job_id", id!).order("sort_order");
    setMilestones(data ?? []);
  };

  // --- Snags ---
  const [newSnag, setNewSnag] = useState({ description: "", severity: "minor" });
  const handleAddSnag = async () => {
    if (!newSnag.description || !id) return;
    await supabase.from("snag_items").insert({ job_id: id, description: newSnag.description, severity: newSnag.severity, reported_by: user?.id });
    setNewSnag({ description: "", severity: "minor" });
    const { data } = await supabase.from("snag_items").select("*").eq("job_id", id).order("created_at", { ascending: false });
    setSnags(data ?? []);
  };

  // --- Change orders ---
  const [newChange, setNewChange] = useState({ description: "", cost_delta: "" });
  const handleAddChange = async () => {
    if (!newChange.description || !id || !user) return;
    await supabase.from("change_orders").insert({ job_id: id, description: newChange.description, cost_delta: Number(newChange.cost_delta) || 0, proposed_by: user.id });
    setNewChange({ description: "", cost_delta: "" });
    const { data } = await supabase.from("change_orders").select("*").eq("job_id", id).order("created_at", { ascending: false });
    setChanges(data ?? []);
  };

  const handleChangeStatus = async (coId: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === "accepted") {
      if (isCustomer) updates.signed_by_customer = true;
      if (isTrade) updates.signed_by_trader = true;
      updates.signed_at = new Date().toISOString();
    }
    await supabase.from("change_orders").update(updates).eq("id", coId);
    const { data } = await supabase.from("change_orders").select("*").eq("job_id", id!).order("created_at", { ascending: false });
    setChanges(data ?? []);
  };

  // --- Evidence upload ---
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !id || !user) return;
    const file = e.target.files[0];
    const mediaType = file.type.startsWith("video") ? "video" : "photo";
    const path = `${user.id}/${id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("job-evidence").upload(path, file);
    if (uploadErr) { toast.error(uploadErr.message); return; }
    const { error: dbErr } = await supabase.from("job_media").insert({
      job_id: id, uploaded_by: user.id, storage_path: path, media_type: mediaType,
      captured_at: new Date().toISOString(),
    });
    if (dbErr) toast.error(dbErr.message);
    else {
      toast.success("Evidence uploaded!");
      const { data } = await supabase.from("job_media").select("*").eq("job_id", id).order("created_at", { ascending: false });
      setEvidence(data ?? []);
    }
  };

  // --- Compliance cert ---
  const [newCert, setNewCert] = useState({ cert_type: "gas_safe_cp12", cert_number: "" });
  const handleAddCert = async () => {
    if (!id || !user) return;
    // Get trade company
    const { data: companies } = await supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id);
    if (!companies?.length) { toast.error("No trade company found"); return; }
    await supabase.from("compliance_certificates").insert({
      job_id: id, trade_company_id: companies[0].id,
      cert_type: newCert.cert_type, cert_number: newCert.cert_number,
      issued_by: user.id, issued_date: new Date().toISOString().split("T")[0],
      status: "draft",
    });
    setNewCert({ cert_type: "gas_safe_cp12", cert_number: "" });
    const { data } = await supabase.from("compliance_certificates").select("*").eq("job_id", id).order("created_at", { ascending: false });
    setCerts(data ?? []);
    toast.success("Certificate created");
  };

  const handleCertStatus = async (certId: string, status: string) => {
    await supabase.from("compliance_certificates").update({ status }).eq("id", certId);
    const { data } = await supabase.from("compliance_certificates").select("*").eq("job_id", id!).order("created_at", { ascending: false });
    setCerts(data ?? []);
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="glass-card h-32 animate-pulse" />)}</div>;
  }

  if (!job) {
    return <div className="glass-card p-12 text-center"><p className="text-muted-foreground">Job not found.</p></div>;
  }

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "overview", label: "Overview", icon: Briefcase },
    { key: "quotes", label: "Quotes", icon: FileText, count: quotes.length },
    { key: "tasks", label: "Tasks", icon: CheckCircle, count: tasks.length },
    { key: "milestones", label: "Payments", icon: DollarSign, count: milestones.length },
    { key: "evidence", label: "Evidence", icon: Camera, count: evidence.length },
    { key: "snags", label: "Snags", icon: AlertTriangle, count: snags.length },
    { key: "compliance", label: "Compliance", icon: Shield, count: certs.length },
    { key: "changes", label: "Changes", icon: Edit2, count: changes.length },
  ];

  const certTypes: Record<string, string> = {
    gas_safe_cp12: "Gas Safe CP12",
    gas_safe_cp42: "Gas Safe CP42",
    eicr: "EICR",
    part_p: "Part P",
    rics_survey: "RICS Survey",
    building_regs: "Building Regs",
    generic: "General Certificate",
  };

  return (
    <div className="space-y-6">
      <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      {/* Header */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="capitalize font-medium">{job.requested_trade?.replace("_", " ")}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.city}, {job.postcode}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColor[job.status] ?? ""}>{job.status}</Badge>
            {isTrade && (job.status === "posted" || job.status === "quoted") && (
              <Button asChild size="sm" className="gap-1 font-semibold">
                <Link to={`/jobs/${id}/quote`}><FileText className="h-3.5 w-3.5" />Submit quote</Link>
              </Button>
            )}
          </div>
        </div>
        {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
        {(job.budget_min || job.budget_max) && (
          <div className="text-sm font-medium text-primary">
            Budget: £{job.budget_min?.toLocaleString() ?? "?"} – £{job.budget_max?.toLocaleString() ?? "?"}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${tab === key ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 space-y-1">
                <div className="text-2xl font-bold text-foreground">{quotes.length}</div>
                <div className="text-xs text-muted-foreground">Quotes received</div>
              </div>
              <div className="glass-card p-5 space-y-1">
                <div className="text-2xl font-bold text-foreground">{tasks.filter(t => t.status === "done").length}/{tasks.length}</div>
                <div className="text-xs text-muted-foreground">Tasks completed</div>
              </div>
              <div className="glass-card p-5 space-y-1">
                <div className="text-2xl font-bold text-foreground">£{milestones.filter(m => m.status === "paid").reduce((s: number, m: any) => s + (m.amount ?? 0), 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Paid so far</div>
              </div>
              <div className="glass-card p-5 space-y-1">
                <div className="text-2xl font-bold text-foreground">{snags.filter(s => s.status === "open").length}</div>
                <div className="text-xs text-muted-foreground">Open snags</div>
              </div>
            </div>

            {/* Budget Tracker */}
            {(() => {
              const acceptedQuote = quotes.find((q: any) => q.status === "accepted");
              const quotedTotal = acceptedQuote?.total_amount ?? (job.budget_max || job.budget_min || 0);
              const paidAmount = milestones.filter((m: any) => m.status === "paid").reduce((s: number, m: any) => s + (m.amount ?? 0), 0);
              const pendingAmount = milestones.filter((m: any) => m.status !== "paid").reduce((s: number, m: any) => s + (m.amount ?? 0), 0);
              const changeOrdersCost = changes.filter((c: any) => c.status === "accepted").reduce((s: number, c: any) => s + (c.cost_delta ?? 0), 0);
              const adjustedTotal = quotedTotal + changeOrdersCost;
              const spentPct = adjustedTotal > 0 ? Math.min(100, Math.round((paidAmount / adjustedTotal) * 100)) : 0;

              return quotedTotal > 0 ? (
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Budget Tracker</h3>
                    <span className="text-sm font-medium text-primary">{spentPct}% spent</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500" style={{ width: `${spentPct}%` }} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Quoted</div>
                      <div className="font-semibold">£{quotedTotal.toLocaleString()}</div>
                    </div>
                    {changeOrdersCost !== 0 && (
                      <div>
                        <div className="text-muted-foreground text-xs">Change Orders</div>
                        <div className="font-semibold text-warning">{changeOrdersCost > 0 ? "+" : ""}£{changeOrdersCost.toLocaleString()}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-muted-foreground text-xs">Paid</div>
                      <div className="font-semibold text-success">£{paidAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Remaining</div>
                      <div className="font-semibold">£{Math.max(0, adjustedTotal - paidAmount).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </>
        )}

        {/* QUOTES */}
        {tab === "quotes" && (
          <div className="space-y-4">
            {quotes.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No quotes yet.</div>
            ) : quotes.map((q: any) => (
              <div key={q.id} className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">Quote #{q.id.slice(0, 8)}</div>
                  <Badge variant="outline" className={q.status === "accepted" ? "bg-success/15 text-success" : q.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}>
                    {q.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Labour:</span> <span className="font-medium">£{q.labour_amount.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Materials:</span> <span className="font-medium">£{q.materials_estimate.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-primary">£{(q.total_amount ?? 0).toLocaleString()}</span></div>
                </div>
                {q.quote_lines?.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-1">
                    {q.quote_lines.map((line: any) => (
                      <div key={line.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{line.description} ({line.line_type})</span>
                        <span className="font-medium">{line.quantity} × £{line.unit_price} = £{(line.total ?? 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {q.notes && <p className="text-xs text-muted-foreground">{q.notes}</p>}
                {isCustomer && q.status === "submitted" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="font-semibold" onClick={() => handleAcceptQuote(q.id, q.trade_company_id)}>Accept quote</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      await supabase.from("quotes").update({ status: "rejected" }).eq("id", q.id);
                      const rejOwner = await getCompanyOwner(q.trade_company_id);
                      if (rejOwner) {
                        await notify({
                          recipientId: rejOwner,
                          title: "Quote not selected",
                          body: `Your quote${job?.title ? ` for "${job.title}"` : ""} was not selected this time.`,
                          link: `/jobs/${id}`,
                          type: "quote_rejected",
                        });
                      }
                      await logAudit({ action: "quote.reject", entityType: "quote", entityId: q.id, metadata: { job_id: id } });
                      window.location.reload();
                    }}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TASKS (Kanban-lite) */}
        {tab === "tasks" && (
          <div className="space-y-4">
            {isTrade && (
              <div className="flex gap-2">
                <Input placeholder="Add a task…" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTask()} />
                <Button onClick={handleAddTask} className="shrink-0 gap-1"><Plus className="h-4 w-4" />Add</Button>
              </div>
            )}
            {["todo", "in_progress", "done"].map(status => {
              const items = tasks.filter(t => t.status === status);
              return (
                <div key={status} className="space-y-2">
                  <h3 className="text-sm font-semibold capitalize text-muted-foreground flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${status === "todo" ? "bg-muted-foreground" : status === "in_progress" ? "bg-warning" : "bg-success"}`} />
                    {status.replace("_", " ")} ({items.length})
                  </h3>
                  {items.map(t => (
                    <div key={t.id} className="glass-card p-4 flex items-center justify-between">
                      <span className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                      {isTrade && (
                        <select className="text-xs bg-secondary rounded px-2 py-1 text-foreground border-0" value={t.status} onChange={e => handleTaskStatus(t.id, e.target.value)}>
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* MILESTONES */}
        {tab === "milestones" && (
          <div className="space-y-4">
            {isTrade && (
              <div className="flex gap-2">
                <Input placeholder="Milestone title" value={newMilestone.title} onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })} />
                <Input placeholder="£ Amount" type="number" className="w-32" value={newMilestone.amount} onChange={e => setNewMilestone({ ...newMilestone, amount: e.target.value })} />
                <Button onClick={handleAddMilestone} className="shrink-0 gap-1"><Plus className="h-4 w-4" />Add</Button>
              </div>
            )}
            {milestones.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No payment milestones set.</div>
            ) : milestones.map((ms: any) => (
              <div key={ms.id} className="glass-card p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">{ms.title}</div>
                  <div className="text-sm font-medium text-primary">£{ms.amount.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={ms.status === "paid" ? "bg-success/15 text-success" : ms.status === "approved" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>
                    {ms.status}
                  </Badge>
                  {isCustomer && ms.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => handleMilestoneStatus(ms.id, "approved")}>Approve</Button>
                  )}
                  {isTrade && ms.status === "approved" && (
                    <Button size="sm" onClick={() => handleMilestoneStatus(ms.id, "paid")}>Mark paid</Button>
                  )}
                </div>
              </div>
            ))}
            {milestones.length > 0 && (
              <div className="glass-card p-4 flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Total</span>
                <span className="font-bold text-foreground">£{milestones.reduce((s: number, m: any) => s + (m.amount ?? 0), 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* EVIDENCE */}
        {tab === "evidence" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors flex-1">
                <Upload className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">Upload photo or video</div>
                  <div className="text-xs text-muted-foreground">GPS & timestamp will be recorded</div>
                </div>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleEvidenceUpload} />
              </label>
            </div>
            {evidence.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No evidence uploaded yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {evidence.map((e: any) => {
                  const url = supabase.storage.from("job-evidence").getPublicUrl(e.storage_path).data.publicUrl;
                  return (
                    <div key={e.id} className="glass-card overflow-hidden group">
                      {e.media_type === "video" ? (
                        <video src={url} className="w-full aspect-square object-cover" controls />
                      ) : (
                        <img src={url} alt="" className="w-full aspect-square object-cover" />
                      )}
                      <div className="p-2 text-xs text-muted-foreground">
                        {e.captured_at ? new Date(e.captured_at).toLocaleString("en-GB") : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SNAGS */}
        {tab === "snags" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Describe the snag/defect…" value={newSnag.description} onChange={e => setNewSnag({ ...newSnag, description: e.target.value })} />
              <select className={selectClass + " w-32"} value={newSnag.severity} onChange={e => setNewSnag({ ...newSnag, severity: e.target.value })}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
              <Button onClick={handleAddSnag} className="shrink-0 gap-1"><Plus className="h-4 w-4" />Add</Button>
            </div>
            {snags.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No snags reported.</div>
            ) : snags.map((s: any) => (
              <div key={s.id} className="glass-card p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-foreground">{s.description}</div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={severityColor[s.severity]}>{s.severity}</Badge>
                    <Badge variant="outline">{s.status}</Badge>
                  </div>
                </div>
                {s.status !== "resolved" && isTrade && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    await supabase.from("snag_items").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", s.id);
                    const { data } = await supabase.from("snag_items").select("*").eq("job_id", id!).order("created_at", { ascending: false });
                    setSnags(data ?? []);
                  }}>Resolve</Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* COMPLIANCE */}
        {tab === "compliance" && (
          <div className="space-y-4">
            {isTrade && (
              <div className="flex gap-2">
                <select className={selectClass + " w-48"} value={newCert.cert_type} onChange={e => setNewCert({ ...newCert, cert_type: e.target.value })}>
                  {Object.entries(certTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Input placeholder="Certificate number" value={newCert.cert_number} onChange={e => setNewCert({ ...newCert, cert_number: e.target.value })} />
                <Button onClick={handleAddCert} className="shrink-0 gap-1"><Plus className="h-4 w-4" />Add</Button>
              </div>
            )}
            {certs.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No compliance certificates.</div>
            ) : certs.map((c: any) => (
              <div key={c.id} className="glass-card p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">{certTypes[c.cert_type] ?? c.cert_type}</div>
                  {c.cert_number && <div className="text-sm text-muted-foreground font-mono">#{c.cert_number}</div>}
                  {c.issued_date && <div className="text-xs text-muted-foreground">Issued: {c.issued_date}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={c.status === "issued" ? "bg-success/15 text-success" : c.status === "expired" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}>
                    {c.status}
                  </Badge>
                  {isTrade && c.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => handleCertStatus(c.id, "issued")}>Issue</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHANGE ORDERS */}
        {tab === "changes" && (
          <div className="space-y-4">
            {isTrade && (
              <div className="flex gap-2">
                <Input placeholder="Change description" value={newChange.description} onChange={e => setNewChange({ ...newChange, description: e.target.value })} />
                <Input placeholder="£ ±" type="number" className="w-28" value={newChange.cost_delta} onChange={e => setNewChange({ ...newChange, cost_delta: e.target.value })} />
                <Button onClick={handleAddChange} className="shrink-0 gap-1"><Plus className="h-4 w-4" />Propose</Button>
              </div>
            )}
            {changes.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No change orders.</div>
            ) : changes.map((co: any) => (
              <div key={co.id} className="glass-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{co.description}</div>
                  <Badge variant="outline" className={co.status === "accepted" ? "bg-success/15 text-success" : co.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}>
                    {co.status}
                  </Badge>
                </div>
                <div className="text-sm text-primary font-medium">
                  {co.cost_delta >= 0 ? "+" : ""}£{co.cost_delta.toLocaleString()}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Customer signed: {co.signed_by_customer ? "✓" : "—"}</span>
                  <span>Trader signed: {co.signed_by_trader ? "✓" : "—"}</span>
                </div>
                {isCustomer && co.status === "proposed" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleChangeStatus(co.id, "accepted")}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => handleChangeStatus(co.id, "rejected")}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailPage;
