import { getSession } from "@/lib/auth";

const BACKEND_URL =
    process.env.ERP_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8081";

export function buildBackendUrl(path: string) {
    const base = BACKEND_URL.endsWith("/") ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    return `${base}${path}`;
}

export async function fetchBackend(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers || {});
    const session = await getSession();
    const token = session?.backend?.accessToken;
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(buildBackendUrl(path), { ...options, headers });
}

export async function readBackendJson(response: Response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
