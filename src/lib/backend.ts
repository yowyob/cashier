// NB: ce module est de facto server-only (il importe next/headers via @/lib/auth et
// détient la clé client kernel) — ne JAMAIS l'importer depuis un composant client.
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

// ── Identité client kernel-core (BFF Next.js) ────────────────────────────────
// Ces requêtes partent UNIQUEMENT du serveur Next (route handlers / server code) :
// la clé ne doit JAMAIS être exposée au navigateur (pas de NEXT_PUBLIC_). Le module
// est marqué "server-only" pour interdire tout import côté client.
// Reproduit ce que faisait le proxy du BFF Spring (X-Client-Id/X-Api-Key + tenant).
const KERNEL_CLIENT_ID = process.env.KERNEL_CLIENT_ID || "";
const KERNEL_CLIENT_SECRET = process.env.KERNEL_CLIENT_SECRET || "";
const KERNEL_TENANT_ID =
    process.env.KERNEL_TENANT_ID ||
    process.env.RT_TENANT_ID ||
    "11111111-1111-1111-1111-111111111111";

/**
 * En-têtes d'authentification kernel-core à poser sur CHAQUE appel sortant :
 * identité du backend (X-Client-Id/X-Api-Key), tenant, jeton de session utilisateur
 * (Bearer) et contexte org/agence extrait de la session. Remplace l'injection que
 * faisait le CashierCoreProxyWebFilter du BFF Spring.
 */
export async function kernelAuthHeaders(headers: Headers = new Headers()) {
    if (KERNEL_CLIENT_ID) headers.set("X-Client-Id", KERNEL_CLIENT_ID);
    if (KERNEL_CLIENT_SECRET) headers.set("X-Api-Key", KERNEL_CLIENT_SECRET);
    if (!headers.has("X-Tenant-Id")) headers.set("X-Tenant-Id", KERNEL_TENANT_ID);

    const session = await getSession();
    const token = session?.backend?.accessToken;
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    const orgId = session?.user?.organizationId;
    const agencyId = session?.user?.agencyId;
    if (orgId && !headers.has("X-Organization-Id")) headers.set("X-Organization-Id", String(orgId));
    if (agencyId && !headers.has("X-Agency-Id")) headers.set("X-Agency-Id", String(agencyId));
    return headers;
}

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

// Déploiement B2B strict : quand la cible gestion-tiers EST le même backend que la caisse
// (un seul BFF passerelle), on NE strippe PAS le préfixe /api — le BFF et iwm exposent /api/...
function isSingleBackend() {
    return normalizeBaseUrl(GESTION_TIERS_BACKEND_URL) === normalizeBaseUrl(CASHIER_BACKEND_URL);
}

function rewriteGestionPath(path: string) {
    const parsed = new URL(path.startsWith("/") ? path : `/${path}`, "http://local");
    const singleBackend = isSingleBackend();
    const exact = GESTION_EXACT_PATH_REWRITES[parsed.pathname];
    if (exact) {
        // exact = "/organizations/my" (endpoint racine du backend gestion-tiers dédié).
        // En mode mono-BFF, on conserve le préfixe /api (le BFF relaie /api/organizations/my → iwm).
        const target = singleBackend ? `/api${exact}` : exact;
        return `${target}${parsed.search}`;
    }
    if (!singleBackend && parsed.pathname.startsWith("/api/") && !parsed.pathname.startsWith("/api/v1/")) {
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
    const headers = await kernelAuthHeaders(new Headers(options.headers || {}));
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
