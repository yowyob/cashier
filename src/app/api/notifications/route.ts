import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

// Les notifications proviennent du service notification-core (via le kernel).
// Plus aucune donnée factice (newsletters/forums) n'est générée ici.
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const backendResponse = await fetchBackend("/api/cashier/notifications", { cache: "no-store" }, "cashier");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load notifications." },
                { status: backendResponse.status }
            );
        }

        const items = Array.isArray(body) ? body : body?.data ?? [];
        return NextResponse.json({ notifications: items });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load notifications." }, { status: 500 });
    }
}
