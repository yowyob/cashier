import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const mockCashiers: Record<string, {
    user_name: string;
    user_first_name: string;
    account_number: string;
    country: string;
    mail?: string;
    phone?: string;
    password?: string;
}> = {
    CASH001: {
        user_name: "cashier1",
        user_first_name: "Alex Nanga",
        account_number: "CASH-001",
        country: "Cameroon",
        mail: "alex.nanga@example.com",
        phone: "+237 690 295 111",
        password: "password123"
    },
    CASH002: {
        user_name: "cashier2",
        user_first_name: "Marie Ndiaye",
        account_number: "CASH-002",
        country: "Senegal",
        mail: "marie.ndiaye@example.com",
        phone: "+221 77 123 4567",
        password: "password123"
    }
};

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
        const idRaw = searchParams.get("id") || "";
        const id = idRaw.trim().toUpperCase();
        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const direct = mockCashiers[id];
        if (direct) {
            return NextResponse.json({
                id,
                ...direct,
                source: "mock"
            });
        }

        const partial = Object.entries(mockCashiers).find(([key]) => key.startsWith(id));
        if (partial) {
            const [matchedId, data] = partial;
            return NextResponse.json({
                id: matchedId,
                ...data,
                source: "mock"
            });
        }

        return NextResponse.json({ error: "Cashier not found." }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
