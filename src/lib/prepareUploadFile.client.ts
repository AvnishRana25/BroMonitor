import { compressImageFile, normalizeImageFile } from "@/lib/imageCompress.client";

/** Resize/compress and validate before upload (mobile-safe). */
export async function prepareUploadFile(file: File): Promise<File> {
  const normalized = normalizeImageFile(file);
  if (!normalized.size) {
    throw new Error("Photo is empty. Try another image.");
  }
  try {
    const compressed = await compressImageFile(normalized);
    if (compressed.size > 0) return compressed;
  } catch {
    // Canvas compress failed (common on iOS HEIC) — send normalized original.
  }
  return normalized;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read photo."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.readAsDataURL(blob);
  });
}
