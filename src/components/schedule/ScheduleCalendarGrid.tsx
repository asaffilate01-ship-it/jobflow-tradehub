import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Flag, CheckCircle, Briefcase } from "lucide-react";
import type { ScheduleItem } from "./types";
import { statusColors } from "./types";

const icons = { milestone: Flag, task: CheckCircle, job: Briefcase };

interface Props {
  items: ScheduleItem[];
  year: number;
  month: number; // 0-indexed
}

export const ScheduleCalendarGrid = ({ items, year, month }: Props) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date().toISOString().split("T")[0];

  const itemsByDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    items.forEach((item) => {
      const d = item.date?.split("T")[0];
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(item);
    });
    return map;
  }, [items]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayItems = itemsByDate[dateStr] ?? [];
          const isToday = dateStr === today;
          return (
            <div
              key={day}
              className={`min-h-[72px] sm:min-h-[90px] rounded-lg border p-1 text-xs transition-colors ${
                isToday ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
              }`}
            >
              <div className={`font-medium mb-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>{day}</div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item) => {
                  const TypeIcon = icons[item.type];
                  return (
                    <Link
                      key={item.id}
                      to={`/jobs/${item.jobId}`}
                      className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-tight truncate border ${
                        statusColors[item.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      <TypeIcon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
                {dayItems.length > 3 && (
                  <div className="text-[9px] text-muted-foreground pl-1">+{dayItems.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
