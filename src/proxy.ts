import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession, decrypt } from "@/lib/auth";

export async function proxy(request: NextRequest) {
    const session = request.cookies.get("session")?.value;
    const path = request.nextUrl.pathname;

    // Public paths
    if (path === "/login" || path.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    // Check if session exists
    if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Verify session
    try {
        const payload = await decrypt(session);

        // Admin routes protection
        if (path.startsWith("/admin") && payload.user.role !== "admin") {
            // Redirect to dashboard if not admin
            return NextResponse.redirect(new URL("/", request.url));
        }

        return await updateSession(request);
    } catch (error) {
        console.error("Invalid session", error);
        return NextResponse.redirect(new URL("/login", request.url));
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
    ],
};
