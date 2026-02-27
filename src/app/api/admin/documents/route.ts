import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function asArray(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const backendResponse = await fetchBackend("/api/admin/documents", { cache: "no-store" });
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            if (backendResponse.status === 404 || backendResponse.status === 405) {
                return NextResponse.json([]);
            }
            return NextResponse.json(
                { error: body?.error || "Failed to load documents." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(asArray(body));
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load documents." }, { status: 500 });
    }
}
