import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase, CheckCircle, Clock, DollarSign, Camera,
  AlertTriangle, MapPin, ArrowRight, Calendar, CloudSun,
  Users, FileText, ChevronRight, Star, Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { usePageMeta } from "@/hooks/use-page-meta";

const statusColor: Record<string, string> = {
  posted: "bg-info/15 text-info border-info/20",
  quoted: "bg-warning/15 text-warning border-warning/20",
  active: "bg-success/15 text-success border-success/20",
  awarded: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const weatherEmoji: Record<string, string> = {
  clear: "☀️", sunny: "☀️", cloudy: "☁️", overcast: "🌥️",
  rain: "🌧️", snow: "❄️", wind: "💨", fog: "🌫️",
};

const CustomerPortalPage = () => {
  usePageMeta("My dashboard");
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Detail data
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("customer_profile_id", user.id)
        .order("created_at", { ascending: false });
      setJobs(data ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const loadJobDetail = async (job: any) => {
    setSelectedJob(job);
    const [ms, tk, dl, ev, sn, qt] = await Promise.all([
      supabase.from("job_milestones").select("*").eq("job_id", job.id).order("sort_order"),
      supabase.from("job_tasks").select("*").eq("job_id", job.id).order("sort_order"),
      supabase.from("daily_logs").select("*").eq("job_id", job.id).order("log_date", { ascending: false }).limit(5),
      supabase.from("job_media").select("*").eq("job_id", job.id).order("created_at", { ascending: false }).limit(8),
      supabase.from("snag_items").select("*").eq("job_id", job.id).order("created_at", { ascending: false }),
      supabase.from("quotes").select("*, quote_lines(*)").eq("job_id", job.id).order("created_at", { ascending: false }),
    ]);
    setMilestones(ms.data ?? []);
    setTasks(tk.data ?? []);
    setDailyLogs(dl.data ?? []);
    setEvidence(ev.data ?? []);
    setSnags(sn.data ?? []);
    setQuotes(qt.data ?? []);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-48 animate-pulse" />)}
        </div>
      </div>
    );
  }

  // ---- Detail view ----
  if (selectedJob) {
    const totalMilestones = milestones.length;
    const paidMilestones = milestones.filter(m => m.status === "paid").length;
    const completedTasks = tasks.filter(t => t.status === "done").length;
    const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const totalBudget = milestones.reduce((s: number, m: any) => s + (m.amount ?? 0), 0);
    const paidAmount = milestones.filter(m => m.status === "paid").reduce((s: number, m: any) => s + (m.amount ?? 0), 0);
    const acceptedQuote = quotes.find((q: any) => q.status === "accepted");
    const openSnags = snags.filter(s => s.status === "open").length;

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedJob(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          ← Back to my projects
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">{selectedJob.title}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="capitalize">{selectedJob.requested_trade?.replace("_", " ")}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedJob.city}, {selectedJob.postcode}</span>
                </div>
              </div>
              <Badge variant="outline" className={statusColor[selectedJob.status] ?? ""}>{selectedJob.status}</Badge>
            </div>
            {selectedJob.description && <p className="mt-3 text-sm text-muted-foreground">{selectedJob.description}</p>}
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><CheckCircle className="h-3.5 w-3.5" />Tasks</div>
              <div className="text-xl font-bold">{completedTasks}/{tasks.length}</div>
              <Progress value={taskProgress} className="h-1.5" />
            </div>
            <div className="glass-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><DollarSign className="h-3.5 w-3.5" />Paid</div>
              <div className="text-xl font-bold">£{paidAmount.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">of £{totalBudget.toLocaleString()} milestones</div>
            </div>
            <div className="glass-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Camera className="h-3.5 w-3.5" />Evidence</div>
              <div className="text-xl font-bold">{evidence.length}</div>
              <div className="text-[10px] text-muted-foreground">photos & videos</div>
            </div>
            <div className="glass-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><AlertTriangle className="h-3.5 w-3.5" />Open Snags</div>
              <div className="text-xl font-bold">{openSnags}</div>
              <div className="text-[10px] text-muted-foreground">{snags.length} total reported</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Milestones / Payment schedule */}
            <div className="glass-card p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Payment Milestones</h2>
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No milestones set yet.</p>
              ) : (
                <div className="space-y-3">
                  {milestones.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        m.status === "paid" ? "bg-success/20 text-success" : m.status === "approved" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{m.title}</div>
                        <div className="text-xs text-muted-foreground">£{m.amount?.toLocaleString()}</div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${m.status === "paid" ? "bg-success/15 text-success" : ""}`}>{m.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent daily logs */}
            <div className="glass-card p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Recent Site Updates</h2>
              {dailyLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No daily logs recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {dailyLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-lg bg-secondary/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{new Date(log.log_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {log.weather && <span>{weatherEmoji[log.weather] ?? "🌤️"} {log.weather}</span>}
                          {log.crew_count > 0 && <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{log.crew_count}</span>}
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{log.work_summary}</p>
                      {log.hours_on_site > 0 && <div className="text-[10px] text-muted-foreground">{log.hours_on_site}h on site</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks list */}
            <div className="glass-card p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Task Progress</h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks created yet.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 text-sm">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${t.status === "done" ? "bg-success" : t.status === "in_progress" ? "bg-warning" : "bg-muted-foreground/30"}`} />
                      <span className={`flex-1 ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{t.status.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Snags */}
            <div className="glass-card p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" />Snag List</h2>
              {snags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No snags reported — looking good!</p>
              ) : (
                <div className="space-y-2">
                  {snags.map(s => (
                    <div key={s.id} className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className={`text-[10px] ${s.severity === "critical" ? "bg-destructive/15 text-destructive" : s.severity === "major" ? "bg-warning/15 text-warning" : "bg-info/15 text-info"}`}>{s.severity}</Badge>
                      <span className="flex-1 truncate">{s.description}</span>
                      <span className={`text-[10px] ${s.status === "open" ? "text-warning" : "text-success"}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Evidence gallery */}
          {evidence.length > 0 && (
            <div className="glass-card p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4 text-primary" />Site Evidence</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {evidence.map(e => {
                  const url = supabase.storage.from("job-evidence").getPublicUrl(e.storage_path).data.publicUrl;
                  return (
                    <div key={e.id} className="aspect-square rounded-lg overflow-hidden bg-secondary">
                      {e.media_type === "photo" ? (
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <video src={url} className="w-full h-full object-cover" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accepted quote summary */}
          {acceptedQuote && (
            <div className="glass-card p-5 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Accepted Quote</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Labour:</span> <span className="font-medium">£{acceptedQuote.labour_amount?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Materials:</span> <span className="font-medium">£{acceptedQuote.materials_estimate?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-primary">£{(acceptedQuote.total_amount ?? 0).toLocaleString()}</span></div>
              </div>
            </div>
          )}

          {/* Link to full job detail */}
          <Button asChild variant="outline" className="w-full gap-2">
            <Link to={`/jobs/${selectedJob.id}`}>
              View full job detail <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // ---- Projects list ----
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">Track progress on your jobs in real-time</p>
      </div>

      {jobs.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">You haven't posted any jobs yet.</p>
          <Button asChild><Link to="/post-job">Post your first job</Link></Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job, i) => (
            <motion.button
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => loadJobDetail(job)}
              className="glass-card p-5 space-y-3 hover:border-primary/30 transition-colors text-left w-full"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <Badge variant="outline" className={statusColor[job.status] ?? ""}>{job.status}</Badge>
              </div>
              <h3 className="font-semibold text-foreground">{job.title}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="capitalize">{job.requested_trade?.replace("_", " ")}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.city}</span>
              </div>
              {(job.budget_min || job.budget_max) && (
                <div className="text-sm font-medium text-primary">
                  £{job.budget_min?.toLocaleString() ?? "?"} – £{job.budget_max?.toLocaleString() ?? "?"}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-primary font-medium pt-1">
                View progress <ChevronRight className="h-3 w-3" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerPortalPage;
