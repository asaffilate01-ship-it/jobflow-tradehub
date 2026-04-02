import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Briefcase, Truck, UserCheck, DollarSign, Shield,
  Activity, AlertTriangle, ScrollText, CreditCard, Clock,
} from "lucide-react";

interface PlatformStats {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalDeliveries: number;
  pendingKyc: number;
  totalAgents: number;
  totalCommissions: number;
  activeSubscribers: number;
}

type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user_id: string;
};

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, totalJobs: 0, activeJobs: 0, totalDeliveries: 0,
    pendingKyc: 0, totalAgents: 0, totalCommissions: 0, activeSubscribers: 0,
  });
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [profiles, jobs, deliveries, kycPending, agents, commissions, subs, logs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id, status"),
        supabase.from("deliveries").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", "submitted"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("agent_commissions").select("amount").eq("status", "pending"),
        supabase.from("marketplace_memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("audit_logs").select("id, action, entity_type, created_at, user_id").order("created_at", { ascending: false }).limit(10),
      ]);

      const jobsData = jobs.data ?? [];
      const activeJobCount = jobsData.filter(j => ["active", "awarded"].includes(j.status)).length;
      const pendingCommTotal = (commissions.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0);

      setStats({
        totalUsers: profiles.count ?? 0,
        totalJobs: jobsData.length,
        activeJobs: activeJobCount,
        totalDeliveries: deliveries.count ?? 0,
        pendingKyc: kycPending.count ?? 0,
        totalAgents: agents.count ?? 0,
        totalCommissions: pendingCommTotal,
        activeSubscribers: subs.count ?? 0,
      });
      setRecentLogs((logs.data as any[]) ?? []);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const kpiCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-info" },
    { title: "Active Subscribers", value: stats.activeSubscribers, icon: CreditCard, color: "text-success" },
    { title: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-primary" },
    { title: "Active Jobs", value: stats.activeJobs, icon: Activity, color: "text-warning" },
    { title: "Deliveries", value: stats.totalDeliveries, icon: Truck, color: "text-info" },
    { title: "Pending KYC", value: stats.pendingKyc, icon: AlertTriangle, color: "text-warning" },
    { title: "Agents", value: stats.totalAgents, icon: UserCheck, color: "text-success" },
    { title: "Pending Payouts", value: `£${stats.totalCommissions.toFixed(2)}`, icon: DollarSign, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "—" : kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Review KYC", href: "/admin/kyc-review", icon: Shield },
              { label: "Manage Users", href: "/admin/users", icon: Users },
              { label: "Agent Oversight", href: "/admin/agents", icon: UserCheck },
              { label: "Send Broadcast", href: "/admin/broadcasts", icon: Activity },
              { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              >
                <action.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Link to="/admin/audit-log" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity logged yet. Actions will appear here as users interact with the platform.</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        <Badge variant="outline" className="text-[9px] mr-1.5 capitalize">
                          {log.action.replace(/\./g, " ")}
                        </Badge>
                        <span className="text-muted-foreground capitalize">{log.entity_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(log.created_at).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
