import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Flag, CheckCircle, Briefcase, Calendar as CalIcon } from "lucide-react";
import type { ScheduleItem } from "./types";
import { statusColors } from "./types";

const icons = { milestone: Flag, task: CheckCircle, job: Briefcase };

interface Props {
  items: ScheduleItem[];
  groupByDate?: boolean;
}

export const ScheduleListView = ({ items, groupByDate = false }: Props) => {
  if (!items.length) {
    return (
      <div className="glass-card p-12 text-center space-y-3">
        <CalIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <h3 className="text-lg font-semibold">Nothing scheduled</h3>
        <p className="text-sm text-muted-foreground">Milestones and tasks with dates will appear here.</p>
      </div>
    );
  }

  // Group items by date if requested
  const grouped = groupByDate
    ? items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
        const d = item.date?.split("T")[0] ?? "unknown";
        if (!acc[d]) acc[d] = [];
        acc[d].push(item);
        return acc;
      }, {})
    : { all: items };

  const sortedKeys = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {sortedKeys.map((dateKey) => (
        <div key={dateKey}>
          {groupByDate && dateKey !== "unknown" && (
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {new Date(dateKey).toLocaleDateString("en-GB", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </div>
          )}
          <div className="space-y-2">
            {grouped[dateKey].map((item, i) => {
              const TypeIcon = icons[item.type];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Link
                    to={`/jobs/${item.jobId}`}
                    className="glass-card p-4 flex items-center gap-4 hover:border-primary/20 transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.jobTitle} · {new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[item.status] ?? ""}`}>
                      {item.status.replace("_", " ")}
                    </Badge>
                    {item.amount !== undefined && item.amount > 0 && (
                      <span className="text-sm font-semibold text-primary">£{item.amount.toLocaleString()}</span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
