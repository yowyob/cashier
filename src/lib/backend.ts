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

const GESTION_EXACT_PATH_REWRITES: Record<string, string> = {
    "/api/organizations/current": "/organizations/my"
};

function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function rewriteGestionPath(path: string) {
    const parsed = new URL(path.startsWith("/") ? path : `/${path}`, "http://local");
    const exact = GESTION_EXACT_PATH_REWRITES[parsed.pathname];
    if (exact) {
        return `${exact}${parsed.search}`;
    }
    if (parsed.pathname.startsWith("/api/") && !parsed.pathname.startsWith("/api/v1/")) {
        return `${parsed.pathname.slice(4)}${parsed.search}`;
    }
    return `${parsed.pathname}${parsed.search}`;
}

function toSnakeCaseKey(value: string) {
    return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/-/g, "_").toLowerCase();
}

function normalizeBackendPayload(value: any): any {
    if (Array.isArray(value)) {
        return value.map(normalizeBackendPayload);
    }
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        const normalized: Record<string, any> = {};
        for (const [rawKey, rawValue] of Object.entries(value)) {
            const key = toSnakeCaseKey(rawKey);
            normalized[key] = normalizeBackendPayload(rawValue);
        }
        return normalized;
    }
    return value;
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
    const rewrittenPath =
        resolvedTarget === "gestion" ? rewriteGestionPath(normalizedPath) : normalizedPath;
    return `${normalizeBaseUrl(baseUrl)}${rewrittenPath}`;
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
        const parsed = await response.json();
        return normalizeBackendPayload(parsed);
    } catch {
        return null;
    }
}
