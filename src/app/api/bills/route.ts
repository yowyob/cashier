import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/services/audit.service";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const all = searchParams.get("all") === "1";
        const pageParam = searchParams.get("page");
        const limitParam = searchParams.get("limit");
        const page = all ? 1 : parseInt(pageParam || "1");
        const limit = all ? 0 : parseInt(limitParam || "50");
        const search = searchParams.get("search") || "";

        const where: any = {
            reason: {
                startsWith: "Paiement Facture:"
            }
        };

        if (search) {
            where.OR = [
                { reason: { contains: search } },
                { external_reference: { contains: search } }
            ];
        }

        const pagination = limit > 0 ? { skip: (page - 1) * limit, take: limit } : {};
        const [bills, total] = await Promise.all([
            prisma.cashRegisterMovement.findMany({
                where,
                ...pagination,
                orderBy: { create_on: 'desc' },
                include: {
                    session: {
                        include: {
                            cashRegister: true
                        }
                    },
                    creator: {
                        include: {
                            cashierProfile: true
                        }
                    }
                }
            }),
            prisma.cashRegisterMovement.count({ where })
        ]);

        await AuditService.log({
            type: "bills_list",
            payload: { message: "Bills list fetched", data: { page, limit, search } }
        });
        return NextResponse.json({
            bills,
            total,
            page: limit > 0 ? page : 1,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 1
        });

    } catch (error: any) {
        await AuditService.log({
            type: "bills_list_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
