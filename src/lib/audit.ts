import { supabase } from "@/integrations/supabase/client";

type AuditAction =
  | "login" | "logout" | "signup"
  | "job.create" | "job.update" | "job.delete"
  | "quote.submit" | "quote.accept" | "quote.reject"
  | "order.create" | "order.update" | "order.complete"
  | "delivery.create" | "delivery.accept" | "delivery.complete"
  | "profile.update" | "kyc.submit" | "kyc.approve" | "kyc.reject"
  | "subscription.create" | "subscription.cancel"
  | "message.send" | "broadcast.send"
  | "evidence.upload" | "cert.create"
  | "milestone.update" | "task.update"
  | "role.assign" | "user.ban" | "user.activate"
  | string;

interface AuditLogEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Explicit audit receipt for high-impact actions. Does not replace a
 * server-side, transactionally recorded audit event.
 */
export const logAuditChecked = async ({ action, entityType, entityId, metadata = {} }: AuditLogEntry): Promise<void> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in required to record the audit");
  const { error } = await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  } as any);
  if (error) throw error;
};

export const logAudit = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await logAuditChecked(entry);
  } catch (e) {
    // Existing best-effort behaviour; use logAuditChecked when failure matters.
    console.warn("Audit log failed:", e);
  }
};
