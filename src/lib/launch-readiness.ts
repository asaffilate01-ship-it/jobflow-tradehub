export type LaunchCheckState = "ready" | "warning" | "blocker";

export interface LaunchReadinessCheck {
  id: string;
  label: string;
  state: LaunchCheckState;
  detail: string;
}

export interface LaunchReadinessReport {
  generated_at: string;
  summary: { blockers: number; warnings: number; ready: number };
  checks: LaunchReadinessCheck[];
  metrics: {
    paid_marketplace_profiles: number;
    active_claimable_directory_profiles: number;
    verified_available_repair_profiles: number;
    pending_deletion_requests: number;
    integration_queue_problems: number;
    dokuvera_queue_problems: number;
  };
}

export function launchDecision(report: LaunchReadinessReport | null) {
  if (!report) return { label: "Not checked", state: "warning" as const };
  if (report.summary.blockers > 0) return { label: "Blocked", state: "blocker" as const };
  if (report.summary.warnings > 0) return { label: "Pilot only", state: "warning" as const };
  return { label: "Ready for controlled launch", state: "ready" as const };
}
