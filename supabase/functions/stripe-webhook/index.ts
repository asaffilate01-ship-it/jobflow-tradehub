import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const TIER_BY_PRODUCT: Record<string, string> = {
  prod_UG3HuFk33raDJ1: "basic",
  prod_UG3HsoKjk5DGhn: "premium",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

async function upsertFromSubscription(stripe: Stripe, subscriptionId: string, customerId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customer = await stripe.customers.retrieve(customerId);
  const email = (customer as Stripe.Customer).email;
  if (!email) return;

  const productId = String(sub.items.data[0]?.price?.product ?? "");
  const active = sub.status === "active" || sub.status === "trialing";
  const tier = active ? (TIER_BY_PRODUCT[productId] ?? "free") : "free";

  // Resolve the platform user by email (profiles mirrors auth.users)
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  await admin.from("subscribers").upsert(
    {
      user_id: profile?.id ?? null,
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      product_id: productId || null,
      tier,
      subscribed: active,
      subscription_end: (sub as any).current_period_end
        ? new Date((sub as any).current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: "email" },
  );

  if (profile?.id) {
    await admin.from("audit_logs").insert({
      user_id: profile.id,
      action: active ? "subscription.sync.active" : "subscription.sync.inactive",
      entity_type: "subscription",
      entity_id: null,
      metadata: { tier, product_id: productId, status: sub.status },
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const raw = await req.text();
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");
    const event = await stripe.webhooks.constructEventAsync(raw, signature, secret);

    await admin.from("webhooks_log").insert({
      source: "stripe",
      event_name: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.subscription && s.customer) {
          await upsertFromSubscription(stripe, String(s.subscription), String(s.customer));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const obj = event.data.object as any;
        const subId = obj.id?.startsWith?.("sub_") ? obj.id : obj.subscription;
        if (subId && obj.customer) {
          await upsertFromSubscription(stripe, String(subId), String(obj.customer));
        }
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
