import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const TEST_ACCOUNTS = [
  { email: "trader@traderos.dev", password: "trader123!", fullName: "Dev Trader", role: "trade" },
  { email: "customer@traderos.dev", password: "customer123!", fullName: "Dev Customer", role: "customer" },
  { email: "driver@traderos.dev", password: "driver123!", fullName: "Dev Driver", role: "driver" },
  { email: "admin@traderos.dev", password: "admin123!", fullName: "Dev Admin", role: "admin" },
  { email: "agent@traderos.dev", password: "agent123!", fullName: "Dev Agent", role: "agent" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results = [];

  for (const account of TEST_ACCOUNTS) {
    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === account.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Update password in case it changed
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: account.password,
        email_confirm: true,
      });
      results.push({ email: account.email, status: "updated" });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });
      if (error) {
        results.push({ email: account.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: account.email, status: "created" });
    }

    // Ensure profile exists
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: account.fullName,
      email: account.email,
      kyc_status: "approved",
    }, { onConflict: "id" });

    // Ensure role exists
    await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role: account.role,
    }, { onConflict: "user_id,role" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
