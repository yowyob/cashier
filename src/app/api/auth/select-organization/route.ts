import { NextResponse } from "next/server";
import { encrypt, getSession } from "@/lib/auth";

function normalizeField(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function resolveRole(roleName: string | null) {
    const normalized = (roleName || "").toUpperCase();
    if (normalized === "ROLE_SUPERADMIN") {
        return { role: "admin", roleType: "superadmin" } as const;
    }
    if (normalized === "ROLE_ORG_ADMIN" || normalized === "ROLE_ADMIN") {
        return { role: "admin", roleType: "organization_admin" } as const;
    }
    if (normalized === "ROLE_MANAGER") {
        return { role: "admin", roleType: "agency_admin" } as const;
    }
    if (normalized === "ROLE_SALESPERSON") {
        return { role: "cashier", roleType: null } as const;
    }
    return { role: "cashier", roleType: null } as const;
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

    try {
        const session = await getSession();
        if (!session) {
            return expectsJson
                ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
                : redirectWithError("Unauthorized", 303);
        }

        let organizationId: string | null = null;
        let organizationName: string | null = null;
        let agencyId: string | null = null;
        let agencyName: string | null = null;
        let roleName: string | null = null;
        let accessToken: string | null = null;
        let tokenType: string | null = null;
        let expiresIn: number | null = null;

        if (expectsJson) {
            const body = await request.json();
            organizationId = normalizeField(body?.organization_id ?? body?.organizationId);
            organizationName = normalizeField(body?.organization_name ?? body?.organizationName);
            agencyId = normalizeField(body?.agency_id ?? body?.agencyId);
            agencyName = normalizeField(body?.agency_name ?? body?.agencyName);
            roleName = normalizeField(body?.role_name ?? body?.roleName);
            accessToken = normalizeField(body?.access_token ?? body?.accessToken);
            tokenType = normalizeField(body?.token_type ?? body?.tokenType);
            expiresIn =
                typeof body?.expires_in === "number"
                    ? body.expires_in
                    : typeof body?.expiresIn === "number"
                        ? body.expiresIn
                        : null;
        } else {
            const formData = await request.formData();
            organizationId = normalizeField(formData.get("organization_id"));
            organizationName = normalizeField(formData.get("organization_name"));
            agencyId = normalizeField(formData.get("agency_id"));
            agencyName = normalizeField(formData.get("agency_name"));
            roleName = normalizeField(formData.get("role_name"));
            accessToken = normalizeField(formData.get("access_token"));
            tokenType = normalizeField(formData.get("token_type"));
            const expiresRaw = formData.get("expires_in");
            expiresIn = typeof expiresRaw === "string" && expiresRaw.trim() ? Number(expiresRaw) : null;
        }

        if (!organizationId) {
            return expectsJson
                ? NextResponse.json({ error: "organization_id is required" }, { status: 400 })
                : redirectWithError("organization_id is required", 303);
        }

        const roleInfo = resolveRole(roleName);
        const resolvedAgencyId = roleInfo.roleType === "agency_admin" ? agencyId : null;
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const nextSession = {
            ...session,
            user: {
                ...session.user,
                role: roleInfo.role,
                roleType: roleInfo.roleType,
                organizationId,
                agencyId: resolvedAgencyId
            },
            backend: {
                ...(session.backend || {}),
                accessToken: accessToken || session.backend?.accessToken || null,
                tokenType: tokenType || session.backend?.tokenType || "Bearer",
                expiresIn: expiresIn ?? session.backend?.expiresIn ?? null
            },
            organization: organizationName ? { id: organizationId, name: organizationName } : undefined,
            agency: resolvedAgencyId && agencyName ? { id: resolvedAgencyId, name: agencyName } : undefined,
            expires
        };

        const token = await encrypt(nextSession);

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
            ? NextResponse.json({ success: true, user: nextSession.user })
            : NextResponse.redirect(redirectTo("/"), { status: 303 });

        response.cookies.set({
            name: "session",
            value: token,
            httpOnly: true,
            expires,
            path: "/",
            sameSite: "lax",
            ...(shouldSetDomain ? { domain: hostname } : {})
        });

        return response;
    } catch (error: any) {
        const message = error?.message || "Failed to select organization.";
        return expectsJson
            ? NextResponse.json({ error: message }, { status: 500 })
            : redirectWithError(message, 303);
    }
}
