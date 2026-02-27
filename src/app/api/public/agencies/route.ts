import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");
        if (!organizationId) {
            return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
        }

        const agencies = await prisma.agency.findMany({
            where: {
                organization_id: organizationId,
                is_active: true
            },
            orderBy: { name: "asc" }
        });
        return NextResponse.json(agencies);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
