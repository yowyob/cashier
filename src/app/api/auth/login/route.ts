import { NextResponse } from "next/server";
import { encrypt } from "@/lib/auth";
import { buildBackendUrl, readBackendJson } from "@/lib/backend";

const BACKEND_LOGIN_PATH = "/api/auth/login";

type BackendLoginUser = {
    id: string;
    username: string;
    role?: string | null;
    role_type?: string | null;
    agency_id?: string | null;
    organization_id?: string | null;
    banking_account?: string | null;
    accounting_account?: string | null;
};

type BackendOrganization = {
    organization_id: string;
    organization_name: string;
    role_id?: string | null;
    role_name?: string | null;
    agency_id?: string | null;
    agency_name?: string | null;
    is_active?: boolean | null;
    joined_at?: string | null;
};

type BackendLoginResponse = {
    success: boolean;
    user: BackendLoginUser;
    access_token?: string;
    accessToken?: string;
    token_type?: string;
    tokenType?: string;
    expires_in?: number;
    expiresIn?: number;
    organizations?: BackendOrganization[];
};

function normalizeField(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function resolveRole(user: BackendLoginUser) {
    const roleType = (user.role_type || "").toLowerCase();
    if (roleType === "superadmin") return { role: "admin", roleType: "superadmin" as const };
    if (roleType === "organization_admin") return { role: "admin", roleType: "organization_admin" as const };
    if (roleType === "agency_admin") return { role: "admin", roleType: "agency_admin" as const };
    if (roleType === "salesperson") return { role: "cashier", roleType: null };
    const role = (user.role || "").toLowerCase();
    if (role === "admin") return { role: "admin", roleType: null };
    if (role === "cashier") return { role: "cashier", roleType: null };
    return { role: "user", roleType: null };
}

export async function POST(request: Request) {
    const contentType = request.headers.get("content-type") || "";
    const expectsJson = contentType.includes("application/json");
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const rawHost = hostHeader?.split(",")[0].trim();
    const proto =
        request.headers.get("x-forwarded-proto") ||
        new URL(request.url).protocol.replace(":", "");
    const origin = rawHost ? `${proto}://${rawHost}` : new URL(request.url).origin;
    const redirectTo = (path: string) => new URL(path, origin);
    const redirectWithError = (message: string, status = 303) => {
        const url = redirectTo("/login");
        url.searchParams.set("error", message);
        return NextResponse.redirect(url, { status });
    };
    const invalidMessage = "Invalid credentials";

    try {
        let email: string | null = null;
        let password: string | null = null;

        if (expectsJson) {
            const body = await request.json();
            email = normalizeField(body?.email) || normalizeField(body?.username);
            password = normalizeField(body?.password);
        } else {
            const formData = await request.formData();
            email = normalizeField(formData.get("email")) || normalizeField(formData.get("username"));
            password = normalizeField(formData.get("password"));
        }

        if (!email || !password) {
            return expectsJson
                ? NextResponse.json({ error: invalidMessage }, { status: 400 })
                : redirectWithError(invalidMessage, 303);
        }

        const backendResponse = await fetch(buildBackendUrl(BACKEND_LOGIN_PATH), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const backendBody = (await readBackendJson(backendResponse)) as BackendLoginResponse | null;
        if (!backendResponse.ok || !backendBody?.success || !backendBody.user) {
            return expectsJson
                ? NextResponse.json({ error: invalidMessage }, { status: backendResponse.status || 401 })
                : redirectWithError(invalidMessage, 303);
        }

        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const roleInfo = resolveRole(backendBody.user);
        const session = await encrypt({
            user: {
                id: backendBody.user.id,
                username: backendBody.user.username || email,
                role: roleInfo.role,
                roleType: roleInfo.roleType,
                agencyId: backendBody.user.agency_id ?? null,
                organizationId: backendBody.user.organization_id ?? null,
                bankingAccount: backendBody.user.banking_account ?? null,
                accountingAccount: backendBody.user.accounting_account ?? null
            },
            backend: {
                accessToken: backendBody.access_token || backendBody.accessToken || null,
                tokenType: backendBody.token_type || backendBody.tokenType || "Bearer",
                expiresIn: backendBody.expires_in || backendBody.expiresIn || null
            },
            expires
        });

        let hostname = rawHost;
        if (hostname?.startsWith("[")) {
            const end = hostname.indexOf("]");
            hostname = end !== -1 ? hostname.slice(1, end) : hostname;
        } else if (hostname?.includes(":")) {
            hostname = hostname.split(":")[0];
        }
        const isIpv4 = hostname ? /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) : false;
        const isIp = Boolean(rawHost?.startsWith("[")) || isIpv4;
        const shouldSetDomain = Boolean(hostname && hostname !== "localhost" && !isIp);

        const response = expectsJson
            ? NextResponse.json({
                success: true,
                user: backendBody.user,
                organizations: backendBody.organizations || []
            })
            : NextResponse.redirect(redirectTo("/"), { status: 303 });

        response.cookies.set({
            name: "session",
            value: session,
            httpOnly: true,
            expires,
            path: "/",
            sameSite: "lax",
            ...(shouldSetDomain ? { domain: hostname } : {})
        });

        return response;
    } catch (error: any) {
        const message = error?.message || "Login error. Please try again.";
        return expectsJson
            ? NextResponse.json({ error: message }, { status: 500 })
            : redirectWithError("Login error. Please try again.", 303);
    }
}
