import { supabase } from "@/integrations/supabase/client";

// The driver_delivery_board / driver_delivery_action RPCs are created by the
// driver migration (20261023074153), which is applied during the coordinated
// driver release. Until then the generated Database types don't include them,
// so calls go through this shim to keep the typecheck green. Runtime behaviour
// is identical to calling supabase.rpc directly.
type RpcError = { message: string } | null;
type RpcResult = Promise<{ data: unknown; error: RpcError }>;

export const callDriverRpc = (
  name: "driver_delivery_board" | "driver_delivery_action",
  args?: Record<string, unknown>,
): RpcResult =>
  (supabase.rpc as unknown as (n: string, a?: Record<string, unknown>) => RpcResult)(name, args);
