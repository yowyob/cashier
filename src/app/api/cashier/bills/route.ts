import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET(request: Request) {
    const session = await getSession().catch(() => null);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { search } = new URL(request.url);
    const backendResponse = await fetchBackend(`/api/cashier/bills${search}`, {
        cache: "no-store"
    });
    const body = await readBackendJson(backendResponse);

    if (!backendResponse.ok) {
        return NextResponse.json(
            { error: body?.error || "Failed to load bills." },
            { status: backendResponse.status }
        );
    }

    return NextResponse.json(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []);
}
