// Photo storage adapter.
//
// Production / Vercel: Cloudinary (env vars CLOUDINARY_*).
//   - Vercel has no persistent filesystem, so the previous `uploads/`
//     directory approach simply doesn't work in prod.
// Local dev: also Cloudinary if CLOUDINARY_* is set; otherwise the legacy
//   filesystem path is still supported so the app keeps working without an
//   internet connection.
//
// What we store on the Photo row:
//   - publicId   — Cloudinary public_id (used for deletion + secure URLs)
//   - url        — Cloudinary secure_url (served directly to <img src>)
//   - mime, size — same as before
//   - filename   — legacy column, populated only when we fall back to disk
//   - sha256     — legacy column, populated only when we fall back to disk

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

const ROOT = process.env.PHOTO_DIR
  ? path.resolve(process.env.PHOTO_DIR)
  : path.resolve(process.cwd(), "uploads");

export const MAX_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_LOG = 12;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

function extFor(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  return "bin";
}

export class PhotoValidationError extends Error {}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

let cloudinaryConfigured = false;
function ensureCloudinary() {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  cloudinaryConfigured = true;
}

export type StoredPhoto = {
  publicId: string | null;
  url: string | null;
  filename: string | null;
  size: number;
  sha: string | null;
  mime: string;
};

export async function savePhotoBytes(
  bytes: ArrayBuffer,
  mime: string,
  opts: { folder?: string } = {},
): Promise<StoredPhoto> {
  if (!ALLOWED_MIME.has(mime)) {
    throw new PhotoValidationError(
      `Unsupported file type: ${mime}. Use JPG / PNG / WebP / HEIC.`,
    );
  }
  const size = bytes.byteLength;
  if (size === 0) throw new PhotoValidationError("Empty file.");
  if (size > MAX_SIZE_BYTES) {
    throw new PhotoValidationError(
      `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Max ${
        MAX_SIZE_BYTES / 1024 / 1024
      } MB.`,
    );
  }

  const buf = Buffer.from(bytes);

  if (isCloudinaryConfigured()) {
    ensureCloudinary();
    const folder = opts.folder ?? "bromonitor/evidence";
    const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
    const res = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "image",
      overwrite: false,
      // Auto-orient and strip EXIF — phones often upload sideways.
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });
    return {
      publicId: res.public_id,
      url: res.secure_url,
      filename: null,
      sha: null,
      size,
      mime,
    };
  }

  // Local fallback (dev only). Will not work on Vercel.
  const sha = createHash("sha256").update(buf).digest("hex");
  const ext = extFor(mime);
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const relDir = path.join(yyyy, mm);
  const absDir = path.join(ROOT, relDir);
  await fs.mkdir(absDir, { recursive: true });

  const filename = path.join(relDir, `${sha}.${ext}`);
  const abs = path.join(ROOT, filename);
  try {
    await fs.access(abs);
  } catch {
    await fs.writeFile(abs, buf, { mode: 0o640 });
  }
  return {
    publicId: null,
    url: null,
    filename,
    sha,
    size,
    mime,
  };
}

/** Upload an in-memory buffer to Cloudinary and return its hosted URL. Used
 *  for doubt images so Gemini Vision can read them. Throws if Cloudinary is
 *  not configured. */
export async function uploadDoubtImage(
  bytes: ArrayBuffer,
  mime: string,
): Promise<{ publicId: string; url: string; size: number; mime: string }> {
  if (!ALLOWED_MIME.has(mime)) {
    throw new PhotoValidationError(
      `Unsupported file type: ${mime}. Use JPG / PNG / WebP / HEIC.`,
    );
  }
  if (bytes.byteLength > MAX_SIZE_BYTES) {
    throw new PhotoValidationError(
      `Image too large (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB). Max ${
        MAX_SIZE_BYTES / 1024 / 1024
      } MB.`,
    );
  }
  if (!isCloudinaryConfigured()) {
    throw new PhotoValidationError(
      "Image upload requires Cloudinary. Set CLOUDINARY_* in .env.",
    );
  }
  ensureCloudinary();
  const buf = Buffer.from(bytes);
  const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
  const res = await cloudinary.uploader.upload(dataUri, {
    folder: "bromonitor/doubts",
    resource_type: "image",
    overwrite: false,
    // Preserve legibility of printed/handwritten numbers for Gemini Vision.
    transformation: [{ quality: "auto:good", fetch_format: "auto" }],
  });
  return {
    publicId: res.public_id,
    url: res.secure_url,
    size: bytes.byteLength,
    mime,
  };
}

/** Fetch a Cloudinary image as a Buffer (used by Gemini Vision to inline
 *  the bytes into a generateContent call). */
export async function fetchRemoteImage(
  url: string,
): Promise<{ bytes: Buffer; mime: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch image (HTTP ${res.status})`);
  }
  const mime = res.headers.get("content-type") || "image/jpeg";
  const ab = await res.arrayBuffer();
  return { bytes: Buffer.from(ab), mime };
}

export async function readPhotoBytes(filename: string): Promise<Buffer | null> {
  const abs = path.resolve(ROOT, filename);
  if (!abs.startsWith(ROOT + path.sep)) return null;
  try {
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}

export async function deletePhoto(photo: {
  publicId: string | null;
  filename: string | null;
}): Promise<void> {
  if (photo.publicId && isCloudinaryConfigured()) {
    ensureCloudinary();
    try {
      await cloudinary.uploader.destroy(photo.publicId, {
        resource_type: "image",
        invalidate: true,
      });
    } catch (e) {
      // Cloudinary delete failures aren't fatal — orphan a file rather than
      // refusing to delete the DB row.
      console.warn("Cloudinary delete failed:", e);
    }
    return;
  }
  if (photo.filename) {
    const abs = path.resolve(ROOT, photo.filename);
    if (!abs.startsWith(ROOT + path.sep)) return;
    try {
      await fs.unlink(abs);
    } catch {
      // already gone
    }
  }
}

export function photoUrl(id: string): string {
  return `/api/photos/${id}`;
}
