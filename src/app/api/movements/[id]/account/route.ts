import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { AuditService } from "@/services/audit.service";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Fetch movement to validate ownership if cashier
        const movement = await prisma.cashRegisterMovement.findUnique({
            where: { id },
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

        if (!movement) {
            return NextResponse.json({ error: "Movement not found" }, { status: 404 });
        }

        if (session.user.role === "cashier" && movement.session?.open_by !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updated = await prisma.cashRegisterMovement.update({
            where: { id },
            data: { is_accounted: true }
        });

        await AuditService.log({
            type: "movement_accounted",
            authorId: session.user.id,
            payload: {
                message: "Movement marked as accounted",
                subjectType: "movement",
                subjectId: id,
                agencyId: movement.session.cashRegister?.agency_id || null
            }
        });

        return NextResponse.json({ success: true, movement: updated });
    } catch (error: any) {
        await AuditService.log({
            type: "movement_accounted_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
