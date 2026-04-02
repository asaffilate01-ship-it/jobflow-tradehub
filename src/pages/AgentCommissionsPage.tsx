import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, PoundSterling } from "lucide-react";

const AgentCommissionsPage = () => {
  const { user } = useAuth();

  const { data: agent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("profile_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: commissions, isLoading } = useQuery({
    queryKey: ["agent-commissions-full", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commissions")
        .select("*")
        .eq("agent_id", agent!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  const totalPending = commissions?.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0) ?? 0;
  const totalPaid = commissions?.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground">Track your earnings and payout history.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4 pb-4 text-center">
            <PoundSterling className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <div className="text-2xl font-bold">£{totalPending.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-4 pb-4 text-center">
            <Wallet className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
            <div className="text-2xl font-bold">£{totalPaid.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Paid Out</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Commission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !commissions || commissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No commissions yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((com) => (
                  <TableRow key={com.id}>
                    <TableCell className="font-semibold">£{Number(com.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={com.status === "paid" ? "default" : "secondary"}>{com.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {com.period_start && com.period_end
                        ? `${new Date(com.period_start).toLocaleDateString()} – ${new Date(com.period_end).toLocaleDateString()}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {com.paid_at ? new Date(com.paid_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentCommissionsPage;
