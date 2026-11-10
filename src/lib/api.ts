const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = { id: string; full_name: string; phone_number: string };
export type Session = { access: string; refresh: string; user: User };
export type SchoolChoice = { id: string; name: string };
export type Paged<T> = { count: number; results: T[] };

const SESSION_KEY = "kidsathi.session";
const SCHOOL_KEY = "kidsathi.school";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSchool(): SchoolChoice | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SCHOOL_KEY);
  return raw ? (JSON.parse(raw) as SchoolChoice) : null;
}

export function saveSchool(school: SchoolChoice) {
  localStorage.setItem(SCHOOL_KEY, JSON.stringify(school));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SCHOOL_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(`API error ${status}`);
  }
}

async function refreshSession(session: Session): Promise<Session | null> {
  const res = await fetch(`${API_URL}/api/v1/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: session.refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const next = { ...session, access: data.access, refresh: data.refresh ?? session.refresh };
  saveSession(next);
  return next;
}

type ApiOptions = RequestInit & { json?: unknown };

/** Call the KidSathi API. Adds the token + school header, refreshes expired tokens. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, ...init } = options;
  const session = getSession();
  const school = getSchool();

  const headers = new Headers(init.headers);
  if (session) headers.set("Authorization", `Bearer ${session.access}`);
  if (school) headers.set("X-School-ID", school.id);
  let body = init.body;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  const send = () => fetch(`${API_URL}${path}`, { ...init, headers, body });
  let res = await send();

  if (res.status === 401 && session) {
    const refreshed = await refreshSession(session);
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed.access}`);
      res = await send();
    }
  }
  if (res.status === 401 && session) {
    clearSession();
    window.location.href = "/login";
    throw new ApiError(401, null);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
