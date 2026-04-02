import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Clock, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface KycGateProps {
  children: React.ReactNode;
  /** Roles that require KYC (default: trade, driver) */
  requiredFor?: string[];
}

const KycGate = ({ children, requiredFor = ["trade", "driver"] }: KycGateProps) => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const needsKyc = roles.some((r) => requiredFor.includes(r));

  useEffect(() => {
    if (!user || !needsKyc) {
      setLoading(false);
      return;
    }

    supabase
      .from("profiles")
      .select("kyc_status")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setKycStatus((data as any)?.kyc_status ?? "approved");
        setLoading(false);
      });
  }, [user, needsKyc]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user doesn't need KYC or is approved, render children
  if (!needsKyc || kycStatus === "approved") {
    return <>{children}</>;
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      title: "KYC Verification Required",
      description: "Your account needs identity verification before you can access this feature. Please upload your documents to get started.",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/30",
      showUpload: true,
    },
    submitted: {
      icon: FileText,
      title: "Verification In Progress",
      description: "We've received your documents and they're being reviewed. This usually takes 1-2 business days. We'll notify you by email once approved.",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/30",
      showUpload: false,
    },
    rejected: {
      icon: XCircle,
      title: "Verification Failed",
      description: "Your documents couldn't be verified. Please re-submit with clearer copies of your ID and any required certifications.",
      color: "text-destructive",
      bgColor: "bg-destructive/10 border-destructive/30",
      showUpload: true,
    },
  };

  const config = statusConfig[kycStatus as keyof typeof statusConfig] ?? statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className={`glass-card p-8 max-w-md w-full space-y-6 border ${config.bgColor}`}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-card`}>
            <Icon className={`h-7 w-7 ${config.color}`} />
          </div>
          <h2 className="text-xl font-bold text-foreground">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>

        {config.showUpload && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Required documents: Government-issued photo ID, proof of address, and any trade certifications.
            </p>
            <Button className="w-full" onClick={() => navigate("/profile-setup")}>
              <Shield className="h-4 w-4 mr-2" />
              Upload verification documents
            </Button>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Return to home
        </Button>
      </div>
    </div>
  );
};

export default KycGate;
