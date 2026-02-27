import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/services/audit.service";
import { getSession } from "@/lib/auth";
import { getAdminMonitoringScope } from "@/lib/monitoring";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let where: any = {};
        if (session.user.roleType === "agency_admin" && session.user.agencyId) {
            where = {
                cashRegister: {
                    agency_id: session.user.agencyId
                }
            };
        } else if (session.user.roleType === "organization_admin" && session.user.organizationId) {
            where = {
                cashRegister: {
                    agency: {
                        is: {
                            organization_id: session.user.organizationId
                        }
                    }
                }
            };
        }
        const monitoring = await getAdminMonitoringScope(session);
        if (monitoring.registerIds) {
            where = {
                ...where,
                cash_register_id: { in: monitoring.registerIds }
            };
        } else if (monitoring.agencyIds) {
            where = {
                ...where,
                cashRegister: {
                    ...(where.cashRegister || {}),
                    agency_id: { in: monitoring.agencyIds }
                }
            };
        }

        const assignments = await prisma.cashierManageCashRegister.findMany({
            where,
            include: {
                person: true,
                cashRegister: {
                    include: {
                        agency: true
                    }
                }
            },
            orderBy: {
                day: 'desc'
            }
        });

        await AuditService.log({
            type: "assignments_list",
            payload: { message: "Assignments fetched" }
        });
        return NextResponse.json(assignments);
    } catch (error: any) {
        await AuditService.log({
            type: "assignments_list_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
