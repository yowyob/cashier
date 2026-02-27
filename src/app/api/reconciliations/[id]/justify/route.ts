import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { AuditService } from "@/services/audit.service";
import { getAdminMonitoringScope } from "@/lib/monitoring";

// Cashier adds justification
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: reconciliationId } = await params;
        const body = await request.json();
        const { justification } = body;

        if (!justification || justification.trim() === "") {
            return NextResponse.json({ error: "Justification is required" }, { status: 400 });
        }

        // Get the reconciliation to check ownership
        const reconciliation = await prisma.cashReconciliation.findUnique({
            where: { id: reconciliationId },
            include: {
                session: {
                    select: {
                        open_by: true,
                        cashRegister: {
                            select: {
                                agency_id: true
                            }
                        }
                    }
                }
            }
        });

        if (!reconciliation) {
            return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
        }

        // Check if user is cashier and owns the session, or is admin
        if (session.user.role === "cashier" && reconciliation.session.open_by !== session.user.id) {
            return NextResponse.json({ error: "You can only justify your own sessions" }, { status: 403 });
        }
        if (session.user.role === "admin") {
            const monitoring = await getAdminMonitoringScope(session);
            const agencyId = reconciliation.session.cashRegister?.agency_id || "";
            if (monitoring.agencyIds && !monitoring.agencyIds.includes(agencyId)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Update reconciliation with justification
        const updated = await prisma.cashReconciliation.update({
            where: { id: reconciliationId },
            data: {
                justification: justification.trim()
            }
        });

        await AuditService.log({
            type: "reconciliation_justify",
            authorId: session.user.id,
            payload: {
                message: "Reconciliation justification added",
                subjectType: "reconciliation",
                subjectId: reconciliationId,
                agencyId: reconciliation.session.cashRegister?.agency_id || null,
                data: { justification }
            }
        });

        return NextResponse.json({
            success: true,
            message: "Justification added successfully",
            reconciliation: updated
        });

    } catch (error: any) {
        await AuditService.log({
            type: "reconciliation_justify_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
