import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wallet, TrendingUp, Clock, CheckCircle, UserPlus } from "lucide-react";

const AgentDashboard = () => {
  const { user } = useAuth();

  const { data: agent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ["agent-referrals", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_referrals")
        .select("*")
        .eq("agent_id", agent!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  const { data: commissions } = useQuery({
    queryKey: ["agent-commissions", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commissions")
        .select("*")
        .eq("agent_id", agent!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  const totalReferrals = referrals?.length ?? 0;
  const convertedReferrals = referrals?.filter(r => r.status === "converted").length ?? 0;
  const pendingCommissions = commissions?.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;
  const paidCommissions = commissions?.filter(c => c.status === "paid").reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;
  const conversionRate = totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0;

  const kpis = [
    { label: "Total Referrals", value: totalReferrals, icon: Users, color: "text-blue-500" },
    { label: "Converted", value: convertedReferrals, icon: CheckCircle, color: "text-green-500" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-purple-500" },
    { label: "Pending Earnings", value: `£${pendingCommissions.toFixed(2)}`, icon: Clock, color: "text-amber-500" },
    { label: "Total Paid", value: `£${paidCommissions.toFixed(2)}`, icon: Wallet, color: "text-emerald-500" },
    { label: "Commission Rate", value: agent ? `${agent.commission_rate}%` : "—", icon: UserPlus, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back — here's your referral performance overview.
        </p>
      </div>

      {agent && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <Badge variant="outline" className="text-primary border-primary/30">Active Agent</Badge>
            <span className="text-sm text-muted-foreground">
              Referral Code: <span className="font-mono font-semibold text-foreground">{agent.referral_code}</span>
            </span>
            <span className="text-sm text-muted-foreground ml-auto">
              {agent.commission_type === "percentage" ? `${agent.commission_rate}% commission` : `£${agent.commission_rate} per referral`}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <kpi.icon className={`h-6 w-6 mx-auto mb-2 ${kpi.color}`} />
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {(!referrals || referrals.length === 0) ? (
              <p className="text-sm text-muted-foreground">No referrals yet. Share your referral link to get started!</p>
            ) : (
              <div className="space-y-3">
                {referrals.slice(0, 5).map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm font-medium capitalize">{ref.referral_type}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant={ref.status === "converted" ? "default" : "secondary"}>
                      {ref.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {(!commissions || commissions.length === 0) ? (
              <p className="text-sm text-muted-foreground">No commissions earned yet.</p>
            ) : (
              <div className="space-y-3">
                {commissions.slice(0, 5).map((com) => (
                  <div key={com.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm font-semibold">£{Number(com.amount).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {com.period_start && com.period_end
                          ? `${new Date(com.period_start).toLocaleDateString()} - ${new Date(com.period_end).toLocaleDateString()}`
                          : new Date(com.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant={com.status === "paid" ? "default" : "secondary"}>
                      {com.status}
                    </Badge>
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

export default AgentDashboard;
