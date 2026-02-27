import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let organization: { id: string; name: string } | null = null;
        let agency: { id: string; name: string } | null = null;

        if (session.user?.organizationId) {
            organization = await prisma.organization.findUnique({
                where: { id: session.user.organizationId },
                select: { id: true, name: true }
            });
        }

        if (session.user?.agencyId) {
            agency = await prisma.agency.findUnique({
                where: { id: session.user.agencyId },
                select: { id: true, name: true }
            });
        }

        return NextResponse.json({
            user: session.user,
            organization,
            agency
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
