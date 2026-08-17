import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Crown, Zap, Star, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/subscriptions";
import { useSubscription } from "@/hooks/use-subscription";

const SubscriptionPage = () => {
  const { user } = useAuth();
  const { tier: currentTier, subscriptionEnd, loading, refresh } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Re-verify against Stripe once on mount so a fresh checkout is picked up.
  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  const handleCheckout = async (priceId: string) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setCheckoutLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open portal");
    }
  };

  const tierIcons: Record<SubscriptionTier, typeof Star> = {
    free: Star,
    basic: Zap,
    premium: Crown,
  };

  const tierColors: Record<SubscriptionTier, string> = {
    free: "border-border",
    basic: "border-info/40 shadow-info/10",
    premium: "border-primary/40 shadow-primary/10 glow",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">Unlock the full Craftvaro platform</p>
      </div>

      {currentTier !== "free" && (
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Current plan: </span>
            <span className="font-semibold text-foreground">{SUBSCRIPTION_TIERS[currentTier].name}</span>
            {subscriptionEnd && (
              <span className="text-xs text-muted-foreground ml-2">
                Renews {new Date(subscriptionEnd).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleManage} className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> Manage Subscription
            </Button>
          </div>
        </div>
      )}


      <div className="grid md:grid-cols-3 gap-6">
        {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][]).map(
          ([key, tier]) => {
            const Icon = tierIcons[key];
            const isCurrent = key === currentTier;
            return (
              <div
                key={key}
                className={`glass-card p-6 space-y-6 relative ${tierColors[key]} ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Your Plan
                  </Badge>
                )}
                <div className="text-center space-y-2">
                  <Icon className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-xl font-bold">{tier.name}</h2>
                  <div className="text-3xl font-bold text-gradient">
                    {tier.price === 0 ? "Free" : `£${tier.price}`}
                    {tier.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                  </div>
                </div>

                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  {key === "free" ? (
                    <Button variant="outline" className="w-full" disabled>
                      {isCurrent ? "Current Plan" : "Free"}
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="outline" className="w-full" onClick={handleManage}>
                      Manage Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full font-semibold gap-2"
                      onClick={() => handleCheckout(tier.price_id!)}
                      disabled={checkoutLoading === tier.price_id}
                    >
                      {checkoutLoading === tier.price_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Subscribe — £{tier.price}/mo
                    </Button>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
