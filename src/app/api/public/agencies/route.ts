import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { cheminAgences } from "@/lib/kernel-agencies";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");

        // Le noyau range les agences sous leur organisation : sans organisation, rien à lister.
        if (!organizationId) {
            return NextResponse.json([]);
        }
        const backendResponse = await fetchBackend(cheminAgences(organizationId), { cache: "no-store" }, "tiers");
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
