"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import {
  compressImageFiles,
  normalizeImageFile,
} from "@/lib/imageCompress.client";
import {
  postDailyPhotoUpload,
  postEnsureDailyLog,
} from "@/lib/uploadDailyPhoto.client";
import { deleteDailyPhoto } from "@/app/photos/actions";
import { MAX_PHOTOS_PER_LOG } from "@/lib/photos.client";

export type ExistingPhoto = {
  id: string;
  url: string;
};

type Props = {
  existingPhotos: ExistingPhoto[];
  logDate: string;
  dailyLogId: string | null;
  onLogId: (id: string) => void;
  onPhotosChange: (
    photos: ExistingPhoto[] | ((prev: ExistingPhoto[]) => ExistingPhoto[]),
  ) => void;
  canUpload?: boolean;
  canDeleteExisting?: boolean;
};

type UploadingItem = {
  id: string;
  preview: string;
};

function newUploadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `up-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function DailyEvidenceCapture({
  existingPhotos,
  logDate,
  dailyLogId,
  onLogId,
  onPhotosChange,
  canUpload = true,
  canDeleteExisting = false,
}: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalCount = existingPhotos.length + uploading.length;
  const atCap = totalCount >= MAX_PHOTOS_PER_LOG;

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 4500);
  }, []);

  const resolveLogId = useCallback(async (): Promise<string | null> => {
    if (dailyLogId) return dailyLogId;
    const res = await postEnsureDailyLog(logDate);
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    onLogId(res.id);
    return res.id;
  }, [dailyLogId, logDate, onLogId]);

  const uploadFiles = useCallback(
    async (rawFiles: File[]) => {
      if (!canUpload || rawFiles.length === 0) return;
      setError(null);
      setSuccess(null);
      setBusy(true);

      const logId = await resolveLogId();
      if (!logId) {
        setBusy(false);
        return;
      }

      const normalized = rawFiles.map((f) => normalizeImageFile(f));
      const room = MAX_PHOTOS_PER_LOG - existingPhotos.length - uploading.length;
      const toProcess = normalized.slice(0, Math.max(0, room));
      if (toProcess.length === 0) {
        setError(`Max ${MAX_PHOTOS_PER_LOG} photos per log.`);
        setBusy(false);
        return;
      }

      let compressed: File[];
      try {
        compressed = await compressImageFiles(toProcess);
      } catch {
        compressed = toProcess;
      }

      const placeholders: UploadingItem[] = compressed.map((f) => ({
        id: newUploadId(),
        preview: URL.createObjectURL(f),
      }));
      setUploading((u) => [...u, ...placeholders]);

      const added: ExistingPhoto[] = [];
      const failed: string[] = [];

      for (let i = 0; i < compressed.length; i++) {
        const file = compressed[i];
        const ph = placeholders[i];
        try {
          const res = await postDailyPhotoUpload(logId, file);
          if (res.ok) {
            added.push({ id: res.id, url: res.url });
          } else {
            failed.push(res.error);
          }
        } catch {
          failed.push("Upload failed. Check your connection and try again.");
        } finally {
          URL.revokeObjectURL(ph.preview);
          setUploading((u) => u.filter((x) => x.id !== ph.id));
        }
      }

      if (added.length) {
        onPhotosChange((prev) => [...prev, ...added]);
        showSuccess(
          added.length === 1
            ? "Photo added successfully!"
            : `${added.length} photos added successfully!`,
        );
      }
      if (failed.length) {
        setError(failed[0]);
      }
      setBusy(false);
    },
    [
      canUpload,
      resolveLogId,
      existingPhotos.length,
      uploading.length,
      onPhotosChange,
      showSuccess,
    ],
  );

  async function onCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    try {
      await uploadFiles([files[0]]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo.");
      setBusy(false);
    }
  }

  async function onGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    try {
      await uploadFiles(Array.from(files));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo.");
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    try {
      await deleteDailyPhoto(id);
      onPhotosChange((prev) => prev.filter((p) => p.id !== id));
      showSuccess("Photo removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete photo.");
    }
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold">Study evidence</h3>
        <p className="text-xs text-ink-faint mt-0.5">
          {canUpload
            ? "Tap Camera or Gallery — photos save immediately."
            : "Notebook photos attached to this day's log."}
        </p>
      </div>

      {canUpload && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              disabled={busy || atCap}
              onClick={() => cameraInputRef.current?.click()}
              className="btn-primary min-h-[48px] flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              Camera
            </button>
            <button
              type="button"
              disabled={busy || atCap}
              onClick={() => galleryInputRef.current?.click()}
              className="btn-ghost min-h-[48px] flex items-center justify-center gap-2 border border-border"
            >
              <ImagePlus className="w-4 h-4" /> Gallery
            </button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
            capture="environment"
            className="sr-only"
            aria-label="Take photo with camera"
            onChange={onCameraChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
            multiple
            className="sr-only"
            aria-label="Choose photos from gallery"
            onChange={onGalleryChange}
          />
          {atCap && (
            <p className="text-xs text-warn mb-2">
              {MAX_PHOTOS_PER_LOG} photos max — delete one to add more.
            </p>
          )}
        </>
      )}

      {success && (
        <div
          role="status"
          className="mb-3 flex items-start gap-2 text-xs text-good bg-good/10 border border-good/30 rounded-lg px-3 py-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1 font-medium">{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="text-good/80 hover:text-good p-0.5"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-2.5 py-1.5 mb-2">
          {error}
        </p>
      )}

      {(existingPhotos.length > 0 || uploading.length > 0) && (
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
              {canDeleteExisting && (
                <button
                  type="button"
                  onClick={() => void handleDelete(p.id)}
                  className="absolute top-1 right-1 p-1.5 rounded-md bg-black/60 text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Delete photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {uploading.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-accent/40 bg-bg-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt="Uploading"
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            </div>
          ))}
        </div>
      )}

      {canUpload && existingPhotos.length === 0 && uploading.length === 0 && !busy && (
        <p className="text-xs text-ink-faint text-center py-3">
          Add at least one photo of today&apos;s work.
        </p>
      )}
      {!canUpload && existingPhotos.length === 0 && (
        <p className="text-xs text-ink-faint text-center py-3">
          No evidence photos for this day.
        </p>
      )}
    </section>
  );
}
