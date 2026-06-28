import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET() {
    try {
        const backendResponse = await fetchBackend("/organizations/my", { cache: "no-store" }, "tiers");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load organizations." },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load organizations." }, { status: 500 });
    }
}
