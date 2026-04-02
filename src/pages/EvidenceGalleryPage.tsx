import { useState, useEffect } from "react";
import { EVIDENCE_SUBFOLDERS } from "@/lib/evidence-constants";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Image, Video, Trash2, X, Download, Loader2, ZoomIn,
} from "lucide-react";

interface MediaItem {
  id: string;
  storage_path: string;
  media_type: string;
  captured_at: string | null;
  created_at: string;
}

const EvidenceGalleryPage = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const phaseFilter = searchParams.get("phase") || "";
  const { user } = useAuth();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !jobId) return;
    const fetchMedia = async () => {
      let query = supabase
        .from("job_media")
        .select("id, storage_path, media_type, captured_at, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      // Filter by phase folder if specified
      if (phaseFilter) {
        query = query.like("storage_path", `${jobId}/${phaseFilter}/%`);
      }

      const { data } = await query;
      setMedia((data as MediaItem[]) ?? []);
      setLoading(false);
    };
    fetchMedia();

    // Realtime updates
    const channel = supabase
      .channel(`evidence-gallery-${jobId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "job_media",
        filter: `job_id=eq.${jobId}`,
      }, () => fetchMedia())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, jobId, phaseFilter]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("job-evidence").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm("Delete this evidence? This cannot be undone.")) return;
    setDeleting(item.id);
    await supabase.storage.from("job-evidence").remove([item.storage_path]);
    await supabase.from("job_media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    setSelectedItem(null);
    setDeleting(null);
    toast.success("Evidence deleted");
  };

  const folderLabel = phaseFilter
    ? phaseFilter.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "All Evidence";

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/site-evidence/${jobId}`)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">{folderLabel}</h1>
        <span className="text-xs text-muted-foreground">{media.length} items</span>
      </div>

      {media.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Image className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">No evidence in this folder yet</p>
          <Button size="sm" onClick={() => navigate(`/site-evidence/${jobId}/camera`)}>
            Open Camera
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {media.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => setSelectedItem(item)}
              className="relative aspect-square rounded-xl overflow-hidden bg-secondary group"
            >
              {item.media_type === "photo" ? (
                <img
                  src={getPublicUrl(item.storage_path)}
                  alt="Evidence"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              {item.media_type === "video" && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center">
                  <Video className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn className="w-5 h-5 text-white" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          >
            <div className="flex items-center justify-between p-4">
              <button onClick={() => setSelectedItem(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="flex gap-2">
                <a
                  href={getPublicUrl(selectedItem.storage_path)}
                  download
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <Download className="w-5 h-5 text-white" />
                </a>
                <button
                  onClick={() => handleDelete(selectedItem)}
                  disabled={deleting === selectedItem.id}
                  className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center"
                >
                  {deleting === selectedItem.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Trash2 className="w-5 h-5 text-destructive" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              {selectedItem.media_type === "photo" ? (
                <img
                  src={getPublicUrl(selectedItem.storage_path)}
                  alt="Evidence"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <video
                  src={getPublicUrl(selectedItem.storage_path)}
                  controls
                  className="max-w-full max-h-full rounded-lg"
                />
              )}
            </div>

            <div className="p-4 space-y-1">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-white border-white/20 text-[10px]">
                  {selectedItem.media_type}
                </Badge>
                <span className="text-xs text-white/60">
                  {selectedItem.storage_path.split("/").slice(1, -1).join(" › ")}
                </span>
              </div>
              <p className="text-xs text-white/40">
                {selectedItem.captured_at
                  ? new Date(selectedItem.captured_at).toLocaleString("en-GB")
                  : new Date(selectedItem.created_at).toLocaleString("en-GB")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EvidenceGalleryPage;
