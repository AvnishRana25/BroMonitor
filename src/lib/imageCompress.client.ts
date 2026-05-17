/** Client-side resize/compress before upload — keeps uploads fast on mobile data. */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** iOS often sends HEIC with an empty MIME type — normalize before upload. */
export function normalizeImageFile(file: File): File {
  if (file.type && file.type.startsWith("image/")) return file;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : ext === "heic" || ext === "heif"
            ? "image/heic"
            : "image/jpeg";
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  const suffix = ext && ext !== "jpg" && ext !== "jpeg" ? `.${ext}` : ".jpg";
  return new File([file], base + suffix, { type: mime });
}

export async function compressImageFile(file: File): Promise<File> {
  file = normalizeImageFile(file);
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  // HEIC often fails in canvas on some browsers — upload as-is.
  if (file.type === "image/heic" || file.type === "image/heif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob || blob.size >= file.size * 0.95) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function compressImageFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageFile(f)));
}
