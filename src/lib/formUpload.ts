/** Parse multipart file fields from Route Handler FormData (File or Blob). */

export type ParsedUpload = {
  bytes: ArrayBuffer;
  mime: string;
  name: string;
  size: number;
};

function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

export async function readFormUpload(
  entry: FormDataEntryValue | null,
  fallbackName = "photo.jpg",
): Promise<ParsedUpload | null> {
  if (!entry || typeof entry === "string") return null;
  if (!(entry instanceof Blob) || entry.size === 0) return null;

  const name =
    entry instanceof File && entry.name ? entry.name : fallbackName;
  const mime =
    entry.type && entry.type.startsWith("image/")
      ? entry.type
      : mimeFromName(name);

  return {
    bytes: await entry.arrayBuffer(),
    mime,
    name,
    size: entry.size,
  };
}
