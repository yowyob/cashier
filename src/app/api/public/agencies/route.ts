import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");

        const backendResponse = await fetchBackend("/agencies", { cache: "no-store" }, "gestion");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load agencies." },
                { status: backendResponse.status }
            );
        }

        const agencies = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        const filtered = organizationId
            ? agencies.filter((agency: any) => {
                const value = agency.organization_id ?? agency.organizationId ?? null;
                return value === organizationId;
            })
            : agencies;

        return NextResponse.json(filtered);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load agencies." }, { status: 500 });
    }
}
