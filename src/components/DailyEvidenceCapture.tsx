"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";

export type ExistingPhoto = {
  id: string;
  url: string;
};

type PendingPhoto = {
  id: string;
  preview: string;
  file: File;
};

type Props = {
  existingPhotos: ExistingPhoto[];
  onPendingChange: (files: File[]) => void;
  autoOpenCamera?: boolean;
  canDeleteExisting?: boolean;
  onDeleteExisting?: (id: string) => void;
};

export function DailyEvidenceCapture({
  existingPhotos,
  onPendingChange,
  autoOpenCamera = true,
  canDeleteExisting = false,
  onDeleteExisting,
}: Props) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoOpenedRef = useRef(false);

  const syncPending = useCallback(
    (next: PendingPhoto[]) => {
      setPending(next);
      onPendingChange(next.map((p) => p.file));
    },
    [onPendingChange]
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError("Camera blocked — use the gallery button below.");
      fileInputRef.current?.click();
    }
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
  }, [cameraOpen]);

  useEffect(() => {
    if (!autoOpenCamera || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const t = window.setTimeout(() => {
      void startCamera();
    }, 400);
    return () => window.clearTimeout(t);
  }, [autoOpenCamera, startCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function captureFromVideo() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `evidence-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const preview = URL.createObjectURL(blob);
        syncPending([
          ...pending,
          { id: crypto.randomUUID(), preview, file },
        ]);
      },
      "image/jpeg",
      0.88
    );
  }

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const added: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      added.push({
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
        file,
      });
    }
    if (added.length) syncPending([...pending, ...added]);
  }

  function removePending(id: string) {
    const item = pending.find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    syncPending(pending.filter((p) => p.id !== id));
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold">Study evidence</h3>
        <p className="text-xs text-ink-faint mt-0.5">
          Snap notebook pages or solved problems so your father can see what you
          studied today.
        </p>
      </div>

      {cameraOpen && (
        <div className="relative mb-3 rounded-xl overflow-hidden bg-black aspect-[4/3] max-h-[min(70vh,420px)]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent">
            <button
              type="button"
              onClick={stopCamera}
              className="btn-ghost py-2.5 px-3 min-h-[44px] bg-black/40 border-white/20"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <button
              type="button"
              onClick={captureFromVideo}
              className="btn-primary py-2.5 px-5 min-h-[44px] flex-1 max-w-[200px]"
            >
              <Camera className="w-4 h-4" /> Capture
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="text-xs text-warn mb-2">{cameraError}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => void startCamera()}
          className="btn-primary min-h-[44px] flex-1 sm:flex-none"
        >
          <Camera className="w-4 h-4" /> Open camera
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost min-h-[44px] flex-1 sm:flex-none"
        >
          <ImagePlus className="w-4 h-4" /> From gallery
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(e) => {
            onFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(existingPhotos.length > 0 || pending.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {existingPhotos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-border-soft bg-bg-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt="Study evidence"
                className="w-full h-full object-cover"
              />
              {canDeleteExisting && onDeleteExisting && (
                <button
                  type="button"
                  onClick={() => onDeleteExisting(p.id)}
                  className="absolute top-1 right-1 p-1.5 rounded-md bg-black/60 text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Delete photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {pending.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-accent/40 bg-bg-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt="Pending evidence"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1 left-1 text-[9px] uppercase tracking-wide bg-accent/90 text-white px-1.5 py-0.5 rounded">
                New
              </span>
              <button
                type="button"
                onClick={() => removePending(p.id)}
                className="absolute top-1 right-1 p-1.5 rounded-md bg-black/60 text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {existingPhotos.length === 0 && pending.length === 0 && !cameraOpen && (
        <p className="text-xs text-ink-faint text-center py-4">
          Camera opens automatically. Add at least one photo of today&apos;s work.
        </p>
      )}
    </section>
  );
}
