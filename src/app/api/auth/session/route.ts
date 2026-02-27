import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function withLegacyUserAliases(payload: any) {
    if (!payload?.user || typeof payload.user !== "object") {
        return payload;
    }
    const user = payload.user;
    return {
        ...payload,
        user: {
            ...user,
            roleType: user.roleType ?? user.role_type ?? null,
            agencyId: user.agencyId ?? user.agency_id ?? null,
            organizationId: user.organizationId ?? user.organization_id ?? null
        }
    };
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const backendResponse = await fetchBackend("/api/auth/session", { cache: "no-store" }, "cashier");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load session." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(withLegacyUserAliases(body ?? {}));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
