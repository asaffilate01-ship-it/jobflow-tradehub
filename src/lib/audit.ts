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

export const logAudit = async ({ action, entityType, entityId, metadata = {} }: AuditLogEntry) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata,
    } as any);
  } catch (e) {
    // Silently fail — audit logging should never break the app
    console.warn("Audit log failed:", e);
  }
};
