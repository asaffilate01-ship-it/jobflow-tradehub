import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Camera, Upload, FolderOpen, Image, Video, ChevronRight, Loader2,
  ArrowLeft, MapPin, Clock,
} from "lucide-react";
import { EVIDENCE_PHASES } from "@/lib/evidence-constants";

type MediaItem = {
  id: string;
  storage_path: string;
  media_type: string;
  captured_at: string | null;
  created_at: string;
};

type Job = { id: string; title: string; address_line1: string; postcode: string };

/** Job selection page — lists jobs, then shows folder view for selected job */
const SiteEvidenceJobListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, address_line1, postcode")
        .in("status", ["awarded", "active", "completed"]);

      const jobList = (data as Job[]) ?? [];
      setJobs(jobList);

      // Get media counts per job
      if (jobList.length > 0) {
        const { data: mediaData } = await supabase
          .from("job_media")
          .select("job_id")
          .in("job_id", jobList.map((j) => j.id));

        const counts: Record<string, number> = {};
        (mediaData ?? []).forEach((m: any) => {
          counts[m.job_id] = (counts[m.job_id] || 0) + 1;
        });
        setMediaCounts(counts);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Site Evidence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          GPS-stamped photo & video evidence for your jobs
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Camera className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No active jobs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.button
              key={job.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/site-evidence/${job.id}`)}
              className="w-full glass-card p-4 text-left hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.address_line1}, {job.postcode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {mediaCounts[job.id] || 0} items
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteEvidenceJobListPage;
