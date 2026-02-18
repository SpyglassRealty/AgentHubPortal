export const PREVIEW_BASE_URL = "https://spyglass-idx.vercel.app";

export function buildPreviewUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PREVIEW_BASE_URL}${normalizedPath}`;
}
