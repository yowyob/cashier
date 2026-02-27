import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
    const session = await getSession().catch(() => null);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const sanitizedBody = {
            amount: body?.amount,
            reason: body?.reason ?? null,
            reference: body?.reference ?? null
        };
        const backendResponse = await fetchBackend("/api/cashier/fund-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sanitizedBody)
        });
        const payload = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: payload?.message || payload?.error || "Fund request failed" },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(payload ?? {});
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Fund request failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const session = await getSession().catch(() => null);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/cashier/fund-requests${search}`, {
            cache: "no-store"
        });
        const payload = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: payload?.message || payload?.error || "Failed to load fund requests" },
                { status: backendResponse.status }
            );
        }
        return NextResponse.json(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load fund requests";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
