import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple AES-GCM encryption using Web Crypto API
async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.slice(0, 32).padEnd(32, "0")),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

async function encrypt(text: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(base64: string): Promise<string> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { action, trade_account_id, portal_url, portal_username, password } =
      await req.json();

    if (action === "save") {
      // Encrypt password and save credentials
      if (!trade_account_id || !password) {
        throw new Error("trade_account_id and password are required");
      }

      const encrypted = await encrypt(password);

      // Verify ownership via service role
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Check the user owns this trade account
      const { data: account, error: accErr } = await adminClient
        .from("trade_accounts")
        .select("id, trade_company_id")
        .eq("id", trade_account_id)
        .single();

      if (accErr || !account) throw new Error("Trade account not found");

      const { data: company } = await adminClient
        .from("trade_companies")
        .select("owner_profile_id")
        .eq("id", account.trade_company_id)
        .single();

      if (company?.owner_profile_id !== user.id) {
        throw new Error("Not authorised to modify this account");
      }

      const { error: updateErr } = await adminClient
        .from("trade_accounts")
        .update({
          portal_url: portal_url ?? null,
          portal_username: portal_username ?? null,
          encrypted_credentials: encrypted,
        })
        .eq("id", trade_account_id);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Return whether credentials exist (never return the password)
      if (!trade_account_id) throw new Error("trade_account_id required");

      const { data: account } = await supabase
        .from("trade_accounts")
        .select("portal_url, portal_username, encrypted_credentials")
        .eq("id", trade_account_id)
        .single();

      return new Response(
        JSON.stringify({
          has_credentials: !!account?.encrypted_credentials,
          portal_url: account?.portal_url,
          portal_username: account?.portal_username,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action. Use 'save' or 'verify'.");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
