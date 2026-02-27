import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET() {
    try {
        const backendResponse = await fetchBackend("/api/organizations/current");
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load organization." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load organization." }, { status: 500 });
    }
}
