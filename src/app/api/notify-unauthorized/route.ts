import { NextResponse } from "next/server";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();
        const backendResponse = await fetchBackend("/api/notify-unauthorized", {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to notify unauthorized." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? { success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to notify unauthorized." }, { status: 500 });
    }
}
