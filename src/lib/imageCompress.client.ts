/** Client-side resize/compress before upload — tuned for Android Chrome. */

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** iOS often sends HEIC with an empty MIME type — normalize before upload. */
export function normalizeImageFile(file: File): File {
  if (file.size > 0 && file.type && file.type.startsWith("image/")) return file;
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

/** Android Chrome handles Image+canvas more reliably than createImageBitmap. */
function compressViaImageElement(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height, 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob || blob.size === 0) {
              resolve(file);
              return;
            }
            const base = file.name.replace(/\.[^.]+$/, "") || "photo";
            resolve(new File([blob], `${base}.jpg`, { type: "image/jpeg" }));
          },
          "image/jpeg",
          JPEG_QUALITY,
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this photo. Try another image."));
    };
    img.src = url;
  });
}

export async function compressImageFile(file: File): Promise<File> {
  file = normalizeImageFile(file);
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (file.type === "image/heic" || file.type === "image/heif") {
    // Try canvas path — may convert; otherwise upload as-is.
    try {
      return await compressViaImageElement(file);
    } catch {
      return file;
    }
  }

  if (isMobileDevice()) {
    return compressViaImageElement(file);
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
    if (!blob || blob.size === 0) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return compressViaImageElement(file);
  }
}

export async function compressImageFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageFile(f)));
}
