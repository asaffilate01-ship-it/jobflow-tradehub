import { useState, useMemo } from "react";
import { Flag, CheckCircle, Briefcase } from "lucide-react";
import { useScheduleData } from "@/components/schedule/useScheduleData";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { ScheduleListView } from "@/components/schedule/ScheduleListView";
import { ScheduleCalendarGrid } from "@/components/schedule/ScheduleCalendarGrid";
import { ScheduleYearGrid } from "@/components/schedule/ScheduleYearGrid";
import type { ViewMode, SortOrder, ItemType } from "@/components/schedule/types";

const SchedulePage = () => {
  const { items, loading } = useScheduleData();
  const [anchor, setAnchor] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [displayMode, setDisplayMode] = useState<"calendar" | "list">("calendar");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [typeFilter, setTypeFilter] = useState<ItemType>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  // Compute date range for current view
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === "day") {
      const s = new Date(year, month, anchor.getDate());
      const e = new Date(year, month, anchor.getDate() + 1);
      return { rangeStart: s, rangeEnd: e };
    }
    if (viewMode === "week") {
      const day = anchor.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const s = new Date(anchor);
      s.setDate(anchor.getDate() - diff);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(s.getDate() + 7);
      return { rangeStart: s, rangeEnd: e };
    }
    if (viewMode === "year") {
      return { rangeStart: new Date(year, 0, 1), rangeEnd: new Date(year + 1, 0, 1) };
    }
    // month
    return { rangeStart: new Date(year, month, 1), rangeEnd: new Date(year, month + 1, 1) };
  }, [anchor, viewMode, year, month]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const d = new Date(item.date);
      if (d < rangeStart || d >= rangeEnd) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [items, rangeStart, rangeEnd, typeFilter, statusFilter, sortOrder]);

  // Navigation
  const navigate = (dir: 1 | -1) => {
    const d = new Date(anchor);
    if (viewMode === "day") d.setDate(d.getDate() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setAnchor(d);
  };

  // Label
  const label = useMemo(() => {
    if (viewMode === "day") return anchor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (viewMode === "week") {
      const end = new Date(rangeStart);
      end.setDate(rangeStart.getDate() + 6);
      return `${rangeStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (viewMode === "year") return String(year);
    return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }, [anchor, viewMode, rangeStart, year]);

  const handleMonthClick = (m: number) => {
    setAnchor(new Date(year, m, 1));
    setViewMode("month");
  };

  return (
    <div className="space-y-6">
      <ScheduleToolbar
        viewMode={viewMode} setViewMode={setViewMode}
        displayMode={displayMode} setDisplayMode={setDisplayMode}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        label={label} onPrev={() => navigate(-1)} onNext={() => navigate(1)}
        onToday={() => setAnchor(new Date())}
      />

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      ) : viewMode === "year" && displayMode === "calendar" ? (
        <ScheduleYearGrid items={filteredItems} year={year} onMonthClick={handleMonthClick} />
      ) : displayMode === "calendar" && viewMode === "month" ? (
        <ScheduleCalendarGrid items={filteredItems} year={year} month={month} />
      ) : (
        <ScheduleListView items={filteredItems} groupByDate={viewMode !== "day"} />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Flag className="h-3 w-3 text-primary" /> Milestone</span>
        <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-success" /> Task</span>
        <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-info" /> Job start</span>
      </div>
    </div>
  );
};

export default SchedulePage;
