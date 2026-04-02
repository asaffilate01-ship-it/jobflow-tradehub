import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, ArrowUpDown,
  Calendar as CalIcon, LayoutList,
} from "lucide-react";
import type { ViewMode, SortOrder, ItemType } from "./types";

interface Props {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  displayMode: "calendar" | "list";
  setDisplayMode: (v: "calendar" | "list") => void;
  sortOrder: SortOrder;
  setSortOrder: (v: SortOrder) => void;
  typeFilter: ItemType;
  setTypeFilter: (v: ItemType) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const viewLabels: Record<ViewMode, string> = {
  day: "Day", week: "Week", month: "Month", year: "Year",
};

export const ScheduleToolbar = ({
  viewMode, setViewMode, displayMode, setDisplayMode,
  sortOrder, setSortOrder, typeFilter, setTypeFilter,
  statusFilter, setStatusFilter, label, onPrev, onNext, onToday,
}: Props) => (
  <div className="space-y-3">
    {/* Top row: title + display toggle */}
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">Milestones, tasks, and job timelines</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant={displayMode === "calendar" ? "default" : "outline"}
          size="sm" className="gap-1.5"
          onClick={() => setDisplayMode("calendar")}
        >
          <CalIcon className="h-4 w-4" /> Calendar
        </Button>
        <Button
          variant={displayMode === "list" ? "default" : "outline"}
          size="sm" className="gap-1.5"
          onClick={() => setDisplayMode("list")}
        >
          <LayoutList className="h-4 w-4" /> List
        </Button>
      </div>
    </div>

    {/* Navigation + view mode + filters */}
    <div className="flex flex-wrap items-center gap-2 glass-card p-3">
      {/* Nav arrows */}
      <Button variant="ghost" size="icon" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="font-semibold text-foreground min-w-[140px] text-center">{label}</span>
      <Button variant="ghost" size="icon" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onToday}>Today</Button>

      <div className="flex-1" />

      {/* View mode */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === v
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {viewLabels[v]}
          </button>
        ))}
      </div>

      {/* Sort */}
      <Button
        variant="outline" size="sm" className="gap-1.5"
        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {sortOrder === "asc" ? "Oldest" : "Newest"}
      </Button>

      {/* Type filter */}
      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ItemType)}>
        <SelectTrigger className="w-[120px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="milestone">Milestones</SelectItem>
          <SelectItem value="task">Tasks</SelectItem>
          <SelectItem value="job">Jobs</SelectItem>
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[120px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="posted">Posted</SelectItem>
          <SelectItem value="awarded">Awarded</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);
