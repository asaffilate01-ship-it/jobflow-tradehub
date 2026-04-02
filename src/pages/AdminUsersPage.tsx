import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  id: string;
  full_name: string;
  email: string | null;
  kyc_status: string;
  is_active: boolean;
  created_at: string;
  roles: AppRole[];
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, kyc_status, is_active, created_at")
        .order("created_at", { ascending: false });

      if (!profiles) { setLoading(false); return; }

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const existing = roleMap.get(r.user_id) ?? [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      setUsers(profiles.map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const roleBadgeColor = (role: AppRole) => {
    const map: Record<string, string> = {
      admin: "bg-destructive/10 text-destructive",
      trade: "bg-primary/10 text-primary",
      driver: "bg-accent/10 text-accent",
      customer: "bg-secondary text-secondary-foreground",
      agent: "bg-emerald-500/10 text-emerald-600",
      staff: "bg-indigo-500/10 text-indigo-600",
    };
    return map[role] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">{users.length} total users</p>
        </div>
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 font-medium text-muted-foreground">Roles</th>
                    <th className="pb-3 font-medium text-muted-foreground">KYC</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-secondary/30">
                      <td className="py-3 font-medium">{user.full_name || "—"}</td>
                      <td className="py-3 text-muted-foreground">{user.email ?? "—"}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? user.roles.map((r) => (
                            <Badge key={r} variant="secondary" className={roleBadgeColor(r)}>
                              {r}
                            </Badge>
                          )) : <span className="text-muted-foreground">none</span>}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={
                          user.kyc_status === "approved" ? "border-emerald-500 text-emerald-600" :
                          user.kyc_status === "submitted" ? "border-amber-500 text-amber-600" :
                          "border-muted text-muted-foreground"
                        }>
                          {user.kyc_status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className={`inline-block h-2 w-2 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
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

export default AdminUsersPage;
