import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6"];

const AgentAnalyticsPage = () => {
  const { user } = useAuth();

  const { data: agent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("profile_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ["agent-referrals-analytics", agent?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agent_referrals").select("*").eq("agent_id", agent!.id);
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  const { data: commissions } = useQuery({
    queryKey: ["agent-commissions-analytics", agent?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agent_commissions").select("*").eq("agent_id", agent!.id);
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  // Referral by type breakdown
  const typeBreakdown = (referrals ?? []).reduce((acc: Record<string, number>, r) => {
    acc[r.referral_type] = (acc[r.referral_type] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(typeBreakdown).map(([name, value]) => ({ name, value }));

  // Monthly referrals (last 6 months)
  const monthlyData = (() => {
    const months: { month: string; count: number; earnings: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });
      const count = (referrals ?? []).filter(r => r.created_at.startsWith(key)).length;
      const earnings = (commissions ?? []).filter(c => c.created_at.startsWith(key)).reduce((s, c) => s + Number(c.amount), 0);
      months.push({ month: label, count, earnings });
    }
    return months;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Performance metrics and trends.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Referrals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referral Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => `£${v.toFixed(2)}`} />
                <Bar dataKey="earnings" fill="#10b981" radius={[4, 4, 0, 0]} name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentAnalyticsPage;
