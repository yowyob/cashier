import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
    const origin = host ? `${proto}://${host}` : request.nextUrl.origin;
    const redirectTo = (path: string) => new URL(path, origin);

    // Publicly accessible assets
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/brand") ||
        pathname.startsWith("/icon") ||
        pathname.startsWith("/apple-icon") ||
        pathname.startsWith("/storage") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/public") ||
        pathname.startsWith("/api/notify-unauthorized") ||
        pathname === "/welcome"
    ) {
        return NextResponse.next();
    }

    const sessionCookie = request.cookies.get("session")?.value;
    // L'auto-audit de chaque requête est retiré : il visait /api/audit/log, route qui n'a jamais
    // existé (ni ici ni dans le noyau), et partait donc en 404 à chaque requête. Le noyau journalise
    // déjà les actions sensibles ; écrire une entrée d'audit de trésorerie par requête HTTP
    // demanderait en plus une permission (treasury:manage) que la caisse n'a pas.

    // Allow access to login page even if a session cookie exists (enables switching accounts)
    if (pathname === "/login") {
        return NextResponse.next();
    }

    if (!sessionCookie) {
        return NextResponse.redirect(redirectTo("/welcome"));
    }

    try {
        const payload = await decrypt(sessionCookie);

        if (
            payload.user?.role === "admin" &&
            payload.user?.roleType === "superadmin" &&
            !pathname.startsWith("/api")
        ) {
            const isAdminOnlyPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/admins");
            if (pathname === "/" || isAdminOnlyPage) {
                return NextResponse.redirect(redirectTo("/admin/admins"));
            }
        }

        if (payload.user?.role === "admin" && payload.user?.roleType === "superadmin" && pathname.startsWith("/api")) {
            const allowedApiPrefixes = [
                "/api/organizations",
                "/api/users/admins",
                "/api/users/profile",
                "/api/lookup",
                "/api/notifications",
                "/api/audit/log"
            ];
            const isAllowed = allowedApiPrefixes.some((prefix) => pathname.startsWith(prefix));
            if (!isAllowed) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        // Role-based guards
        if (pathname.startsWith("/admin") && payload.user?.role !== "admin") {
            await fetch(new URL("/api/notify-unauthorized", origin), {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-skip-audit": "1",
                    ...(sessionCookie ? { Cookie: `session=${sessionCookie}` } : {})
                },
                body: JSON.stringify({
                    path: pathname,
                    username: payload.user?.username,
                    userId: payload.user?.id || null,
                    agencyId: payload.user?.agencyId || null,
                    organizationId: payload.user?.organizationId || null,
                    ip: request.ip || request.headers.get("x-forwarded-for") || null,
                    userAgent: request.headers.get("user-agent") || null,
                    macAddress: request.headers.get("x-mac-address") || null
                })
            }).catch(() => {});
            return NextResponse.redirect(redirectTo("/"));
        }
        // Agency admin restricted pages
        if (
            pathname.startsWith("/admin") &&
            payload.user?.role === "admin" &&
            payload.user?.roleType === "agency_admin" &&
            (
                pathname.startsWith("/admin/admins") ||
                pathname.startsWith("/admin/agencies") ||
                pathname.startsWith("/admin/cashiers")
            )
        ) {
            // Notify superadmin of unauthorized attempt via API (server runtime)
            await fetch(new URL("/api/notify-unauthorized", origin), {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-skip-audit": "1",
                    ...(sessionCookie ? { Cookie: `session=${sessionCookie}` } : {})
                },
                body: JSON.stringify({
                    path: pathname,
                    username: payload.user?.username,
                    agencyId: payload.user?.agencyId || null,
                    ip: request.ip || request.headers.get("x-forwarded-for") || null,
                    userAgent: request.headers.get("user-agent") || null,
                    macAddress: request.headers.get("x-mac-address") || null
                })
            }).catch(() => {});
            return NextResponse.redirect(redirectTo("/"));
        }

        if ((pathname.startsWith("/operations") || pathname.startsWith("/cashier")) && payload.user?.role !== "cashier") {
            return NextResponse.redirect(redirectTo("/"));
        }

        // Already authenticated user hitting /login -> redirect home
        if (pathname === "/login") {
            return NextResponse.redirect(redirectTo("/"));
        }

        return NextResponse.next();
    } catch (error) {
        return NextResponse.redirect(redirectTo("/login"));
    }
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|storage).*)",
    ],
};
