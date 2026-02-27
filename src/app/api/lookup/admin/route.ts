import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizePhone(value: string) {
    return value.replace(/\D+/g, "");
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.roleType === "agency_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const phone = searchParams.get("phone");
        if (!phone) {
            return NextResponse.json({ error: "phone is required" }, { status: 400 });
        }

        const cleaned = normalizePhone(phone);
        if (!cleaned) {
            return NextResponse.json({ error: "phone is required" }, { status: 400 });
        }

        const candidates = await prisma.person.findMany({
            where: { phone: { not: null } },
            include: { adminProfile: true }
        });

        const exactMatch = candidates.find((person) => normalizePhone(person.phone || "") === cleaned);
        if (exactMatch) {
            return NextResponse.json(exactMatch);
        }

        const partialMatch = candidates.find((person) => {
            const digits = normalizePhone(person.phone || "");
            return digits.includes(cleaned) || cleaned.includes(digits);
        });
        if (partialMatch) {
            return NextResponse.json(partialMatch);
        }

        return NextResponse.json({ error: "No matching admin found." }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
