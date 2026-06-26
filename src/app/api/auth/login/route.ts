import { NextResponse } from "next/server";
import { encrypt } from "@/lib/auth";
import { buildBackendUrl, readBackendJson, kernelAuthHeaders } from "@/lib/backend";

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

function normalizeField(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function resolveRole(user: BackendLoginUser) {
    // roleType reçoit le "kind" du profil caisse kernel (cashier-core) — valeurs possibles :
    // CASHIER, USER_ADMIN, ORGANIZATION_ADMIN, AGENCY_ADMIN, SELF — ou un role_type legacy.
    const roleType = (user.role_type || "").toLowerCase();
    if (roleType === "superadmin") return { role: "admin", roleType: "superadmin" as const };
    if (roleType === "organization_admin") return { role: "admin", roleType: "organization_admin" as const };
    if (roleType === "agency_admin") return { role: "admin", roleType: "agency_admin" as const };
    // USER_ADMIN = admin caisse non scopé ; on le traite comme un admin.
    if (roleType === "user_admin") return { role: "admin", roleType: null };
    // CASHIER = caissier (kind kernel) ; salesperson = alias legacy.
    if (roleType === "salesperson" || roleType === "cashier") return { role: "cashier", roleType: null };
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

        // Login direct contre kernel-core : champ "principal" (pas "email") + identité client
        // du BFF (X-Client-Id/X-Api-Key/X-Tenant-Id) injectée par kernelAuthHeaders.
        const loginHeaders = await kernelAuthHeaders(new Headers({ "Content-Type": "application/json" }));
        const backendResponse = await fetch(buildBackendUrl(BACKEND_LOGIN_PATH), {
            method: "POST",
            headers: loginHeaders,
            body: JSON.stringify({ principal: email, password })
        });

        // kernel-core enveloppe la réponse dans {success, data:{...}} ; readBackendJson
        // convertit déjà les clés en snake_case (accessToken -> access_token, nextStep -> next_step).
        const raw = (await readBackendJson(backendResponse)) as any;
        const d = (raw?.data ?? raw) as any;
        if (!backendResponse.ok || !raw?.success || !d) {
            return expectsJson
                ? NextResponse.json({ error: invalidMessage }, { status: backendResponse.status || 401 })
                : redirectWithError(invalidMessage, 303);
        }

        // Comptes privilégiés (admin plateforme) -> MFA. Les caissiers n'ont pas de MFA ; on
        // remonte proprement le cas plutôt que de créer une session incomplète.
        if (d.next_step === "CONFIRM_MFA" || d.mfa_token) {
            const mfaMsg = "MFA required";
            return expectsJson
                ? NextResponse.json({ error: mfaMsg, mfaRequired: true }, { status: 401 })
                : redirectWithError(mfaMsg, 303);
        }

        const accessToken = d.access_token || d.session_token || null;

        // Organisation du contexte de login : kernel-core ne renvoie pas encore de session ici, donc
        // on prend la 1re org d'accès retournée par l'auth. Elle est INDISPENSABLE pour appeler des
        // endpoints org-scopés comme /api/cashiers/self-profile (sinon 400 ORGANIZATION_CONTEXT_REQUIRED).
        const loginOrgs = Array.isArray(d.organizations) ? d.organizations : [];
        const loginOrgId = d.selected_organization_id
            || loginOrgs[0]?.organization_id
            || loginOrgs[0]?.organizationId
            || null;

        // Enrichissement identité caissier (rôle/agence/org) depuis cashier-core : ces champs
        // ne sont pas dans la réponse d'auth de kernel-core. Best-effort : un échec ne bloque
        // pas le login (l'UI pourra recharger le profil).
        let profile: any = null;
        try {
            const profileHeaders = await kernelAuthHeaders(new Headers());
            if (accessToken) profileHeaders.set("Authorization", `Bearer ${accessToken}`);
            // La session n'existe pas encore : injecter explicitement l'org du contexte de login.
            if (loginOrgId) profileHeaders.set("X-Organization-Id", String(loginOrgId));
            const profileResp = await fetch(
                buildBackendUrl(`/api/cashiers/self-profile?principalEmail=${encodeURIComponent(email)}`),
                { headers: profileHeaders }
            );
            if (profileResp.ok) profile = await readBackendJson(profileResp);
        } catch {
            profile = null;
        }

        const kind = (profile?.kind || "").toString().toLowerCase();
        const roleInfo = kind
            ? resolveRole({ ...d, role_type: kind } as BackendLoginUser)
            : resolveRole(d as BackendLoginUser);

        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const session = await encrypt({
            user: {
                id: profile?.kernel_user_id || d.id || d.user_id,
                username: d.username || email,
                role: roleInfo.role,
                roleType: roleInfo.roleType,
                agencyId: profile?.agency_id ?? d.agency_id ?? null,
                organizationId: profile?.organization_id ?? d.organization_id ?? loginOrgId ?? null,
                bankingAccount: profile?.banking_account ?? d.banking_account ?? null,
                accountingAccount: profile?.accounting_account ?? d.accounting_account ?? null
            },
            backend: {
                accessToken,
                tokenType: d.token_type || "Bearer",
                expiresIn: d.expires_in_seconds || d.expires_in || null
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
                user: {
                    id: profile?.kernel_user_id || d.id || d.user_id,
                    username: d.username || email,
                    role: roleInfo.role,
                    role_type: roleInfo.roleType,
                    agency_id: profile?.agency_id ?? d.agency_id ?? null,
                    organization_id: profile?.organization_id ?? d.organization_id ?? null
                },
                organizations: d.organizations || []
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
