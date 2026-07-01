import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

// Le test de notification passe désormais par notification-core (via le kernel),
// et non plus par un envoi Telegram direct.
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const channel = typeof body.channel === "string" && body.channel.trim() ? body.channel.trim() : "EMAIL";
        const recipient = typeof body.recipient === "string" ? body.recipient.trim() : "";
        const subject = typeof body.subject === "string" && body.subject.trim()
            ? body.subject.trim()
            : "Test KSM Cashier";

        if (!recipient) {
            return NextResponse.json({ error: "recipient is required." }, { status: 400 });
        }

        const backendResponse = await fetchBackend(
            "/api/cashier/notifications/test",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel, subject, recipient })
            },
            "cashier"
        );
        const payload = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: payload?.error || "Failed to send test notification." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(payload?.data ?? payload ?? { ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to send test notification." }, { status: 500 });
    }
}
