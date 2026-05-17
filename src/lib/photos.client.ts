export const MAX_PHOTOS_PER_LOG = 12;

export function photoUrl(id: string): string {
  return `/api/photos/${id}`;
}
