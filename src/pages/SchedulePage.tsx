import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, Calendar as CalIcon, Briefcase,
  Flag, CheckCircle, Clock, AlertCircle, LayoutList,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

type ScheduleItem = {
  id: string;
  title: string;
  date: string;
  type: "milestone" | "task" | "job";
  status: string;
  jobTitle?: string;
  jobId: string;
  amount?: number;
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-info/15 text-info border-info/20",
  completed: "bg-success/15 text-success border-success/20",
  done: "bg-success/15 text-success border-success/20",
  posted: "bg-primary/15 text-primary border-primary/20",
  active: "bg-primary/15 text-primary border-primary/20",
  awarded: "bg-warning/15 text-warning border-warning/20",
};

const typeIcons = {
  milestone: Flag,
  task: CheckCircle,
  job: Briefcase,
};

const SchedulePage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"calendar" | "list">("calendar");

  useEffect(() => {
    if (!user) return;
    const fetchSchedule = async () => {
      const { data: companies } = await supabase
        .from("trade_companies").select("id").eq("owner_profile_id", user.id);
      const companyIds = companies?.map((c) => c.id) ?? [];
      if (!companyIds.length) { setLoading(false); return; }

      const { data: awards } = await supabase
        .from("job_awards").select("job_id").in("trade_company_id", companyIds);
      const awardedJobIds = awards?.map((a) => a.job_id) ?? [];

      const results: ScheduleItem[] = [];

      // Milestones
      if (awardedJobIds.length) {
        const { data: milestones } = await supabase
          .from("job_milestones")
          .select("id, title, due_date, status, amount, job_id, jobs(title)")
          .in("job_id", awardedJobIds)
          .not("due_date", "is", null);
        milestones?.forEach((m: any) => {
          results.push({
            id: m.id,
            title: m.title,
            date: m.due_date,
            type: "milestone",
            status: m.status,
            jobTitle: m.jobs?.title,
            jobId: m.job_id,
            amount: m.amount,
          });
        });

        // Tasks
        const { data: tasks } = await supabase
          .from("job_tasks")
          .select("id, title, status, created_at, job_id, jobs(title)")
          .in("job_id", awardedJobIds);
        tasks?.forEach((t: any) => {
          results.push({
            id: t.id,
            title: t.title,
            date: t.created_at?.split("T")[0],
            type: "task",
            status: t.status,
            jobTitle: t.jobs?.title,
            jobId: t.job_id,
          });
        });
      }

      // Active jobs with target_start_date
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, target_start_date, status")
        .in("trade_company_id", companyIds)
        .not("target_start_date", "is", null);
      jobs?.forEach((j) => {
        results.push({
          id: j.id,
          title: j.title,
          date: j.target_start_date!,
          type: "job",
          status: j.status,
          jobTitle: j.title,
          jobId: j.id,
        });
      });

      setItems(results);
      setLoading(false);
    };
    fetchSchedule();
  }, [user]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon start

  const monthLabel = currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const itemsByDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    items.forEach((item) => {
      const d = item.date?.split("T")[0];
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(item);
    });
    return map;
  }, [items]);

  const listItems = useMemo(() => {
    return [...items]
      .filter((i) => {
        const d = new Date(i.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items, month, year]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Milestones, tasks, and job timelines</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setView("calendar")}
          >
            <CalIcon className="h-4 w-4" /> Calendar
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setView("list")}
          >
            <LayoutList className="h-4 w-4" /> List
          </Button>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between glass-card p-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-foreground">{monthLabel}</span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      ) : view === "calendar" ? (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayItems = itemsByDate[dateStr] ?? [];
              const isToday = dateStr === today;
              return (
                <div
                  key={day}
                  className={`min-h-[72px] sm:min-h-[90px] rounded-lg border p-1 text-xs transition-colors ${
                    isToday ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className={`font-medium mb-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map((item) => {
                      const TypeIcon = typeIcons[item.type];
                      return (
                        <Link
                          key={item.id}
                          to={item.type === "job" ? `/jobs/${item.jobId}` : `/jobs/${item.jobId}`}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-tight truncate border ${
                            statusColors[item.status] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          <TypeIcon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                    {dayItems.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-1">+{dayItems.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {listItems.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <CalIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <h3 className="text-lg font-semibold">Nothing scheduled this month</h3>
              <p className="text-sm text-muted-foreground">Milestones and tasks with dates will appear here.</p>
            </div>
          ) : (
            listItems.map((item, i) => {
              const TypeIcon = typeIcons[item.type];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={`/jobs/${item.jobId}`}
                    className="glass-card p-4 flex items-center gap-4 hover:border-primary/20 transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.jobTitle} · {new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[item.status] ?? ""}`}>
                      {item.status.replace("_", " ")}
                    </Badge>
                    {item.amount !== undefined && item.amount > 0 && (
                      <span className="text-sm font-semibold text-primary">£{item.amount.toLocaleString()}</span>
                    )}
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Flag className="h-3 w-3 text-primary" /> Milestone</span>
        <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-success" /> Task</span>
        <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-info" /> Job start</span>
      </div>
    </div>
  );
};

export default SchedulePage;
