import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { getAdminMonitoringScope } from "@/lib/monitoring";
import { applyMonitoringScope } from "@/lib/monitoring-scope-filter";

export async function GET() {
    try {
        const session = await getSession();
        const organizationId = session?.user?.organizationId || session?.organization?.id || null;
        if (!organizationId) {
            return NextResponse.json({ error: "Missing organization scope." }, { status: 400 });
        }

        const backendResponse = await fetchBackend("/api/transactions/recent", {
            headers: { "X-Tenant-ID": organizationId }
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load recent transactions." },
                { status: backendResponse.status }
            );
        }

        const payload = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : body ?? [];
        if (session?.user?.role === "admin") {
            const monitoring = await getAdminMonitoringScope(session);
            return NextResponse.json(applyMonitoringScope(Array.isArray(payload) ? payload : [payload], monitoring));
        }
        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load recent transactions." }, { status: 500 });
    }
}
