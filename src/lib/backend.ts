import { getSession } from "@/lib/auth";

type BackendTarget = "cashier" | "gestion";

const CASHIER_BACKEND_URL =
    process.env.ERP_CASHIER_BACKEND_URL ||
    process.env.ERP_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8081";

const GESTION_TIERS_BACKEND_URL =
    process.env.GESTION_TIERS_BACKEND_URL ||
    process.env.ERP_GESTION_BACKEND_URL ||
    "http://localhost:8080";

const CASHIER_PREFIXES = [
    "/api/auth",
    "/api/sessions",
    "/api/cashier/sessions",
    "/api/movements",
    "/api/cashier/movements",
    "/api/transactions",
    "/api/reconciliations",
    "/api/admin/reconciliations",
    "/api/cashier/reconciliations",
    "/api/audit",
    "/api/notify-unauthorized",
    "/api/v1/accounting",
    "/api/users/profile"
];

function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function resolveBackendTarget(path: string): BackendTarget {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (CASHIER_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
        return "cashier";
    }
    return "gestion";
}

export function buildBackendUrl(path: string, target?: BackendTarget) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const resolvedTarget = target || resolveBackendTarget(normalizedPath);
    const baseUrl = resolvedTarget === "cashier" ? CASHIER_BACKEND_URL : GESTION_TIERS_BACKEND_URL;
    return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}

export async function fetchBackend(path: string, options: RequestInit = {}, target?: BackendTarget) {
    const headers = new Headers(options.headers || {});
    const session = await getSession();
    const token = session?.backend?.accessToken;
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(buildBackendUrl(path, target), { ...options, headers });
}

export async function readBackendJson(response: Response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
