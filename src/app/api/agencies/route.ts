import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { getAdminMonitoringScope } from "@/lib/monitoring";
import { applyMonitoringScope } from "@/lib/monitoring-scope-filter";

function normalizeRegisterSessions(register: any) {
    if (!register) return register;
    if (Array.isArray(register.sessions)) return register;
    const latest =
        register.latest_session ??
        register.latestSession ??
        register.session ??
        register.latest_sessions ??
        null;
    return {
        ...register,
        sessions: latest ? [latest] : []
    };
}

function normalizeAgencyEntry(entry: any) {
    if (!entry) return entry;
    const base = entry.agency && !entry.id ? { ...entry.agency, ...entry } : entry;
    const registersSource =
        base.cashRegisters ??
        base.cash_registers ??
        base.registers ??
        base.cash_registers_list ??
        base.register_list ??
        null;
    const cashRegisters = Array.isArray(registersSource)
        ? registersSource.map(normalizeRegisterSessions)
        : undefined;
    return {
        ...base,
        ...(cashRegisters ? { cashRegisters } : {})
    };
}

function normalizeAgenciesPayload(payload: any) {
    const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
            ? payload.data
            : [];
    return list.map(normalizeAgencyEntry);
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/agencies${search}`, {
            cache: "no-store"
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load agencies." },
                { status: backendResponse.status }
            );
        }

        const payload = normalizeAgenciesPayload(body);
        if (session.user.role === "admin") {
            const monitoring = await getAdminMonitoringScope(session);
            return NextResponse.json(applyMonitoringScope(payload, monitoring));
        }
        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load agencies." }, { status: 500 });
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
        const backendResponse = await fetchBackend("/api/agencies", {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to create agency." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to create agency." }, { status: 500 });
    }
}
