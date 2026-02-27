import { NextResponse } from "next/server";
import { TelegramService } from "@/services/telegram.service";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const chatId = typeof body.chat_id === "string" ? body.chat_id.trim() : "";
        const botToken = typeof body.bot_token === "string" ? body.bot_token.trim() : "";

        if (!chatId || !botToken) {
            return NextResponse.json({ error: "chat_id and bot_token are required." }, { status: 400 });
        }

        await TelegramService.sendTestMessage({
            chatId,
            token: botToken,
            message: "Test message from ERP Cashier settings."
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
