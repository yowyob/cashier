import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { getAdminMonitoringScope } from "@/lib/monitoring";
import { applyMonitoringScope } from "@/lib/monitoring-scope-filter";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/audit${search}`, {
            cache: "no-store"
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load audit logs." },
                { status: backendResponse.status }
            );
        }

        const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        if (session.user.role === "admin") {
            const monitoring = await getAdminMonitoringScope(session);
            return NextResponse.json(applyMonitoringScope(items, monitoring));
        }
        return NextResponse.json(items);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load audit logs." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();
        const backendResponse = await fetchBackend("/api/audit", {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to create audit log." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? { success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to create audit log." }, { status: 500 });
    }
}
