import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Truck, UserCheck, DollarSign, Shield, Activity, AlertTriangle } from "lucide-react";

interface PlatformStats {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalDeliveries: number;
  pendingKyc: number;
  totalAgents: number;
  totalCommissions: number;
  activeTraders: number;
}

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, totalJobs: 0, activeJobs: 0, totalDeliveries: 0,
    pendingKyc: 0, totalAgents: 0, totalCommissions: 0, activeTraders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [profiles, jobs, deliveries, kycPending, agents, commissions] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id, status"),
        supabase.from("deliveries").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", "submitted"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("agent_commissions").select("amount").eq("status", "pending"),
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
        activeTraders: 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const kpiCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-emerald-500" },
    { title: "Active Jobs", value: stats.activeJobs, icon: Activity, color: "text-orange-500" },
    { title: "Deliveries", value: stats.totalDeliveries, icon: Truck, color: "text-purple-500" },
    { title: "Pending KYC", value: stats.pendingKyc, icon: AlertTriangle, color: "text-amber-500" },
    { title: "Agents", value: stats.totalAgents, icon: UserCheck, color: "text-teal-500" },
    { title: "Pending Payouts", value: `£${stats.totalCommissions.toFixed(2)}`, icon: DollarSign, color: "text-green-500" },
    { title: "KYC Alerts", value: stats.pendingKyc, icon: Shield, color: "text-red-500" },
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
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              >
                <action.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Platform activity feed coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
