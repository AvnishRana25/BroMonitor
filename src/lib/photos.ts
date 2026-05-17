import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.env.PHOTO_DIR
  ? path.resolve(process.env.PHOTO_DIR)
  : path.resolve(process.cwd(), "uploads");

export const MAX_SIZE_BYTES = 8 * 1024 * 1024;

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

export async function savePhotoBytes(
  bytes: ArrayBuffer,
  mime: string
): Promise<{ filename: string; size: number; sha: string }> {
  if (!ALLOWED_MIME.has(mime)) {
    throw new PhotoValidationError(
      `Unsupported file type: ${mime}. Use JPG / PNG / WebP / HEIC.`
    );
  }
  const size = bytes.byteLength;
  if (size === 0) throw new PhotoValidationError("Empty file.");
  if (size > MAX_SIZE_BYTES) {
    throw new PhotoValidationError(
      `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Max ${
        MAX_SIZE_BYTES / 1024 / 1024
      } MB.`
    );
  }

  const buf = Buffer.from(bytes);
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
  return { filename, size, sha };
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

export async function deletePhotoFile(filename: string): Promise<void> {
  const abs = path.resolve(ROOT, filename);
  if (!abs.startsWith(ROOT + path.sep)) return;
  try {
    await fs.unlink(abs);
  } catch {
    // already gone
  }
}

export function photoUrl(id: string): string {
  return `/api/photos/${id}`;
}
