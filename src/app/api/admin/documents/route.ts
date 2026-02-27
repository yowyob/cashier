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
                uploader: {
                    adminProfile: {
                        is: { agency_id: session.user.agencyId }
                    }
                }
            };
        } else if (session.user.roleType === "organization_admin" && session.user.organizationId) {
            where = {
                uploader: {
                    adminProfile: {
                        is: {
                            OR: [
                                { organization_id: session.user.organizationId },
                                { agency: { is: { organization_id: session.user.organizationId } } }
                            ]
                        }
                    }
                }
            };
        }
        const monitoring = await getAdminMonitoringScope(session);
        if (monitoring.agencyIds) {
            where = {
                uploader: {
                    adminProfile: {
                        is: {
                            agency_id: { in: monitoring.agencyIds }
                        }
                    }
                }
            };
        }

        const documents = await prisma.attachedDocument.findMany({
            where,
            include: {
                uploader: {
                    include: {
                        adminProfile: true
                    }
                }
            },
            orderBy: {
                upload_on: 'desc'
            }
        });

        await AuditService.log({
            type: "documents_list",
            payload: { message: "Documents fetched" }
        });
        return NextResponse.json(documents);
    } catch (error: any) {
        await AuditService.log({
            type: "documents_list_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
