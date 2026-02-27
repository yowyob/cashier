import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();
        const backendResponse = await fetchBackend("/api/accounts/transfer", {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Deposit failed." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
