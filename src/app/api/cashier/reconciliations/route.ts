import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/cashier/reconciliations${search}`, {
            cache: "no-store"
        });
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load reconciliations." },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(body || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
