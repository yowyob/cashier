import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET() {
    try {
        const session = await getSession();
        const organizationId = session?.user?.organizationId || session?.organization?.id || null;
        if (!organizationId) {
            return NextResponse.json({ error: "Missing organization scope." }, { status: 400 });
        }

        const backendResponse = await fetchBackend("/api/dashboard/stat", {
            headers: { "X-Tenant-ID": organizationId }
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load dashboard stats." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load dashboard stats." }, { status: 500 });
    }
}
