import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { getAdminMonitoringScope } from "@/lib/monitoring";
import { applyMonitoringScope } from "@/lib/monitoring-scope-filter";

function normalizeTicketingDetail(detail: any) {
    if (!detail) return detail;
    const denomination = detail.denomination
        ? {
            ...detail.denomination,
            value: detail.denomination.value != null
                ? Number(detail.denomination.value)
                : detail.denomination.value
        }
        : detail.denomination;
    return {
        ...detail,
        value: detail.value != null ? Number(detail.value) : detail.value,
        total: detail.total != null ? Number(detail.total) : detail.total,
        denomination
    };
}

function normalizeMovement(movement: any) {
    if (!movement) return movement;
    const ticketingDetailsSource = movement.ticketingDetails ?? movement.ticketing_details ?? [];
    const normalizedDetails = Array.isArray(ticketingDetailsSource)
        ? ticketingDetailsSource.map(normalizeTicketingDetail)
        : [];
    return {
        ...(movement.ticketing_details ? movement : { ...movement }),
        amount: movement.amount != null ? Number(movement.amount) : movement.amount,
        ticketingDetails: normalizedDetails
    };
}

function normalizeReconciliation(reconciliation: any) {
    if (!reconciliation) return null;
    return {
        ...reconciliation,
        theorical_total: reconciliation.theorical_total != null
            ? Number(reconciliation.theorical_total)
            : reconciliation.theorical_total,
        physical_total: reconciliation.physical_total != null
            ? Number(reconciliation.physical_total)
            : reconciliation.physical_total,
        difference: reconciliation.difference != null
            ? Number(reconciliation.difference)
            : reconciliation.difference
    };
}

function normalizeSession(session: any) {
    if (!session) return session;
    const {
        cash_register,
        cashRegister,
        movements,
        ticketing_details,
        ticketingDetails,
        theorical_initial_funds,
        theorical_close_funds,
        reconciliation,
        ...rest
    } = session;
    return {
        ...rest,
        cashRegister: cash_register ?? cashRegister ?? null,
        theorical_initial_funds: theorical_initial_funds != null
            ? Number(theorical_initial_funds)
            : theorical_initial_funds,
        theorical_close_funds: theorical_close_funds != null
            ? Number(theorical_close_funds)
            : null,
        movements: Array.isArray(movements) ? movements.map(normalizeMovement) : [],
        ticketingDetails: Array.isArray(ticketing_details)
            ? ticketing_details.map(normalizeTicketingDetail)
            : Array.isArray(ticketingDetails)
                ? ticketingDetails.map(normalizeTicketingDetail)
                : [],
        reconciliation: normalizeReconciliation(reconciliation)
    };
}

function normalizePayload(payload: any) {
    if (!payload) return payload;
    if (Array.isArray(payload)) {
        return payload.map(normalizeSession);
    }
    return normalizeSession(payload);
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/sessions${search}`, {
            cache: "no-store"
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load sessions." },
                { status: backendResponse.status }
            );
        }

        const payload = normalizePayload(body) || [];
        if (session.user.role === "admin") {
            const monitoring = await getAdminMonitoringScope(session);
            if (Array.isArray(payload)) {
                return NextResponse.json(applyMonitoringScope(payload, monitoring));
            }
            const filtered = applyMonitoringScope([payload], monitoring);
            return NextResponse.json(filtered[0] ?? null);
        }
        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load sessions." }, { status: 500 });
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
        const backendResponse = await fetchBackend("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to open session." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(normalizePayload(body) || {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to open session." }, { status: 500 });
    }
}
