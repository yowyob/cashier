import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildMockCustomerFromPhone } from "@/lib/customer-mock";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const phone = searchParams.get("phone");
        if (!phone) {
            return NextResponse.json({ error: "phone is required" }, { status: 400 });
        }

        const data = buildMockCustomerFromPhone(phone);
        if (!data) {
            return NextResponse.json({ error: "No matching customer found." }, { status: 404 });
        }

        return NextResponse.json({
            phone,
            ...data,
            source: "mock"
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
