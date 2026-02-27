import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET() {
    try {
        const backendResponse = await fetchBackend("/api/config/denominations", { cache: "no-store" });
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load denominations." },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(body || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
