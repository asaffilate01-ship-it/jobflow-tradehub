import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, DollarSign } from "lucide-react";

interface AgentRow {
  id: string;
  referral_code: string;
  commission_rate: number;
  status: string;
  total_earned: number;
  total_paid: number;
  profile_id: string;
  profile_name?: string;
  referral_count?: number;
}

const AdminAgentsPage = () => {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase.from("agents").select("*");
      if (!data) { setLoading(false); return; }

      // Fetch profile names
      const profileIds = data.map((a) => a.profile_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", profileIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      // Fetch referral counts
      const { data: referrals } = await supabase.from("agent_referrals").select("agent_id");
      const refCountMap = new Map<string, number>();
      (referrals ?? []).forEach((r) => {
        refCountMap.set(r.agent_id, (refCountMap.get(r.agent_id) ?? 0) + 1);
      });

      setAgents(data.map((a) => ({
        ...a,
        profile_name: profileMap.get(a.profile_id) ?? "Unknown",
        referral_count: refCountMap.get(a.id) ?? 0,
      })));
      setLoading(false);
    };
    fetchAgents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Oversight</h1>
          <p className="text-muted-foreground">Manage referral agents and commissions</p>
        </div>
        <UserCheck className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Agents</div>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Earned</div>
            <div className="text-2xl font-bold">£{agents.reduce((s, a) => s + Number(a.total_earned), 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Referrals</div>
            <div className="text-2xl font-bold">{agents.reduce((s, a) => s + (a.referral_count ?? 0), 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : agents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No agents registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Agent</th>
                    <th className="pb-3 font-medium text-muted-foreground">Code</th>
                    <th className="pb-3 font-medium text-muted-foreground">Rate</th>
                    <th className="pb-3 font-medium text-muted-foreground">Referrals</th>
                    <th className="pb-3 font-medium text-muted-foreground">Earned</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-secondary/30">
                      <td className="py-3 font-medium">{agent.profile_name}</td>
                      <td className="py-3 font-mono text-xs">{agent.referral_code}</td>
                      <td className="py-3">{agent.commission_rate}%</td>
                      <td className="py-3">{agent.referral_count}</td>
                      <td className="py-3">£{Number(agent.total_earned).toFixed(2)}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={
                          agent.status === "active" ? "border-emerald-500 text-emerald-600" : "border-muted text-muted-foreground"
                        }>
                          {agent.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgentsPage;
