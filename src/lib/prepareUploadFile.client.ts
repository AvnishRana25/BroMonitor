import { compressImageFile, normalizeImageFile } from "@/lib/imageCompress.client";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/** Resize/compress and validate before upload (Android-safe). */
export async function prepareUploadFile(file: File): Promise<File> {
  let normalized = normalizeImageFile(file);

  // Samsung / Android sometimes reports size 0 until bytes are read.
  if (!normalized.size) {
    const buf = await normalized.arrayBuffer();
    if (!buf.byteLength) {
      throw new Error("Photo is empty. Try another image.");
    }
    normalized = new File([buf], normalized.name || "photo.jpg", {
      type: normalized.type || "image/jpeg",
    });
  }

  try {
    const compressed = await withTimeout(
      compressImageFile(normalized),
      25_000,
      "Photo processing took too long. Try a smaller image or use Gallery.",
    );
    if (compressed.size > 0) return compressed;
  } catch (e) {
    if (e instanceof Error && e.message.includes("too long")) throw e;
  }
  return normalized;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return withTimeout(
    new Promise<string>((resolve, reject) => {
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
    }),
    30_000,
    "Reading photo timed out. Try again.",
  );
}
