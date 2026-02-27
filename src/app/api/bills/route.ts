import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function asArray(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const all = searchParams.get("all") === "1";
        const page = all ? 1 : Math.max(1, Number(searchParams.get("page") || 1));
        const limit = all ? 0 : Math.max(1, Number(searchParams.get("limit") || 50));
        const search = (searchParams.get("search") || "").toLowerCase();

        const backendResponse = await fetchBackend("/api/transactions", { cache: "no-store" }, "cashier");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load bills." },
                { status: backendResponse.status }
            );
        }

        const transactions = asArray(body);
        let bills = transactions.filter((item) => {
            const reason = String(item?.reason || "");
            return reason.startsWith("Paiement Facture:");
        });

        if (search) {
            bills = bills.filter((item) => {
                const reason = String(item?.reason || "").toLowerCase();
                const reference = String(item?.external_reference || "").toLowerCase();
                return reason.includes(search) || reference.includes(search);
            });
        }

        const total = bills.length;
        if (limit > 0) {
            const start = (page - 1) * limit;
            bills = bills.slice(start, start + limit);
        }

        return NextResponse.json({
            bills,
            total,
            page: limit > 0 ? page : 1,
            totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load bills." }, { status: 500 });
    }
}
