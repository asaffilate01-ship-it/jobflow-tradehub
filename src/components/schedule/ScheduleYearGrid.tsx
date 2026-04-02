import { useMemo } from "react";
import type { ScheduleItem } from "./types";

interface Props {
  items: ScheduleItem[];
  year: number;
  onMonthClick: (month: number) => void;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const ScheduleYearGrid = ({ items, year, onMonthClick }: Props) => {
  const countsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    items.forEach((item) => {
      const d = new Date(item.date);
      if (d.getFullYear() === year) counts[d.getMonth()]++;
    });
    return counts;
  }, [items, year]);

  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() : -1;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {monthNames.map((name, i) => (
        <button
          key={name}
          onClick={() => onMonthClick(i)}
          className={`glass-card p-4 text-center hover:border-primary/30 transition-all cursor-pointer ${
            i === currentMonth ? "border-primary bg-primary/5" : ""
          }`}
        >
          <div className={`text-sm font-semibold ${i === currentMonth ? "text-primary" : "text-foreground"}`}>
            {name}
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{countsByMonth[i]}</div>
          <div className="text-[10px] text-muted-foreground">
            {countsByMonth[i] === 1 ? "item" : "items"}
          </div>
        </button>
      ))}
    </div>
  );
};
