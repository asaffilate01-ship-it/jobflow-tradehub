import { Link } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/subscriptions";

interface TierGateProps {
  required: Exclude<SubscriptionTier, "free">;
  children: React.ReactNode;
  /** Optional label shown in the upsell card, e.g. "Site evidence" */
  feature?: string;
}

/**
 * Server-truth subscription gate. The tier comes from the `subscribers` table
 * (written only by Stripe webhook / edge functions), so it cannot be faked
 * client-side. Admins always pass.
 */
const TierGate = ({ required, children, feature }: TierGateProps) => {
  const { roles } = useAuth();
  const { hasTier, loading } = useSubscription();

  if (roles.includes("admin")) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasTier(required)) return <>{children}</>;

  const tier = SUBSCRIPTION_TIERS[required];

  return (
    <div className="max-w-lg mx-auto text-center glass-card p-8 space-y-4">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        {feature ? `${feature} is a ${tier.name} feature` : `${tier.name} plan required`}
      </h1>
      <p className="text-muted-foreground text-sm">
        Upgrade to {tier.name} (£{tier.price}/mo) to unlock this and everything else in the plan.
      </p>
      <Button asChild className="font-semibold">
        <Link to="/subscription">View plans</Link>
      </Button>
    </div>
  );
};

export default TierGate;
