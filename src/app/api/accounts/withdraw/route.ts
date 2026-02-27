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
        const { account_id, amount, ticketing, reason, reference } = body;

        if (!account_id || !amount) {
            return NextResponse.json({ error: "Account ID and amount are required" }, { status: 400 });
        }

        const backendResponse = await fetchBackend("/api/accounts/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_id, amount, ticketing, reason, reference })
        });
        const payload = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: payload?.error || "Withdrawal failed" },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(payload ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
