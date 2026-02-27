import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const { source_account_id, dest_account_id, amount, ticketing, reference } = body;

        if (!source_account_id || !dest_account_id || !amount) {
            return NextResponse.json({ error: "Source, Destination and Amount are required" }, { status: 400 });
        }

        const backendResponse = await fetchBackend("/api/accounts/transfer-p2p", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_account_id, dest_account_id, amount, ticketing, reference })
        });
        const payload = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: payload?.error || "Transfer failed" },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(payload ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
