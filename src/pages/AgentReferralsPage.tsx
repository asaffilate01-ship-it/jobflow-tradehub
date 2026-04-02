import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

const AgentReferralsPage = () => {
  const { user } = useAuth();

  const { data: agent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("profile_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["agent-referrals-full", agent?.id],
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

  const statusColor = (status: string) => {
    switch (status) {
      case "converted": return "default";
      case "pending": return "secondary";
      case "inactive": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Referrals</h1>
        <p className="text-muted-foreground">Track all users you've referred to the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !referrals || referrals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No referrals yet. Share your referral link to start earning!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Converted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="capitalize font-medium">{ref.referral_type}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(ref.status) as any}>{ref.status}</Badge>
                    </TableCell>
                    <TableCell>£{Number(ref.commission_earned).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ref.converted_at ? new Date(ref.converted_at).toLocaleDateString() : "—"}
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

export default AgentReferralsPage;
