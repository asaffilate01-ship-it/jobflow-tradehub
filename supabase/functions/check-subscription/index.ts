import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("Not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    const TIER_BY_PRODUCT: Record<string, string> = {
      prod_UG3HuFk33raDJ1: "basic",
      prod_UG3HsoKjk5DGhn: "premium",
    };

    const persist = async (row: Record<string, unknown>) => {
      await supabaseClient.from("subscribers").upsert(
        { user_id: user.id, email: user.email, ...row },
        { onConflict: "email" },
      );
    };

    if (customers.data.length === 0) {
      await persist({ tier: "free", subscribed: false, product_id: null, subscription_end: null });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      await persist({
        tier: "free",
        subscribed: false,
        product_id: null,
        subscription_end: null,
        stripe_customer_id: customers.data[0].id,
      });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = subscriptions.data[0];
    const productId = String(sub.items.data[0].price.product);
    const subscriptionEnd = new Date((sub as any).current_period_end * 1000).toISOString();

    await persist({
      tier: TIER_BY_PRODUCT[productId] ?? "free",
      subscribed: true,
      product_id: productId,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customers.data[0].id,
      stripe_subscription_id: sub.id,
    });

    return new Response(JSON.stringify({
      subscribed: true,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
