import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function PUT(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const bodyText = await request.text();
        const parsed = bodyText ? JSON.parse(bodyText) : {};
        const payload = JSON.stringify({ avatarId: parsed.avatarId ?? parsed.avatar_id ?? null });

        const backendResponse = await fetchBackend("/api/users/me/avatar", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: payload
        }, "cashier");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json({ error: body?.error || "Failed to update avatar." }, { status: backendResponse.status });
        }
        return NextResponse.json(body?.data ?? body ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to update avatar." }, { status: 500 });
    }
}
