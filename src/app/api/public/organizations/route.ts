import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const organizations = await prisma.organization.findMany({
            where: { is_active: true },
            orderBy: { name: "asc" }
        });
        return NextResponse.json(organizations);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
