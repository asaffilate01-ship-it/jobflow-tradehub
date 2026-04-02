import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

const AdminAnalyticsPage = () => {
  const [jobsByStatus, setJobsByStatus] = useState<{ name: string; count: number }[]>([]);
  const [jobsByMonth, setJobsByMonth] = useState<{ month: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: jobs } = await supabase.from("jobs").select("status, created_at");
      if (!jobs) { setLoading(false); return; }

      // Jobs by status
      const statusCount: Record<string, number> = {};
      jobs.forEach((j) => {
        statusCount[j.status] = (statusCount[j.status] ?? 0) + 1;
      });
      setJobsByStatus(Object.entries(statusCount).map(([name, count]) => ({ name, count })));

      // Jobs by month
      const monthCount: Record<string, number> = {};
      jobs.forEach((j) => {
        const m = j.created_at.substring(0, 7);
        monthCount[m] = (monthCount[m] ?? 0) + 1;
      });
      setJobsByMonth(
        Object.entries(monthCount)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, count]) => ({ month, count }))
      );

      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground">Usage metrics and trends</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading analytics…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Jobs by Month</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Jobs by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={jobsByStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {jobsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
