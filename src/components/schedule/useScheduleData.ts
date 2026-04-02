import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ScheduleItem } from "./types";

export const useScheduleData = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSchedule = async () => {
      const { data: companies } = await supabase
        .from("trade_companies").select("id").eq("owner_profile_id", user.id);
      const companyIds = companies?.map((c) => c.id) ?? [];
      if (!companyIds.length) { setLoading(false); return; }

      const { data: awards } = await supabase
        .from("job_awards").select("job_id").in("trade_company_id", companyIds);
      const awardedJobIds = awards?.map((a) => a.job_id) ?? [];

      const results: ScheduleItem[] = [];

      if (awardedJobIds.length) {
        const { data: milestones } = await supabase
          .from("job_milestones")
          .select("id, title, due_date, status, amount, job_id, jobs(title)")
          .in("job_id", awardedJobIds)
          .not("due_date", "is", null);
        milestones?.forEach((m: any) => {
          results.push({
            id: m.id, title: m.title, date: m.due_date, type: "milestone",
            status: m.status, jobTitle: m.jobs?.title, jobId: m.job_id, amount: m.amount,
          });
        });

        const { data: tasks } = await supabase
          .from("job_tasks")
          .select("id, title, status, created_at, job_id, jobs(title)")
          .in("job_id", awardedJobIds);
        tasks?.forEach((t: any) => {
          results.push({
            id: t.id, title: t.title, date: t.created_at?.split("T")[0], type: "task",
            status: t.status, jobTitle: t.jobs?.title, jobId: t.job_id,
          });
        });
      }

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, target_start_date, status")
        .in("trade_company_id", companyIds)
        .not("target_start_date", "is", null);
      jobs?.forEach((j) => {
        results.push({
          id: j.id, title: j.title, date: j.target_start_date!, type: "job",
          status: j.status, jobTitle: j.title, jobId: j.id,
        });
      });

      setItems(results);
      setLoading(false);
    };
    fetchSchedule();
  }, [user]);

  return { items, loading };
};
