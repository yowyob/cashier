import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
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

        const body = await request.json();
        const missingFields = [
            ["user_name", body.user_name],
            ["user_first_name", body.user_first_name],
            ["password", body.password],
            ["account_number", body.account_number],
            ["work_town", body.work_town]
        ]
            .filter(([, value]) => !value)
            .map(([field]) => field);
        if (missingFields.length > 0) {
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(", ")}` },
                { status: 400 }
            );
        }
        const organizationId =
            session.user.roleType === "organization_admin"
                ? session.user.organizationId || null
                : body.organization_id ?? null;
        if (!organizationId) {
            return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
        }
        if (!body.base_agency_id) {
            return NextResponse.json({ error: "base_agency_id is required" }, { status: 400 });
        }
        const baseAgency = await prisma.agency.findUnique({
            where: { id: body.base_agency_id }
        });
        if (!baseAgency) {
            return NextResponse.json({ error: "Base agency not found" }, { status: 404 });
        }
        if (baseAgency.organization_id !== organizationId) {
            return NextResponse.json(
                { error: "Base agency does not belong to the organization." },
                { status: 400 }
            );
        }
        if (body.work_town && baseAgency.town !== body.work_town) {
            return NextResponse.json(
                { error: "Base agency must be in the work town." },
                { status: 400 }
            );
        }
        const hashed = await hashPassword(body.password);
        const created = await prisma.person.create({
            data: {
                user_name: body.user_name,
                user_first_name: body.user_first_name,
                password: hashed,
                mail: body.mail ?? null,
                account_number: body.account_number ?? null,
                country: body.country ?? null,
                phone: body.phone ?? null,
                cashierProfile: {
                    create: {
                        town_list_chosen: body.town_list_chosen ?? null,
                        work_town: body.work_town ?? null,
                        hire_date: body.hire_date ? new Date(body.hire_date) : null,
                        organization_id: organizationId,
                        base_agency_id: body.base_agency_id
                    }
                }
            },
            include: {
                cashierProfile: true
            }
        });
        return NextResponse.json(normalizeCashierPayload(created));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
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
