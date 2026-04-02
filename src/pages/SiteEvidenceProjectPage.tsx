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
  ArrowLeft, Download,
} from "lucide-react";
import { EVIDENCE_PHASES, EVIDENCE_SUBFOLDERS } from "@/lib/evidence-constants";

type MediaItem = {
  id: string;
  storage_path: string;
  media_type: string;
  captured_at: string | null;
  created_at: string;
};

/** Folder view for a single job's evidence */
const SiteEvidenceProjectPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { jobId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user || !jobId) return;
    const load = async () => {
      const [{ data: job }, { data: mediaData }] = await Promise.all([
        supabase.from("jobs").select("title, address_line1, postcode").eq("id", jobId).single(),
        supabase.from("job_media").select("id, storage_path, media_type, captured_at, created_at").eq("job_id", jobId).order("created_at", { ascending: false }),
      ]);
      if (job) setJobTitle(`${job.title} — ${job.address_line1}, ${job.postcode}`);
      setMedia((mediaData as MediaItem[]) ?? []);
      setLoading(false);
    };
    load();

    // Realtime
    const channel = supabase
      .channel(`evidence-project-${jobId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "job_media",
        filter: `job_id=eq.${jobId}`,
      }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, jobId]);

  // Count media per phase and per phase/subfolder
  const phaseCounts: Record<string, number> = {};
  const subfolderCounts: Record<string, Record<string, number>> = {};
  media.forEach((m) => {
    const pathParts = m.storage_path.split("/");
    // path: {jobId}/{phase}/{subfolder}/{file} or legacy {jobId}/{phase}/{file}
    const phase = pathParts.length >= 2 ? pathParts[1] : "other";
    const sub = pathParts.length >= 4 ? pathParts[2] : "";
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    if (sub) {
      if (!subfolderCounts[phase]) subfolderCounts[phase] = {};
      subfolderCounts[phase][sub] = (subfolderCounts[phase][sub] || 0) + 1;
    }
  });

  const imageCount = media.filter((m) => m.media_type === "photo").length;
  const videoCount = media.filter((m) => m.media_type === "video").length;

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !jobId || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const mediaType = file.type.startsWith("video") ? "video" : "photo";
      const fileName = `${jobId}/uploads/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("job-evidence")
        .upload(fileName, file, { contentType: file.type });

      if (uploadErr) {
        toast.error(`Upload failed: ${uploadErr.message}`);
        continue;
      }

      await supabase.from("job_media").insert({
        job_id: jobId,
        uploaded_by: user.id,
        storage_path: fileName,
        media_type: mediaType,
        captured_at: new Date().toISOString(),
      });
    }

    toast.success(`${files.length} file(s) uploaded!`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/site-evidence")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{jobTitle}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="glass-card p-5">
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium">
            <Image className="w-3 h-3 text-primary" /> {imageCount} Photos
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium">
            <Video className="w-3 h-3 text-primary" /> {videoCount} Videos
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button className="h-14 text-base gap-3 font-semibold" onClick={() => navigate(`/site-evidence/${jobId}/camera`)}>
          <Camera className="w-5 h-5" /> Open Camera
        </Button>
        <Button
          variant="outline"
          className="h-14 text-base gap-3"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          Upload Files
        </Button>
      </div>

      {/* Folders */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="w-5 h-5" /> Evidence Folders
        </h2>

        {/* All media */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full glass-card p-4 text-left hover:border-primary/20 transition-colors"
          onClick={() => navigate(`/site-evidence/${jobId}/gallery`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <Image className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">All Evidence</p>
                <p className="text-xs text-muted-foreground">{media.length} items</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.button>

        {/* Phase folders */}
        {EVIDENCE_SUBFOLDERS.map((folder, i) => {
          const count = phaseCounts[folder.value] || 0;
          return (
            <motion.button
              key={folder.value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (i + 1) * 0.04 }}
              className="w-full glass-card p-4 text-left hover:border-primary/20 transition-colors"
              onClick={() => navigate(`/site-evidence/${jobId}/gallery?phase=${folder.value}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{folder.label}</p>
                    <p className="text-xs text-muted-foreground">{count} items</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default SiteEvidenceProjectPage;
