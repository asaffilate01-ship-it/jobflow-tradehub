import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ChevronLeft, ChevronRight, Shield, Clock,
  User, FileText, Activity,
} from "lucide-react";

type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  created_at: string;
};

const actionColors: Record<string, string> = {
  login: "bg-info/15 text-info border-info/20",
  logout: "bg-muted text-muted-foreground",
  signup: "bg-success/15 text-success border-success/20",
  create: "bg-success/15 text-success border-success/20",
  update: "bg-warning/15 text-warning border-warning/20",
  delete: "bg-destructive/15 text-destructive border-destructive/20",
  submit: "bg-primary/15 text-primary border-primary/20",
  accept: "bg-success/15 text-success border-success/20",
  reject: "bg-destructive/15 text-destructive border-destructive/20",
  approve: "bg-success/15 text-success border-success/20",
};

const getActionColor = (action: string) => {
  for (const [key, value] of Object.entries(actionColors)) {
    if (action.includes(key)) return value;
  }
  return "bg-muted text-muted-foreground";
};

const AdminAuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (actionFilter !== "all") {
      query = query.ilike("action", `%${actionFilter}%`);
    }
    if (entityFilter !== "all") {
      query = query.eq("entity_type", entityFilter);
    }

    const { data } = await query;
    setLogs((data as any[]) ?? []);
    setLoading(false);
  };

  const filteredLogs = searchTerm
    ? logs.filter(l =>
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user_id.includes(searchTerm)
      )
    : logs;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">Complete activity trail across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 glass-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by action, entity, or user ID…"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="signup">Signup</SelectItem>
            <SelectItem value="job">Jobs</SelectItem>
            <SelectItem value="quote">Quotes</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="delivery">Deliveries</SelectItem>
            <SelectItem value="kyc">KYC</SelectItem>
            <SelectItem value="profile">Profile</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="job">Job</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="order">Order</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="profile">Profile</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Entity</th>
                <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={5} className="p-3"><div className="h-5 bg-muted/30 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">No audit logs found</div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] capitalize ${getActionColor(log.action)}`}>
                        {log.action.replace(/\./g, " ")}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="capitalize">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {log.entity_id.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {log.user_id?.slice(0, 8)}…
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono max-w-[200px] truncate block">
                          {JSON.stringify(log.metadata).slice(0, 80)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Page {page + 1} · {filteredLogs.length} entries
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={filteredLogs.length < pageSize} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogPage;
