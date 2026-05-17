import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface ClockInModalProps {
  open: boolean;
  mode: "in" | "out";
  onClose: () => void;
  onCapture: (photo: string) => void;
}

export function ClockInModal({ open, mode, onClose, onCapture }: ClockInModalProps) {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      setError(null);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => setError("Unable to access camera. Please allow camera permission."));
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const captureSelfie = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const handleCaptureClick = () => {
    const photo = captureSelfie();
    if (!photo) {
      toast.error("Could not capture image.");
      return;
    }
    onCapture(photo);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "in" ? "Time In — Take Selfie" : "Time Out — Take Selfie"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
            {error ? (
              <div className="text-white text-sm p-4 text-center">{error}</div>
            ) : (
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Center your face in the frame. Your selfie + timestamp will be saved as proof of {mode === "in" ? "time in" : "time out"}.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={`gap-2 text-white ${mode === "in" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}
              onClick={handleCaptureClick}
              disabled={!!error}
            >
              <Camera className="h-4 w-4" /> Capture & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
