import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const mockOrganizations: Record<string, { name: string; country: string; description: string; telegram_bot_token?: string }> = {
    ORG001: {
        name: "Atlas Finance Group",
        country: "Cameroon",
        description: "Regional finance organization",
        telegram_bot_token: "8407934501:AAExAHYZm73S-Qf9JNDqXeIKQs1MOuYGmio"
    },
    ORG002: {
        name: "Savana Payments",
        country: "Senegal",
        description: "Mobile money network",
        telegram_bot_token: "mock-token-org002"
    }
};

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin" || session.user.roleType !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const codeRaw = searchParams.get("code") || "";
        const code = codeRaw.trim().toUpperCase();
        if (!code) {
            return NextResponse.json({ error: "code is required" }, { status: 400 });
        }

        const direct = mockOrganizations[code];
        if (direct) {
            return NextResponse.json({
                code,
                name: direct.name,
                country: direct.country,
                description: direct.description,
                telegram_bot_token: direct.telegram_bot_token || null,
                source: "mock"
            });
        }

        const partial = Object.entries(mockOrganizations).find(([key]) => key.startsWith(code));
        if (partial) {
            const [matchedCode, data] = partial;
            return NextResponse.json({
                code: matchedCode,
                name: data.name,
                country: data.country,
                description: data.description,
                telegram_bot_token: data.telegram_bot_token || null,
                source: "mock"
            });
        }

        return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
