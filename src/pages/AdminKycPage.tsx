import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, CheckCircle, XCircle, Eye, Clock, FileText, User,
} from "lucide-react";

interface KycDoc {
  category: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

interface KycSubmission {
  id: string;
  full_name: string;
  email: string | null;
  kyc_status: string;
  kyc_documents: KycDoc[];
  created_at: string;
  roles: string[];
}

const AdminKycPage = () => {
  const { roles } = useAuth();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<KycSubmission | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) return;
    fetchSubmissions();
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    setLoading(true);
    // Get all profiles that have KYC docs or non-approved status
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, kyc_status, kyc_documents, created_at")
      .neq("kyc_status", "approved")
      .order("created_at", { ascending: false });

    // Also get submitted ones
    const { data: submitted } = await supabase
      .from("profiles")
      .select("id, full_name, email, kyc_status, kyc_documents, created_at")
      .eq("kyc_status", "submitted")
      .order("created_at", { ascending: false });

    // Merge and deduplicate
    const allProfiles = [...(profiles ?? []), ...(submitted ?? [])];
    const unique = Array.from(new Map(allProfiles.map((p) => [p.id, p])).values());

    // Get roles for each
    const userIds = unique.map((p) => p.id);
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const enriched: KycSubmission[] = unique.map((p) => ({
      ...p,
      kyc_documents: ((p as any).kyc_documents as KycDoc[]) ?? [],
      roles: (userRoles ?? [])
        .filter((r) => r.user_id === p.id)
        .map((r) => r.role),
    }));

    setSubmissions(enriched);
    setLoading(false);
  };

  const openReview = async (sub: KycSubmission) => {
    setSelectedUser(sub);
    // Generate signed URLs for docs
    const urls: Record<string, string> = {};
    for (const doc of sub.kyc_documents) {
      const { data } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(doc.storage_path, 300);
      if (data?.signedUrl) urls[doc.storage_path] = data.signedUrl;
    }
    setDocUrls(urls);
  };

  const updateStatus = async (userId: string, status: "approved" | "rejected") => {
    setUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: status })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`User ${status === "approved" ? "approved" : "rejected"}`);
      setSelectedUser(null);
      fetchSubmissions();
    }
    setUpdating(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Pending" },
      submitted: { className: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Submitted" },
      approved: { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Approved" },
      rejected: { className: "bg-destructive/15 text-destructive border-destructive/20", label: "Rejected" },
    };
    const s = map[status] ?? map.pending;
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  const filtered = filter === "all"
    ? submissions
    : submissions.filter((s) => s.kyc_status === filter);

  if (!isAdmin) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          KYC Review Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve identity verification submissions
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "submitted", "pending", "rejected"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
            {f !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({submissions.filter((s) => s.kyc_status === f).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No submissions to review</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Documents</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground text-sm">{sub.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex gap-1">
                      {sub.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] capitalize">{r}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(sub.kyc_status)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {sub.kyc_documents.length} file{sub.kyc_documents.length !== 1 ? "s" : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openReview(sub)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedUser.email}</span>
                {statusBadge(selectedUser.kyc_status)}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Uploaded Documents</p>
                {selectedUser.kyc_documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                ) : (
                  selectedUser.kyc_documents.map((doc) => (
                    <div
                      key={doc.storage_path}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {doc.category.replace("_", " ")}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                      </div>
                      {docUrls[doc.storage_path] && (
                        <a
                          href={docUrls[doc.storage_path]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm shrink-0"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>

              {selectedUser.kyc_status !== "approved" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => updateStatus(selectedUser.id, "approved")}
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => updateStatus(selectedUser.id, "rejected")}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKycPage;
