import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { prisma } from "@/lib/prisma";

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

        const backendResponse = await fetchBackend("/api/users/profile", { cache: "no-store" });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load profile." },
                { status: backendResponse.status }
            );
        }
        let adminProfile: {
            monitor_all_agencies: boolean | null;
            monitor_agency_ids: string | null;
            monitor_all_registers: boolean | null;
            monitor_register_ids: string | null;
        } | null = null;
        if (session.user.role === "admin") {
            adminProfile = await prisma.adminProfile.findUnique({
                where: { personId: session.user.id },
                select: {
                    monitor_all_agencies: true,
                    monitor_agency_ids: true,
                    monitor_all_registers: true,
                    monitor_register_ids: true
                }
            });
        }

        const responsePayload = {
            ...(body || {}),
            ...(adminProfile
                ? {
                    monitor_all_agencies: adminProfile.monitor_all_agencies,
                    monitor_agency_ids: parseIdList(adminProfile.monitor_agency_ids),
                    monitor_all_registers: adminProfile.monitor_all_registers,
                    monitor_register_ids: parseIdList(adminProfile.monitor_register_ids)
                }
                : {})
        };

        return NextResponse.json(responsePayload);
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
        let parsedBody: any = {};
        if (bodyText) {
            try {
                parsedBody = JSON.parse(bodyText);
            } catch {
                parsedBody = {};
            }
        }

        const hasAgencyFields =
            "monitorAgencyIds" in parsedBody ||
            "monitor_agency_ids" in parsedBody ||
            "monitorAllAgencies" in parsedBody ||
            "monitor_all_agencies" in parsedBody;
        const hasRegisterFields =
            "monitorRegisterIds" in parsedBody ||
            "monitor_register_ids" in parsedBody ||
            "monitorAllRegisters" in parsedBody ||
            "monitor_all_registers" in parsedBody;

        if (session.user.role === "admin" && (hasAgencyFields || hasRegisterFields)) {
            const monitorAgencyIds = parseIdList(parsedBody.monitorAgencyIds ?? parsedBody.monitor_agency_ids);
            const monitorRegisterIds = parseIdList(parsedBody.monitorRegisterIds ?? parsedBody.monitor_register_ids);
            const updates: Record<string, any> = {};
            if (hasAgencyFields) {
                updates.monitor_all_agencies = monitorAgencyIds.length === 0;
                updates.monitor_agency_ids = monitorAgencyIds.length ? JSON.stringify(monitorAgencyIds) : null;
            }
            if (hasRegisterFields) {
                updates.monitor_all_registers = monitorRegisterIds.length === 0;
                updates.monitor_register_ids = monitorRegisterIds.length ? JSON.stringify(monitorRegisterIds) : null;
            }
            if (Object.keys(updates).length > 0) {
                const existing = await prisma.adminProfile.findUnique({
                    where: { personId: session.user.id },
                    select: { id: true }
                });
                if (existing) {
                    await prisma.adminProfile.update({
                        where: { personId: session.user.id },
                        data: updates
                    });
                }
            }
        }

        const backendPayload = JSON.stringify({
            telegramChatId: parsedBody.telegramChatId ?? parsedBody.telegram_chat_id ?? null,
            telegramBotToken: parsedBody.telegramBotToken ?? parsedBody.telegram_bot_token ?? null
        });

        const backendResponse = await fetchBackend("/api/users/profile", {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: backendPayload
        });
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
