import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function parseIdList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof value === "string" && value.trim().length > 0) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
            }
        } catch {
            return [];
        }
    }
    return [];
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const backendResponse = await fetchBackend("/api/users/profile", { cache: "no-store" }, "cashier");
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load profile." },
                { status: backendResponse.status }
            );
        }

        const payload = body || {};
        return NextResponse.json({
            ...payload,
            monitor_agency_ids: parseIdList(payload.monitor_agency_ids ?? payload.monitorAgencyIds),
            monitor_register_ids: parseIdList(payload.monitor_register_ids ?? payload.monitorRegisterIds)
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load profile." }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();
        const parsedBody = bodyText ? JSON.parse(bodyText) : {};

        const backendPayload = JSON.stringify({
            telegramChatId: parsedBody.telegramChatId ?? parsedBody.telegram_chat_id ?? null,
            telegramBotToken: parsedBody.telegramBotToken ?? parsedBody.telegram_bot_token ?? null
        });

        const backendResponse = await fetchBackend("/api/users/profile", {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: backendPayload
        }, "cashier");
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to update profile." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body || {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to update profile." }, { status: 500 });
    }
}
