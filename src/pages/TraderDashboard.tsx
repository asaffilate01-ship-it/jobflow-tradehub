import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, Package, Truck, TrendingUp, FileText, 
  DollarSign, ArrowRight, Clock, CheckCircle, AlertCircle,
  BarChart3, Calendar, Star
} from "lucide-react";
import { Link } from "react-router-dom";

const TraderDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ activeJobs: 0, pendingQuotes: 0, totalOrders: 0, revenue: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchDashboard = async () => {
      const [{ data: companies }, { data: prof }] = await Promise.all([
        supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id),
        supabase.from("profiles").select("full_name, company_name, trade_specialism, rating, verified").eq("id", user.id).single(),
      ]);

      setProfile(prof);
      const companyIds = companies?.map((c) => c.id) ?? [];

      const { data: quotes } = await supabase
        .from("quotes")
        .select("id, status, total_amount, job_id")
        .in("trade_company_id", companyIds.length ? companyIds : ["none"]);

      const pendingQuotes = quotes?.filter((q) => q.status === "submitted").length ?? 0;
      const acceptedQuotes = quotes?.filter((q) => q.status === "accepted") ?? [];
      const revenue = acceptedQuotes.reduce((sum, q) => sum + (q.total_amount ?? 0), 0);

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, requested_trade, city, status, created_at, budget_min, budget_max")
        .in("status", ["posted", "quoted", "awarded", "active"])
        .order("created_at", { ascending: false })
        .limit(6);

      setStats({ activeJobs: acceptedQuotes.length, pendingQuotes, totalOrders: 0, revenue });
      setRecentJobs(jobs ?? []);
      setLoading(false);
    };
    fetchDashboard();
  }, [user]);

  const statusIcon: Record<string, any> = {
    posted: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
    quoted: { icon: FileText, color: "text-info", bg: "bg-info/10" },
    awarded: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    active: { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  };

  const kpis = [
    { label: "Active Jobs", value: stats.activeJobs, icon: Briefcase, color: "text-primary", bgColor: "bg-primary/10", trend: "+2 this week" },
    { label: "Pending Quotes", value: stats.pendingQuotes, icon: FileText, color: "text-info", bgColor: "bg-info/10", trend: "3 awaiting response" },
    { label: "Material Orders", value: stats.totalOrders, icon: Package, color: "text-warning", bgColor: "bg-warning/10", trend: "Order materials →" },
    { label: "Revenue", value: `£${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-success", bgColor: "bg-success/10", trend: "This month" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {profile?.company_name && <span>{profile.company_name}</span>}
            {profile?.verified && (
              <Badge variant="outline" className="text-[10px] border-success/30 text-success gap-1">
                <CheckCircle className="h-3 w-3" /> Verified
              </Badge>
            )}
            {profile?.rating && (
              <span className="flex items-center gap-0.5 text-warning">
                <Star className="h-3 w-3 fill-current" /> {profile.rating}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" className="gap-2 font-semibold">
            <Link to="/materials">
              <Package className="h-4 w-4" />
              Order Materials
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bgColor, trend }) => (
          <div key={label} className="glass-card p-5 space-y-3 hover:border-border/60 transition-colors">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{loading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
            <div className="text-[10px] text-muted-foreground/70">{trend}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { to: "/jobs", icon: Briefcase, iconColor: "text-primary", title: "Browse Jobs", desc: "Find new jobs and submit quotes" },
          { to: "/materials", icon: Package, iconColor: "text-warning", title: "Order Materials", desc: "Compare prices across merchants" },
          { to: "/site-evidence", icon: BarChart3, iconColor: "text-info", title: "Site Evidence", desc: "Capture GPS-stamped photos" },
        ].map(({ to, icon: Icon, iconColor, title, desc }) => (
          <Link key={to} to={to} className="glass-card p-5 hover:border-primary/30 transition-all group flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card border border-border group-hover:border-primary/20">
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Available Jobs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Jobs</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link to="/jobs">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="h-3 w-1/3 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-3">
            <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-medium">No available jobs right now</p>
            <p className="text-xs text-muted-foreground">Check back soon or adjust your trade filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentJobs.map((job) => {
              const si = statusIcon[job.status] ?? statusIcon.posted;
              const StatusIcon = si.icon;
              return (
                <Link key={job.id} to={`/jobs/${job.id}`} className="glass-card p-5 space-y-3 hover:border-primary/30 transition-all group">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">{job.title}</h3>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${si.bg}`}>
                      <StatusIcon className={`h-3.5 w-3.5 ${si.color}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{job.requested_trade.replace("_", " ")}</span>
                    <span className="text-border">•</span>
                    <span>{job.city}</span>
                  </div>
                  {(job.budget_min || job.budget_max) && (
                    <div className="text-sm font-semibold text-primary">
                      £{job.budget_min?.toLocaleString() ?? "?"} – £{job.budget_max?.toLocaleString() ?? "?"}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{job.status}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(job.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TraderDashboard;
