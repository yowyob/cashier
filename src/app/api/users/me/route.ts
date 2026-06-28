import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const backendResponse = await fetchBackend("/api/users/me", { cache: "no-store" }, "cashier");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json({ error: body?.error || "Failed to load user." }, { status: backendResponse.status });
        }
        return NextResponse.json(body?.data ?? body ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load user." }, { status: 500 });
    }
}
