import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function normalizePhone(value: string) {
    return value.replace(/\D+/g, "");
}

function asArray(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

function matchByPhone(candidates: any[], cleaned: string) {
    const exact = candidates.find((person) => normalizePhone(person?.phone || "") === cleaned);
    if (exact) return exact;
    return candidates.find((person) => {
        const digits = normalizePhone(person?.phone || "");
        return digits.includes(cleaned) || cleaned.includes(digits);
    });
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

        let backendResponse = await fetchBackend("/api/lookup/admin", { cache: "no-store" });
        let body = await readBackendJson(backendResponse);
        if (backendResponse.ok) {
            return NextResponse.json(body ?? {});
        }

        if (backendResponse.status === 404 || backendResponse.status === 405) {
            backendResponse = await fetchBackend("/api/users/admins", { cache: "no-store" });
            body = await readBackendJson(backendResponse);
            if (backendResponse.ok) {
                const candidates = asArray(body);
                const matched = matchByPhone(candidates, cleaned);
                if (matched) {
                    return NextResponse.json(matched);
                }
                return NextResponse.json({ error: "No matching admin found." }, { status: 404 });
            }
        }

        return NextResponse.json(
            { error: body?.error || "No matching admin found." },
            { status: backendResponse.status || 500 }
        );
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
