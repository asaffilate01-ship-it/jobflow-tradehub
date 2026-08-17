import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Link as LinkIcon, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const AgentReferralLinkPage = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: agent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("profile_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const referralLink = agent?.referral_code
    ? `${window.location.origin}/signup?ref=${agent.referral_code}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join Craftvaro",
        text: "Sign up for Craftvaro — the operating system for trades.",
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral Link</h1>
        <p className="text-muted-foreground">Share your unique link to earn commissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCopy} variant="default" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button onClick={handleShare} variant="outline" className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {agent && (
            <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Your Referral Code</p>
              <p className="font-mono text-lg font-bold text-primary">{agent.referral_code}</p>
              <p className="text-xs text-muted-foreground">
                {agent.commission_type === "percentage"
                  ? `You earn ${agent.commission_rate}% commission on each converted referral.`
                  : `You earn £${agent.commission_rate} per converted referral.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentReferralLinkPage;
