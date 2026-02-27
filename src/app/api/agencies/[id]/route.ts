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

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { search } = new URL(request.url);
        let backendResponse = await fetchBackend(`/api/agencies/${id}${search}`, {
            cache: "no-store"
        });
        let body = await readBackendJson(backendResponse);

        if (!backendResponse.ok && (backendResponse.status === 404 || backendResponse.status === 405)) {
            const listResponse = await fetchBackend(`/api/agencies${search}`, { cache: "no-store" });
            const listBody = await readBackendJson(listResponse);
            if (listResponse.ok) {
                const list = Array.isArray(listBody)
                    ? listBody
                    : Array.isArray(listBody?.data)
                        ? listBody.data
                        : [];
                const found = list.find((item: any) => String(item?.id ?? item?.agency_id ?? "") === id);
                if (found) {
                    backendResponse = listResponse;
                    body = found;
                }
            }
        }

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load agency." },
                { status: backendResponse.status }
            );
        }

        const payload = body?.data ?? body ?? {};
        const normalized = normalizeAgencyEntry(payload);
        if (session.user.role === "admin") {
            const monitoring = await getAdminMonitoringScope(session);
            const filtered = applyMonitoringScope([normalized], monitoring);
            if (filtered.length === 0) {
                return NextResponse.json({ error: "Agency not found." }, { status: 404 });
            }
            return NextResponse.json(filtered[0]);
        }
        return NextResponse.json(normalized);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load agency." }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();

        const backendResponse = await fetchBackend(`/api/agencies/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to update agency." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to update agency." }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    return PUT(request, context);
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const backendResponse = await fetchBackend(`/api/agencies/${id}`, {
            method: "DELETE"
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to delete agency." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? { success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to delete agency." }, { status: 500 });
    }
}
