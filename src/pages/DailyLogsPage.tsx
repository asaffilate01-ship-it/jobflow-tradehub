import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Plus, Cloud, Sun, CloudRain, CloudSnow, Wind,
  Thermometer, Users, Clock, Camera, AlertTriangle, Save,
  CalendarDays, ChevronLeft, ChevronRight, Edit2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const weatherOptions = [
  { value: "clear", label: "Clear", icon: Sun, color: "text-warning" },
  { value: "cloudy", label: "Cloudy", icon: Cloud, color: "text-muted-foreground" },
  { value: "rain", label: "Rain", icon: CloudRain, color: "text-info" },
  { value: "snow", label: "Snow", icon: CloudSnow, color: "text-info" },
  { value: "windy", label: "Windy", icon: Wind, color: "text-muted-foreground" },
];

type DailyLog = {
  id: string;
  job_id: string;
  author_id: string;
  log_date: string;
  weather: string;
  temperature_c: number | null;
  wind: string | null;
  crew_count: number;
  crew_names: string[];
  hours_on_site: number;
  work_summary: string;
  notes: string | null;
  photos: string[];
  safety_incidents: string | null;
  created_at: string;
};

const DailyLogsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [job, setJob] = useState<any>(null);
  const [jobs, setJobs] = useState<{ id: string; title: string; city: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [weather, setWeather] = useState("clear");
  const [tempC, setTempC] = useState<string>("");
  const [windDesc, setWindDesc] = useState("");
  const [crewCount, setCrewCount] = useState<string>("0");
  const [crewNames, setCrewNames] = useState("");
  const [hoursOnSite, setHoursOnSite] = useState<string>("0");
  const [workSummary, setWorkSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [safetyIncidents, setSafetyIncidents] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (jobId) {
        const [{ data: jobData }, { data: logsData }] = await Promise.all([
          supabase.from("jobs").select("id, title, status, city").eq("id", jobId).single(),
          supabase.from("daily_logs").select("*").eq("job_id", jobId).order("log_date", { ascending: false }),
        ]);
        setJob(jobData);
        setLogs((logsData as DailyLog[]) ?? []);
      } else {
        // No jobId — show job picker with recent logs
        const { data: jobsData } = await supabase
          .from("jobs")
          .select("id, title, city")
          .in("status", ["awarded", "active"])
          .order("updated_at", { ascending: false });
        setJobs((jobsData as any[]) ?? []);
      }
      setLoading(false);
    };
    fetchData();
  }, [jobId]);

  const resetForm = () => {
    setLogDate(new Date().toISOString().split("T")[0]);
    setWeather("clear");
    setTempC("");
    setWindDesc("");
    setCrewCount("0");
    setCrewNames("");
    setHoursOnSite("0");
    setWorkSummary("");
    setNotes("");
    setSafetyIncidents("");
    setEditingLog(null);
  };

  const openEdit = (log: DailyLog) => {
    setEditingLog(log);
    setLogDate(log.log_date);
    setWeather(log.weather || "clear");
    setTempC(log.temperature_c?.toString() ?? "");
    setWindDesc(log.wind ?? "");
    setCrewCount(log.crew_count?.toString() ?? "0");
    setCrewNames(log.crew_names?.join(", ") ?? "");
    setHoursOnSite(log.hours_on_site?.toString() ?? "0");
    setWorkSummary(log.work_summary ?? "");
    setNotes(log.notes ?? "");
    setSafetyIncidents(log.safety_incidents ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !jobId) return;
    setSaving(true);

    const payload = {
      job_id: jobId,
      author_id: user.id,
      log_date: logDate,
      weather,
      temperature_c: tempC ? parseInt(tempC) : null,
      wind: windDesc || null,
      crew_count: parseInt(crewCount) || 0,
      crew_names: crewNames ? crewNames.split(",").map((n) => n.trim()) : [],
      hours_on_site: parseFloat(hoursOnSite) || 0,
      work_summary: workSummary,
      notes: notes || null,
      safety_incidents: safetyIncidents || null,
      photos: editingLog?.photos ?? [],
    };

    let error;
    if (editingLog) {
      ({ error } = await supabase.from("daily_logs").update(payload).eq("id", editingLog.id));
    } else {
      ({ error } = await supabase.from("daily_logs").insert(payload));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingLog ? "Log updated" : "Daily log saved");
      const { data: refreshed } = await supabase.from("daily_logs").select("*").eq("job_id", jobId).order("log_date", { ascending: false });
      setLogs((refreshed as DailyLog[]) ?? []);
      setShowForm(false);
      resetForm();
    }
    setSaving(false);
  };

  const handleDelete = async (logId: string) => {
    const { error } = await supabase.from("daily_logs").delete().eq("id", logId);
    if (error) toast.error(error.message);
    else {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      toast.success("Log deleted");
    }
  };

  const WeatherIcon = weatherOptions.find((w) => w.value === weather)?.icon ?? Sun;

  if (loading) {
  // No jobId — show job picker
  if (!jobId) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Daily Logs</h1>
          <p className="text-sm text-muted-foreground">Select a job to view or create daily logs</p>
        </div>
        {jobs.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3">
            <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <h3 className="text-lg font-semibold">No active jobs</h3>
            <p className="text-sm text-muted-foreground">Daily logs are available once you have an awarded or active job.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {jobs.map((j) => (
              <Link
                key={j.id}
                to={`/daily-logs/${j.id}`}
                className="glass-card p-5 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.city}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 animate-pulse space-y-3">
            <div className="h-4 w-1/3 bg-muted rounded" />
            <div className="h-3 w-2/3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Daily Logs</h1>
          {job && (
            <p className="text-sm text-muted-foreground">
              {job.title} · {job.city}
            </p>
          )}
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 font-semibold">
          <Plus className="h-4 w-4" /> New Log
        </Button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {editingLog ? "Edit Daily Log" : "New Daily Log"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date + Weather row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Weather</label>
                    <div className="flex gap-2">
                      {weatherOptions.map((w) => (
                        <button
                          key={w.value}
                          onClick={() => setWeather(w.value)}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                            weather === w.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <w.icon className={`h-5 w-5 ${weather === w.value ? "text-primary" : w.color}`} />
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Temp + Wind */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Thermometer className="h-3.5 w-3.5 text-muted-foreground" /> Temperature (°C)
                    </label>
                    <Input type="number" placeholder="e.g. 14" value={tempC} onChange={(e) => setTempC(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Wind className="h-3.5 w-3.5 text-muted-foreground" /> Wind
                    </label>
                    <Input placeholder="e.g. Light breeze" value={windDesc} onChange={(e) => setWindDesc(e.target.value)} />
                  </div>
                </div>

                {/* Crew */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" /> Crew Count
                    </label>
                    <Input type="number" value={crewCount} onChange={(e) => setCrewCount(e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Crew Names (comma-separated)</label>
                    <Input placeholder="John, Steve, Amy" value={crewNames} onChange={(e) => setCrewNames(e.target.value)} />
                  </div>
                </div>

                {/* Hours */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Hours on site
                  </label>
                  <Input type="number" step="0.5" value={hoursOnSite} onChange={(e) => setHoursOnSite(e.target.value)} />
                </div>

                {/* Work summary */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Work Summary *</label>
                  <Textarea
                    placeholder="Describe the work completed today..."
                    rows={4}
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Notes</label>
                  <Textarea
                    placeholder="Delays, visitors, deliveries, etc."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Safety incidents */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Safety Incidents
                  </label>
                  <Textarea
                    placeholder="Report any incidents or near-misses..."
                    rows={2}
                    value={safetyIncidents}
                    onChange={(e) => setSafetyIncidents(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving || !workSummary.trim()} className="gap-2 font-semibold">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : editingLog ? "Update Log" : "Save Log"}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log entries */}
      {logs.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h3 className="text-lg font-semibold">No daily logs yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Start recording daily progress — weather, crew, work completed, and any incidents.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log, i) => {
            const wOpt = weatherOptions.find((w) => w.value === log.weather);
            const WIcon = wOpt?.icon ?? Sun;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 hover:border-primary/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {new Date(log.log_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <WIcon className={`h-3.5 w-3.5 ${wOpt?.color}`} />
                          {wOpt?.label}
                          {log.temperature_c !== null && <span>· {log.temperature_c}°C</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {log.crew_count} crew
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {log.hours_on_site}h
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(log)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(log.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 pl-14 space-y-2">
                  <p className="text-sm text-foreground whitespace-pre-line">{log.work_summary}</p>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground italic">{log.notes}</p>
                  )}
                  {log.crew_names && log.crew_names.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.crew_names.map((name) => (
                        <Badge key={name} variant="outline" className="text-[10px] py-0">{name}</Badge>
                      ))}
                    </div>
                  )}
                  {log.safety_incidents && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">{log.safety_incidents}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyLogsPage;
