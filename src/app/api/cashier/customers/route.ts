import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = (session as any).user?.organizationId || (session as any).organization?.id || null;
        if (!organizationId) {
            return NextResponse.json([]);
        }
        // Clients servis par le kernel sous /api/customers (tp-core) — /api/cashier/customers n'existe pas.
        const backendResponse = await fetchBackend(
            `/api/customers?organizationId=${encodeURIComponent(String(organizationId))}`,
            { cache: "no-store" },
            "tiers"
        );
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load cashier customers." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
