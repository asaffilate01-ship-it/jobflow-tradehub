import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Briefcase, Package, Truck, TrendingUp, FileText,
  DollarSign, ArrowRight, Clock, CheckCircle, AlertCircle,
  BarChart3, Calendar, Star, Camera, MessageCircle, Shield,
  Activity, Users, Zap, ChevronRight, CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { usePageMeta } from "@/hooks/use-page-meta";

const TraderDashboard = () => {
  usePageMeta("Trader portal");
  const { user } = useAuth();
  const [stats, setStats] = useState({ activeJobs: 0, pendingQuotes: 0, totalOrders: 0, revenue: 0, completedJobs: 0, evidenceCount: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchDashboard = async () => {
      const [{ data: companies }, { data: prof }] = await Promise.all([
        supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id),
        supabase.from("profiles").select("full_name, company_name, trade_specialism, rating, verified, kyc_status").eq("id", user.id).single(),
      ]);

      setProfile(prof);
      const companyIds = companies?.map((c) => c.id) ?? [];

      const [{ data: quotes }, { data: jobs }, { data: awards }] = await Promise.all([
        supabase.from("quotes").select("id, status, total_amount").in("trade_company_id", companyIds.length ? companyIds : ["none"]),
        supabase.from("jobs").select("id, title, requested_trade, city, status, created_at, budget_min, budget_max").in("status", ["posted", "quoted", "awarded", "active"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("job_awards").select("job_id").in("trade_company_id", companyIds.length ? companyIds : ["none"]),
      ]);

      const pendingQuotes = quotes?.filter((q) => q.status === "submitted").length ?? 0;
      const acceptedQuotes = quotes?.filter((q) => q.status === "accepted") ?? [];
      const revenue = acceptedQuotes.reduce((sum, q) => sum + (q.total_amount ?? 0), 0);
      const awardedJobIds = awards?.map((a) => a.job_id) ?? [];

      if (awardedJobIds.length) {
        const { data: milestones } = await supabase
          .from("job_milestones")
          .select("id, title, due_date, status, amount, job_id")
          .in("job_id", awardedJobIds)
          .eq("status", "pending")
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(5);
        setUpcomingMilestones(milestones ?? []);

        const { data: logs } = await supabase
          .from("daily_logs")
          .select("id, log_date, work_summary, weather, crew_count, hours_on_site, job_id")
          .in("job_id", awardedJobIds)
          .order("log_date", { ascending: false })
          .limit(3);
        setRecentLogs(logs ?? []);
      }

      const { count: evidenceCount } = await supabase
        .from("job_media")
        .select("id", { count: "exact", head: true })
        .eq("uploaded_by", user.id);

      setStats({ activeJobs: acceptedQuotes.length, pendingQuotes, totalOrders: 0, revenue, completedJobs: 0, evidenceCount: evidenceCount ?? 0 });
      setRecentJobs(jobs ?? []);
      setLoading(false);
    };
    fetchDashboard();
  }, [user]);

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    posted: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
    quoted: { icon: FileText, color: "text-info", bg: "bg-info/10" },
    awarded: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    active: { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  };

  const kpis = [
    { label: "Active Jobs", value: stats.activeJobs, icon: Briefcase, color: "text-primary", bgColor: "bg-primary/10", link: "/jobs" },
    { label: "Pending Quotes", value: stats.pendingQuotes, icon: FileText, color: "text-info", bgColor: "bg-info/10", link: "/jobs" },
    { label: "Evidence Captured", value: stats.evidenceCount, icon: Camera, color: "text-warning", bgColor: "bg-warning/10", link: "/site-evidence" },
    { label: "Revenue", value: `£${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-success", bgColor: "bg-success/10", link: "#" },
  ];

  const quickActions = [
    { to: "/jobs", icon: Briefcase, iconColor: "text-primary", title: "Browse Jobs", desc: "Find new jobs & submit quotes" },
    { to: "/materials", icon: Package, iconColor: "text-warning", title: "Order Materials", desc: "Compare prices across merchants" },
    { to: "/site-evidence", icon: Camera, iconColor: "text-info", title: "Site Evidence", desc: "Capture GPS-stamped photos" },
    { to: "/schedule", icon: Calendar, iconColor: "text-accent", title: "Schedule", desc: "View milestones & deadlines" },
    { to: "/messages", icon: MessageCircle, iconColor: "text-success", title: "Messages", desc: "Chat with customers" },
    { to: "/compliance", icon: Shield, iconColor: "text-destructive", title: "Certificates", desc: "Manage compliance docs" },
  ];

  return (
    <div className="space-y-8 page-enter">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {profile?.company_name && <span className="font-medium">{profile.company_name}</span>}
            {profile?.verified && (
              <Badge variant="outline" className="text-[10px] border-success/30 text-success gap-1 bg-success/5">
                <CheckCircle className="h-3 w-3" /> Verified
              </Badge>
            )}
            {profile?.rating && (
              <span className="flex items-center gap-0.5 text-primary font-medium">
                <Star className="h-3 w-3 fill-current" /> {profile.rating}
              </span>
            )}
            {profile?.kyc_status === "approved" && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1 bg-primary/5">
                <Shield className="h-3 w-3" /> KYC Approved
              </Badge>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="gap-2 font-semibold hidden sm:flex shadow-sm">
          <Link to="/materials">
            <Package className="h-4 w-4" /> Order Materials
          </Link>
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bgColor, link }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link to={link} className="stat-card p-5 space-y-3 hover:border-primary/20 block group">
              <div className="flex items-center justify-between">
                <div className={`icon-container icon-container-md ${bgColor} group-hover:scale-105 transition-transform`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {loading ? <div className="skeleton-shimmer h-7 w-16" /> : value}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick actions grid */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(({ to, icon: Icon, iconColor, title, desc }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
            >
              <Link to={to} className="glass-card p-4 hover:border-primary/20 group text-center block h-full">
                <div className="icon-container icon-container-md mx-auto bg-card border border-border group-hover:border-primary/20 group-hover:bg-primary/5 mb-2.5 transition-all">
                  <Icon className={`h-5 w-5 ${iconColor} group-hover:scale-110 transition-transform`} />
                </div>
                <h3 className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block leading-relaxed">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent daily logs */}
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="icon-container icon-container-sm bg-primary/10">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                Recent Daily Logs
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary gap-1 text-xs hover:bg-primary/5">
                <Link to="/schedule">View all <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="skeleton-shimmer h-14" />)}
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="empty-state py-8">
                  <CalendarDays className="empty-state-icon" />
                  <p className="empty-state-desc">No daily logs recorded yet. Start logging your work to keep customers informed.</p>
                </div>
              ) : (
                recentLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                    <div className="icon-container icon-container-sm bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{log.work_summary}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{new Date(log.log_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        <span>· {log.crew_count} crew · {log.hours_on_site}h</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Available Jobs */}
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="icon-container icon-container-sm bg-primary/10">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                Available Jobs
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary gap-1 text-xs hover:bg-primary/5">
                <Link to="/jobs">View all <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-shimmer h-24" />)}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="empty-state py-10">
                  <Briefcase className="empty-state-icon" />
                  <p className="empty-state-title">No available jobs</p>
                  <p className="empty-state-desc">New jobs in your area will appear here. Check back soon!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {recentJobs.map((job) => {
                    const si = statusConfig[job.status] ?? statusConfig.posted;
                    const StatusIcon = si.icon;
                    return (
                      <Link key={job.id} to={`/jobs/${job.id}`} className="p-3.5 rounded-xl border border-border hover:border-primary/20 hover:shadow-sm transition-all group">
                        <div className="flex items-start justify-between mb-1.5">
                          <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{job.title}</h3>
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${si.bg}`}>
                            <StatusIcon className={`h-3 w-3 ${si.color}`} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{job.requested_trade?.replace("_", " ")}</span>
                          <span className="text-border">·</span>
                          <span>{job.city}</span>
                        </div>
                        {(job.budget_min || job.budget_max) && (
                          <div className="text-sm font-bold text-primary mt-2 tabular-nums">
                            £{job.budget_min?.toLocaleString() ?? "?"} – £{job.budget_max?.toLocaleString() ?? "?"}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar widgets */}
        <div className="space-y-6">
          {/* Upcoming milestones */}
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="icon-container icon-container-sm bg-warning/10">
                  <Activity className="h-4 w-4 text-warning" />
                </div>
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton-shimmer h-12" />)}
                </div>
              ) : upcomingMilestones.length === 0 ? (
                <div className="empty-state py-8">
                  <Activity className="empty-state-icon" />
                  <p className="empty-state-desc">No upcoming milestones. Win a job to see your timeline here.</p>
                </div>
              ) : (
                upcomingMilestones.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="icon-container icon-container-sm bg-warning/10">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{m.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Due {new Date(m.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {m.amount > 0 && (
                      <span className="text-xs font-bold text-primary tabular-nums">£{m.amount.toLocaleString()}</span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Activity feed */}
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="icon-container icon-container-sm bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { text: "New job posted in your area", time: "2 min ago", icon: Briefcase, color: "bg-info/10 text-info" },
                  { text: "Quote accepted by customer", time: "1 hr ago", icon: CheckCircle, color: "bg-success/10 text-success" },
                  { text: "Evidence uploaded to site", time: "3 hrs ago", icon: Camera, color: "bg-warning/10 text-warning" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 group">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.color.split(" ")[0]} mt-0.5`}>
                      <item.icon className={`h-3.5 w-3.5 ${item.color.split(" ")[1]}`} />
                    </div>
                    <div>
                      <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
                      <p className="text-[10px] text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TraderDashboard;
