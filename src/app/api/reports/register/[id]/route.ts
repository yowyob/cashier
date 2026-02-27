import { NextResponse } from "next/server";
import { ReportService } from "@/services/report.service";
import { generateRegisterReport } from "@/lib/pdf-generator";
import { AuditService } from "@/services/audit.service";
import { getSession } from "@/lib/auth";
import { getAdminMonitoringScope } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { startDate, endDate } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 });
        }

        const register = await prisma.cashRegister.findUnique({
            where: { id },
            select: {
                agency_id: true,
                agency: { select: { organization_id: true } }
            }
        });
        if (!register) {
            return NextResponse.json({ error: "Register not found" }, { status: 404 });
        }
        if (session.user.roleType === "agency_admin" && session.user.agencyId) {
            if (register.agency_id !== session.user.agencyId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }
        if (session.user.roleType === "organization_admin" && session.user.organizationId) {
            if (register.agency?.organization_id !== session.user.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }
        const monitoring = await getAdminMonitoringScope(session);
        if (monitoring.agencyIds && !monitoring.agencyIds.includes(register.agency_id || "")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (monitoring.registerIds && !monitoring.registerIds.includes(id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const reportData = await ReportService.getRegisterReportData(
            id,
            new Date(startDate),
            new Date(endDate)
        );

        const pdfBuffer = generateRegisterReport(reportData);

        await AuditService.log({
            type: "report_register",
            payload: {
                message: "Register report generated",
                subjectType: "cash_register",
                subjectId: id,
                data: { startDate, endDate }
            }
        });

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="register-${id}-${new Date().toISOString().split('T')[0]}.pdf"`
            }
        });
    } catch (error: any) {
        await AuditService.log({
            type: "report_register_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
