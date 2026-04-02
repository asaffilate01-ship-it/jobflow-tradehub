import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Video, MapPin, Clock, Upload, FolderOpen, Image, Loader2, Check } from "lucide-react";

type MediaItem = {
  id: string;
  job_id: string;
  storage_path: string;
  media_type: string;
  captured_at: string | null;
  created_at: string;
};

type Job = { id: string; title: string };

const phases = ["Pre-start", "Demolition", "First fix", "Second fix", "Finishing", "Snagging", "Handover"];

const BasicCamPage = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("Pre-start");
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title")
        .in("status", ["awarded", "active"]);
      setJobs((jobsData as Job[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Fetch media when job changes
  useEffect(() => {
    if (!selectedJob) { setMedia([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("job_media")
        .select("id, job_id, storage_path, media_type, captured_at, created_at")
        .eq("job_id", selectedJob)
        .order("created_at", { ascending: false });
      setMedia((data as MediaItem[]) ?? []);
    };
    load();
  }, [selectedJob]);

  // Get location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => console.log("Geolocation unavailable")
    );
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      setCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      toast.error("Camera access denied");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedJob || !user) {
      toast.error("Select a job first");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Overlay: date/time/location stamp
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB");
    const timeStr = now.toLocaleTimeString("en-GB");
    const locStr = location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Location unavailable";

    // Black bar at bottom
    const barH = 60;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, canvas.height - barH, canvas.width, barH);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`📅 ${dateStr}  🕐 ${timeStr}`, 16, canvas.height - barH + 25);
    ctx.font = "16px monospace";
    ctx.fillText(`📍 ${locStr}  |  Phase: ${selectedPhase}`, 16, canvas.height - barH + 50);

    // Convert to blob and upload
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setUploading(true);
      const fileName = `${selectedJob}/${selectedPhase.toLowerCase().replace(/\s/g, "-")}/${Date.now()}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("job-evidence")
        .upload(fileName, blob, { contentType: "image/jpeg" });

      if (uploadErr) {
        toast.error(uploadErr.message);
        setUploading(false);
        return;
      }

      const { error: dbErr } = await supabase.from("job_media").insert({
        job_id: selectedJob,
        uploaded_by: user.id,
        storage_path: fileName,
        media_type: "photo",
        captured_at: now.toISOString(),
      });

      if (dbErr) toast.error(dbErr.message);
      else {
        toast.success("Photo captured & uploaded!");
        // Refresh media
        const { data } = await supabase
          .from("job_media")
          .select("id, job_id, storage_path, media_type, captured_at, created_at")
          .eq("job_id", selectedJob)
          .order("created_at", { ascending: false });
        setMedia((data as MediaItem[]) ?? []);
      }
      setUploading(false);
    }, "image/jpeg", 0.85);
  };

  // File upload (for offline / gallery photos)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !selectedJob || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const mediaType = file.type.startsWith("video") ? "video" : "photo";
      const fileName = `${selectedJob}/${selectedPhase.toLowerCase().replace(/\s/g, "-")}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("job-evidence")
        .upload(fileName, file, { contentType: file.type });

      if (uploadErr) {
        toast.error(`Upload failed: ${uploadErr.message}`);
        continue;
      }

      await supabase.from("job_media").insert({
        job_id: selectedJob,
        uploaded_by: user.id,
        storage_path: fileName,
        media_type: mediaType,
        captured_at: new Date().toISOString(),
      });
    }

    toast.success(`${files.length} file(s) uploaded!`);
    const { data } = await supabase
      .from("job_media")
      .select("id, job_id, storage_path, media_type, captured_at, created_at")
      .eq("job_id", selectedJob)
      .order("created_at", { ascending: false });
    setMedia((data as MediaItem[]) ?? []);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("job-evidence").getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) {
    return <div className="h-8 w-48 bg-muted animate-pulse rounded" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Evidence</h1>
        <p className="text-sm text-muted-foreground mt-1">GPS-stamped photo & video evidence for your jobs</p>
      </div>

      {/* Controls */}
      <div className="glass-card p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Job *</label>
            <select className={selectClass} value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
              <option value="">Select job…</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Phase</label>
            <select className={selectClass} value={selectedPhase} onChange={e => setSelectedPhase(e.target.value)}>
              {phases.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Location</label>
            <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Acquiring…"}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!cameraActive ? (
            <Button onClick={startCamera} className="gap-2 font-semibold" disabled={!selectedJob}>
              <Camera className="h-4 w-4" /> Open Camera
            </Button>
          ) : (
            <>
              <Button onClick={capturePhoto} className="gap-2 font-semibold" disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Capture
              </Button>
              <Button variant="outline" onClick={stopCamera}>Close Camera</Button>
            </>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedJob}
          >
            <Upload className="h-4 w-4" /> Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Camera viewfinder */}
      {cameraActive && (
        <div className="glass-card p-2 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 rounded-lg px-4 py-2 text-white font-mono text-sm">
            <div className="flex items-center gap-4">
              <span><Clock className="h-3.5 w-3.5 inline mr-1" />{new Date().toLocaleString("en-GB")}</span>
              <span><MapPin className="h-3.5 w-3.5 inline mr-1" />{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "…"}</span>
              <span><FolderOpen className="h-3.5 w-3.5 inline mr-1" />{selectedPhase}</span>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Media gallery */}
      {selectedJob && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Evidence ({media.length})
          </h2>

          {media.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <Camera className="h-8 w-8 mx-auto mb-2" />
              No evidence captured yet for this job
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {media.map(m => (
                <a
                  key={m.id}
                  href={getPublicUrl(m.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card overflow-hidden group hover:border-primary/20 transition-colors"
                >
                  {m.media_type === "photo" ? (
                    <img
                      src={getPublicUrl(m.storage_path)}
                      alt="Evidence"
                      className="w-full h-32 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-secondary">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] px-1">{m.media_type}</Badge>
                      {m.captured_at && new Date(m.captured_at).toLocaleDateString("en-GB")}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {m.storage_path.split("/").slice(1).join(" / ")}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BasicCamPage;
