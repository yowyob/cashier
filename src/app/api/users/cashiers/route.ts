import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdminMonitoringScope } from "@/lib/monitoring";
import { applyMonitoringScope } from "@/lib/monitoring-scope-filter";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function normalizeCashierPayload(payload: any) {
    if (!payload) return payload;
    if (Array.isArray(payload)) {
        return payload.map(normalizeCashierPayload);
    }
    if (payload.cashier_profile && !payload.cashierProfile) {
        const { cashier_profile, ...rest } = payload;
        return { ...rest, cashierProfile: cashier_profile };
    }
    return payload;
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.roleType === "agency_admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();
        const backendResponse = await fetchBackend("/api/users/cashiers", {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to create cashier." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(normalizeCashierPayload(body ?? {}));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/users/cashiers${search}`, {
            cache: "no-store"
        });
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load cashiers." },
                { status: backendResponse.status }
            );
        }

        const payload = normalizeCashierPayload(body) || [];
        if (session.user.role === "admin") {
            const monitoring = await getAdminMonitoringScope(session);
            return NextResponse.json(applyMonitoringScope(Array.isArray(payload) ? payload : [payload], monitoring));
        }
        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
