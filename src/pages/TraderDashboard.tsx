import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Briefcase, Package, Truck, TrendingUp, Plus, Users, 
  FileText, DollarSign, Clock, CheckCircle, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const TraderDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ activeJobs: 0, pendingQuotes: 0, totalOrders: 0, revenue: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDashboard = async () => {
      // Fetch jobs where this trader's company is involved
      const { data: companies } = await supabase
        .from("trade_companies")
        .select("id")
        .eq("owner_profile_id", user.id);

      const companyIds = companies?.map((c) => c.id) ?? [];

      // Fetch quotes by this trade
      const { data: quotes } = await supabase
        .from("quotes")
        .select("id, status, total_amount, job_id")
        .in("trade_company_id", companyIds.length ? companyIds : ["none"]);

      const pendingQuotes = quotes?.filter((q) => q.status === "submitted").length ?? 0;
      const acceptedQuotes = quotes?.filter((q) => q.status === "accepted") ?? [];
      const revenue = acceptedQuotes.reduce((sum, q) => sum + (q.total_amount ?? 0), 0);

      // Fetch recent posted jobs
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, requested_trade, city, status, created_at, budget_min, budget_max")
        .in("status", ["posted", "quoted", "awarded", "active"])
        .order("created_at", { ascending: false })
        .limit(6);

      setStats({
        activeJobs: acceptedQuotes.length,
        pendingQuotes,
        totalOrders: 0,
        revenue,
      });
      setRecentJobs(jobs ?? []);
      setLoading(false);
    };
    fetchDashboard();
  }, [user]);

  const kpis = [
    { label: "Active Jobs", value: stats.activeJobs, icon: Briefcase, color: "text-primary" },
    { label: "Pending Quotes", value: stats.pendingQuotes, icon: FileText, color: "text-info" },
    { label: "Material Orders", value: stats.totalOrders, icon: Package, color: "text-warning" },
    { label: "Revenue", value: `£${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your trade business at a glance</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/trade-accounts">
              <Users className="h-4 w-4" />
              Trade Accounts
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2 font-semibold">
            <Link to="/materials">
              <Package className="h-4 w-4" />
              Order Materials
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <Icon className={`h-5 w-5 ${color}`} />
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/jobs" className="glass-card p-5 hover:border-primary/30 transition-colors group">
          <Briefcase className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Browse Jobs</h3>
          <p className="text-xs text-muted-foreground mt-1">Find new jobs and submit quotes</p>
        </Link>
        <Link to="/materials" className="glass-card p-5 hover:border-primary/30 transition-colors group">
          <Package className="h-6 w-6 text-warning mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Order Materials</h3>
          <p className="text-xs text-muted-foreground mt-1">Compare prices across merchants</p>
        </Link>
        <Link to="/deliveries" className="glass-card p-5 hover:border-primary/30 transition-colors group">
          <Truck className="h-6 w-6 text-info mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Deliveries</h3>
          <p className="text-xs text-muted-foreground mt-1">Track your material deliveries</p>
        </Link>
      </div>

      {/* Available Jobs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Jobs</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link to="/jobs">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="glass-card p-5 h-32 animate-pulse" />)}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground">No available jobs right now.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentJobs.map((job) => (
              <div key={job.id} className="glass-card p-5 space-y-2 hover:border-primary/30 transition-colors">
                <h3 className="font-semibold text-foreground text-sm">{job.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{job.requested_trade.replace("_", " ")}</span>
                  <span>{job.city}</span>
                </div>
                {(job.budget_min || job.budget_max) && (
                  <div className="text-sm font-medium text-primary">
                    £{job.budget_min?.toLocaleString() ?? "?"} – £{job.budget_max?.toLocaleString() ?? "?"}
                  </div>
                )}
                <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TraderDashboard;
