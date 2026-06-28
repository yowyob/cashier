import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET() {
    try {
        const backendResponse = await fetchBackend("/api/organizations/current", { cache: "no-store" }, "tiers");
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load organization." },
                { status: backendResponse.status }
            );
        }

        const normalized =
            Array.isArray(body)
                ? body[0] || null
                : Array.isArray(body?.data)
                    ? body.data[0] || null
                    : body;

        return NextResponse.json(normalized ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load organization." }, { status: 500 });
    }
}
