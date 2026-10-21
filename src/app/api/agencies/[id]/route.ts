import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { cheminAgences, listerAgences, versAgenceNoyau } from "@/lib/kernel-agencies";

/** Le noyau n'a pas de lecture d'une agence seule : on la cherche dans celles de l'organisation. */
async function trouverAgence(organizationId: string, id: string) {
    const resultat = await listerAgences(organizationId);
    if (!resultat.ok) return { ok: false as const, status: resultat.status, error: resultat.error };
    const agence = resultat.agences.find((item: any) => String(item?.id ?? "") === id);
    return agence ? { ok: true as const, agence } : { ok: false as const, status: 404, error: "Agency not found." };
}
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
        const organizationId = new URL(request.url).searchParams.get("organization_id")
            || session.user?.organizationId;
        if (!organizationId) {
            return NextResponse.json({ error: "Agency not found." }, { status: 404 });
        }
        const trouve = await trouverAgence(String(organizationId), id);
        if (!trouve.ok) {
            return NextResponse.json({ error: trouve.error }, { status: trouve.status });
        }
        const normalized = normalizeAgencyEntry(trouve.agence);
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
        const saisie = await request.json().catch(() => ({}));
        const organizationId = saisie?.organization_id || session.user?.organizationId;
        if (!organizationId) {
            return NextResponse.json({ error: "Agency not found." }, { status: 404 });
        }
        // Le noyau exige le code et le nom à chaque modification : on part de l'agence existante.
        const trouve = await trouverAgence(String(organizationId), id);
        if (!trouve.ok) {
            return NextResponse.json({ error: trouve.error }, { status: trouve.status });
        }
        const backendResponse = await fetchBackend(`${cheminAgences(String(organizationId))}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(versAgenceNoyau(saisie, trouve.agence))
        }, "tiers");
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
        const organizationId = session.user?.organizationId;
        if (!organizationId) {
            return NextResponse.json({ error: "Agency not found." }, { status: 404 });
        }
        // Le noyau ne supprime pas une agence : il la ferme (elle reste tracée).
        const backendResponse = await fetchBackend(`${cheminAgences(String(organizationId))}/${id}/close`, {
            method: "POST"
        }, "tiers");
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
