import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload, FileText, Shield, CheckCircle, Clock, XCircle, Trash2, Eye,
} from "lucide-react";

type DocCategory = "photo_id" | "proof_of_address" | "insurance" | "certification";

const DOC_CATEGORIES: { key: DocCategory; label: string; description: string }[] = [
  { key: "photo_id", label: "Photo ID", description: "Passport, driving licence, or national ID card" },
  { key: "proof_of_address", label: "Proof of Address", description: "Utility bill or bank statement (last 3 months)" },
  { key: "insurance", label: "Public Liability Insurance", description: "Current certificate of insurance" },
  { key: "certification", label: "Trade Certifications", description: "Gas Safe, NICEIC, FGAS, Part P etc." },
];

interface KycDoc {
  category: DocCategory;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

const KycUploadPage = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [kycStatus, setKycStatus] = useState("pending");
  const [uploading, setUploading] = useState<DocCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<DocCategory | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("kyc_status, kyc_documents")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setKycStatus((data as any).kyc_status ?? "pending");
          setDocs(((data as any).kyc_documents as KycDoc[]) ?? []);
        }
        setLoading(false);
      });
  }, [user]);

  const handleUpload = async (category: DocCategory, file: File) => {
    if (!user) return;
    setUploading(category);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${category}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error("Upload failed: " + uploadErr.message);
      setUploading(null);
      return;
    }

    const newDoc: KycDoc = {
      category,
      file_name: file.name,
      storage_path: path,
      uploaded_at: new Date().toISOString(),
    };

    const updatedDocs = [...docs.filter((d) => d.category !== category), newDoc];

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ kyc_documents: updatedDocs as any, kyc_status: "submitted" })
      .eq("id", user.id);

    if (updateErr) {
      toast.error("Failed to save: " + updateErr.message);
    } else {
      setDocs(updatedDocs);
      setKycStatus("submitted");
      toast.success(`${DOC_CATEGORIES.find((c) => c.key === category)?.label} uploaded`);
    }
    setUploading(null);
  };

  const handleRemove = async (category: DocCategory) => {
    if (!user) return;
    const doc = docs.find((d) => d.category === category);
    if (!doc) return;

    await supabase.storage.from("kyc-documents").remove([doc.storage_path]);
    const updatedDocs = docs.filter((d) => d.category !== category);

    await supabase
      .from("profiles")
      .update({
        kyc_documents: updatedDocs as any,
        kyc_status: updatedDocs.length === 0 ? "pending" : "submitted",
      })
      .eq("id", user.id);

    setDocs(updatedDocs);
    if (updatedDocs.length === 0) setKycStatus("pending");
    toast.success("Document removed");
  };

  const triggerFileInput = (category: DocCategory) => {
    setActiveCategory(category);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const statusBadge = {
    pending: { icon: Clock, label: "Pending", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    submitted: { icon: FileText, label: "Under Review", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    approved: { icon: CheckCircle, label: "Approved", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    rejected: { icon: XCircle, label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/20" },
  };

  const status = statusBadge[kycStatus as keyof typeof statusBadge] ?? statusBadge.pending;
  const StatusIcon = status.icon;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeCategory) handleUpload(activeCategory, file);
          e.target.value = "";
        }}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Identity Verification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your documents to verify your identity and trade credentials
        </p>
      </div>

      <div className={`glass-card p-4 flex items-center gap-3 border ${status.className}`}>
        <StatusIcon className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">{status.label}</p>
          <p className="text-xs text-muted-foreground">
            {kycStatus === "pending" && "Upload the required documents below to begin verification."}
            {kycStatus === "submitted" && "We're reviewing your documents. This usually takes 1–2 business days."}
            {kycStatus === "approved" && "Your identity has been verified. You have full platform access."}
            {kycStatus === "rejected" && "Some documents couldn't be verified. Please re-upload clearer copies."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {DOC_CATEGORIES.map((cat) => {
          const doc = docs.find((d) => d.category === cat.key);
          const isUploading = uploading === cat.key;

          return (
            <div
              key={cat.key}
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/20 transition-colors"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${doc ? "bg-emerald-500/15" : "bg-secondary"}`}>
                {doc ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{cat.label}</p>
                {doc ? (
                  <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {doc && kycStatus !== "approved" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(cat.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {kycStatus !== "approved" && (
                  <Button
                    variant={doc ? "outline" : "default"}
                    size="sm"
                    disabled={isUploading}
                    onClick={() => triggerFileInput(cat.key)}
                  >
                    {isUploading ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        {doc ? "Replace" : "Upload"}
                      </>
                    )}
                  </Button>
                )}
                {doc && kycStatus === "approved" && (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {kycStatus !== "approved" && docs.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          All documents are stored securely and encrypted. We'll notify you by email once reviewed.
        </p>
      )}
    </div>
  );
};

export default KycUploadPage;
