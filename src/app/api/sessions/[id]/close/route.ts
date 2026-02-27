import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized. Only admins can close sessions." }, { status: 403 });
        }

        const { id: sessionId } = await params;
        const body = await request.json();
        const backendResponse = await fetchBackend(`/api/sessions/${sessionId}/close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const payload = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: payload?.error || payload?.message || "Failed to close session." },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(payload ?? {});

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
