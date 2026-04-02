import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Camera as CameraIcon, Flashlight, FlashlightOff, SwitchCamera,
  MapPin, Clock, FolderOpen, Loader2, Type, X,
} from "lucide-react";
import { EVIDENCE_PHASES, EVIDENCE_SUBFOLDERS, EVIDENCE_LOCATIONS, EVIDENCE_SURVEY_TYPES } from "@/lib/evidence-constants";

const EvidenceCameraPage = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);

  const [phase, setPhase] = useState<string>(EVIDENCE_PHASES[0].value);
  const [subfolder, setSubfolder] = useState<string>(EVIDENCE_SUBFOLDERS[0].value);
  const [location, setLocation] = useState("");
  const [element, setElement] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [jobTitle, setJobTitle] = useState("");

  const selectClass = "h-8 rounded-md border border-white/20 bg-black/50 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm";

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      toast.error("Camera access denied");
      setCameraReady(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startCamera]);

  // GPS
  useEffect(() => {
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); };
  }, []);

  // Fetch job title
  useEffect(() => {
    if (!jobId) return;
    supabase.from("jobs").select("title, address_line1, postcode").eq("id", jobId).single()
      .then(({ data }) => {
        if (data) setJobTitle(`${data.title} — ${data.address_line1}, ${data.postcode}`);
      });
  }, [jobId]);

  // Torch
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities?.() as any;
    if (caps?.torch) track.applyConstraints({ advanced: [{ torch: flashOn } as any] }).catch(() => {});
  }, [flashOn, cameraReady]);

  const now = new Date();
  const timestamp = now.toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const drawOverlay = (canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Bottom bar
    const barH = 160;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(10, canvas.height - barH - 10, Math.min(800, canvas.width - 20), barH);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px -apple-system, sans-serif";
    ctx.fillText(`📍 ${gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : "No GPS"}`, 20, canvas.height - barH + 35);
    ctx.fillText(`🕐 ${timestamp}`, 20, canvas.height - barH + 75);
    ctx.font = "28px -apple-system, sans-serif";
    ctx.fillStyle = "#e0e0e0";
    const phaseLabel = EVIDENCE_PHASES.find((p) => p.value === phase)?.label ?? phase;
    const folderLabel = EVIDENCE_SUBFOLDERS.find((p) => p.value === subfolder)?.label ?? subfolder;
    ctx.fillText(`${phaseLabel} › ${folderLabel} | ${element || "General"} | ${location || ""}`, 20, canvas.height - barH + 115);

    // Top bar - job title
    if (jobTitle) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 10, Math.min(800, canvas.width - 20), 50);
      ctx.fillStyle = "#fff";
      ctx.font = "30px -apple-system, sans-serif";
      ctx.fillText(jobTitle, 20, 45, Math.min(760, canvas.width - 40));
    }

    if (notes) {
      const noteY = jobTitle ? 70 : 10;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "26px -apple-system, sans-serif";
      ctx.fillRect(10, noteY, Math.min(ctx.measureText(`📝 ${notes}`).width + 30, canvas.width - 20), 40);
      ctx.fillStyle = "#ffd700";
      ctx.fillText(`📝 ${notes}`, 20, noteY + 30);
    }
  };

  const handleCapture = async () => {
    if (!user || !jobId || !cameraReady) return;
    setUploading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { setUploading(false); return; }

    drawOverlay(canvas, video);
    canvas.toBlob(async (blob) => {
      if (!blob) { setUploading(false); return; }

      const fileName = `${jobId}/${subfolder}/${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("job-evidence")
        .upload(fileName, blob, { contentType: "image/jpeg" });

      if (uploadErr) {
        toast.error(uploadErr.message);
        setUploading(false);
        return;
      }

      const { error: dbErr } = await supabase.from("job_media").insert({
        job_id: jobId,
        uploaded_by: user.id,
        storage_path: fileName,
        media_type: "photo",
        captured_at: now.toISOString(),
      });

      if (dbErr) toast.error(dbErr.message);
      else {
        setCaptureCount((c) => c + 1);
        toast.success(`Photo ${captureCount + 1} saved!`);
      }
      setUploading(false);
    }, "image/jpeg", 0.92);
  };

  const subfolderLabel = EVIDENCE_SUBFOLDERS.find(sf => sf.value === subfolder)?.label;
  const filteredSurveyTypes = subfolderLabel
    ? Object.entries(EVIDENCE_SURVEY_TYPES).filter(([group]) => group === subfolderLabel)
    : Object.entries(EVIDENCE_SURVEY_TYPES);
  const allElements = filteredSurveyTypes.flatMap(([group, items]) =>
    (items as readonly string[]).map((item) => ({ group, item }))
  );

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Camera viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="hidden" />

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between safe-area-top">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex gap-2">
            {captureCount > 0 && (
              <div className="h-8 px-3 rounded-full bg-primary/80 flex items-center gap-1.5 text-xs font-medium text-white backdrop-blur-sm">
                {captureCount} captured
              </div>
            )}
            <button onClick={() => setFacingMode((f) => f === "environment" ? "user" : "environment")} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <SwitchCamera className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => setFlashOn(!flashOn)} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
              {flashOn ? <Flashlight className="w-5 h-5 text-yellow-400" /> : <FlashlightOff className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Metadata overlay */}
        <div className="absolute top-14 left-3 right-3 z-10 space-y-1">
          {jobTitle && (
            <div className="rounded-lg px-2.5 py-1 bg-black/40 backdrop-blur-sm inline-flex items-center gap-1 text-[10px] text-white font-semibold max-w-full truncate">
              📋 {jobTitle}
            </div>
          )}
          <div className="rounded-lg px-2.5 py-1 bg-black/40 backdrop-blur-sm inline-flex items-center gap-1 text-[10px] text-white">
            <MapPin className="w-2.5 h-2.5" />
            {gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : "Acquiring GPS..."}
          </div>
          <div className="rounded-lg px-2.5 py-1 bg-black/40 backdrop-blur-sm inline-flex items-center gap-1 text-[10px] text-white">
            <Clock className="w-2.5 h-2.5" /> {timestamp}
          </div>
          {(subfolder || element) && (
            <div className="rounded-lg px-2.5 py-1 bg-black/40 backdrop-blur-sm inline-flex items-center gap-1.5 text-[10px] text-white">
              <FolderOpen className="w-2.5 h-2.5" />
              {EVIDENCE_SUBFOLDERS.find((p) => p.value === subfolder)?.label} {element && `› ${element}`}
            </div>
          )}
          {notes && (
            <div className="rounded-lg px-2.5 py-1 bg-black/40 backdrop-blur-sm inline-flex items-center gap-1 text-[10px] text-yellow-300">
              📝 {notes}
            </div>
          )}
        </div>

        {/* Upload indicator */}
        {uploading && (
          <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
            <div className="bg-card rounded-2xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Uploading…</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/90 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        {/* Selectors row */}
        <div className="flex gap-2 px-3 pt-3 pb-2 overflow-x-auto">
          <select className={selectClass} value={subfolder} onChange={(e) => { setSubfolder(e.target.value); setElement(""); }}>
            {EVIDENCE_SUBFOLDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className={selectClass} value={element} onChange={(e) => setElement(e.target.value)}>
            <option value="">Survey type…</option>
            {allElements.map((e) => <option key={e.item} value={e.item}>{e.item}</option>)}
          </select>
          <select className={selectClass} value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">Location…</option>
            {EVIDENCE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${showNotes ? "bg-primary text-white" : "bg-white/10 text-white"}`}
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Notes input */}
        {showNotes && (
          <div className="px-3 pb-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes to this capture…"
              className="w-full h-8 rounded-md border border-white/20 bg-black/50 px-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm"
            />
          </div>
        )}

        {/* Capture button */}
        <div className="flex items-center justify-center pb-4 pt-1">
          <button
            onClick={handleCapture}
            disabled={uploading || !cameraReady}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvidenceCameraPage;
