export type ScheduleItem = {
  id: string;
  title: string;
  date: string;
  type: "milestone" | "task" | "job";
  status: string;
  jobTitle?: string;
  jobId: string;
  amount?: number;
};

export type ViewMode = "day" | "week" | "month" | "year";
export type SortOrder = "asc" | "desc";
export type ItemType = "all" | "milestone" | "task" | "job";

export const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-info/15 text-info border-info/20",
  completed: "bg-success/15 text-success border-success/20",
  done: "bg-success/15 text-success border-success/20",
  posted: "bg-primary/15 text-primary border-primary/20",
  active: "bg-primary/15 text-primary border-primary/20",
  awarded: "bg-warning/15 text-warning border-warning/20",
};

export const typeIcons = {
  milestone: "Flag" as const,
  task: "CheckCircle" as const,
  job: "Briefcase" as const,
};
