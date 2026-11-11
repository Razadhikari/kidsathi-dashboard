import { api, getSchool, getSession } from "@/lib/api";

export type Album = {
  id: string;
  title: string;
  date: string; // AD date, YYYY-MM-DD
  classroom: string | null;
  photo_count: number;
  created_at: string;
};

export type Photo = {
  id: string;
  album: string;
  caption: string;
  children: string[];
  children_names: string[];
  image_url: string;
  thumbnail_url: string;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Authorization + X-School-ID headers, read from the saved login. */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const session = getSession() as unknown as Record<string, string> | null;
  const token = session?.access ?? session?.access_token ?? session?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const school = getSchool();
  if (school?.id) headers["X-School-ID"] = String(school.id);
  return headers;
}

/**
 * fetch() with the login token. If the token has expired (401), we make one
 * normal api() call — that refreshes the token — and then try again once.
 */
async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const full = url.startsWith("http") ? url : `${API_BASE}${url}`;
  let res = await fetch(full, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } });
  if (res.status === 401) {
    await api("/api/v1/calendar/today/").catch(() => undefined);
    res = await fetch(full, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } });
  }
  return res;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data === "string") return data;
    if (data.detail) return String(data.detail);
    return Object.entries(data)
      .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(" ") : String(msg)}`)
      .join(" · ");
  } catch {
    return `Upload failed (error ${res.status}).`;
  }
}

/** Phone photos are often 5–10 MB. Shrink big ones to max 2560 px JPEG before upload. */
export async function shrinkImage(file: File, maxSide = 2560): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // e.g. HEIC that the browser can't read: send the original
  }
}

export async function uploadPhoto(albumId: string, file: File, caption: string, childIds: string[]): Promise<Photo> {
  const body = new FormData();
  body.append("image", await shrinkImage(file));
  body.append("caption", caption);
  for (const id of childIds) body.append("children", id);
  const res = await authFetch(`/api/v1/albums/${albumId}/photos/`, { method: "POST", body });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Protected images need the token, so we download them and show a local blob: URL. */
const blobCache = new Map<string, Promise<string>>();

export function imageObjectUrl(url: string): Promise<string> {
  let cached = blobCache.get(url);
  if (!cached) {
    cached = authFetch(url).then(async (res) => {
      if (!res.ok) throw new Error(`Image error ${res.status}`);
      return URL.createObjectURL(await res.blob());
    });
    cached.catch(() => blobCache.delete(url));
    blobCache.set(url, cached);
  }
  return cached;
}

export function todayAD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ALBUM_IDEAS = ["Dashain celebration", "Tihar", "Sports day", "Art & craft", "Field trip", "Birthday"];
