import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionTier } from "@/lib/subscriptions";

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, basic: 1, premium: 2 };

/**
 * Server-backed subscription state. Reads the `subscribers` table (written only by
 * edge functions / Stripe webhook), so the tier cannot be faked in the browser.
 */
export function useSubscription() {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscribers")
      .select("tier, subscribed, subscription_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const active =
      !!data?.subscribed &&
      (!data.subscription_end || new Date(data.subscription_end) > new Date());

    setTier(active ? ((data?.tier as SubscriptionTier) ?? "free") : "free");
    setSubscriptionEnd(data?.subscription_end ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Force a Stripe re-check, which also refreshes the stored record. */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke("check-subscription");
    } catch {
      /* ignore — fall back to stored record */
    }
    await load();
  }, [load]);

  const hasTier = useCallback(
    (required: SubscriptionTier) => TIER_RANK[tier] >= TIER_RANK[required],
    [tier],
  );

  return { tier, subscriptionEnd, loading, refresh, hasTier };
}
