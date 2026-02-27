import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

interface Params {
    params: { id: string };
}

export async function GET(_request: Request, { params }: Params) {
    const session = await getSession().catch(() => null);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendResponse = await fetchBackend(`/api/cashier/bills/${encodeURIComponent(params.id)}`, {
        cache: "no-store"
    });
    const body = await readBackendJson(backendResponse);

    if (backendResponse.ok) {
        return NextResponse.json(body ?? {});
    }

    // Fallback: some backends expect invoice_code in list or don't expose /{id}
    try {
        const listResponse = await fetchBackend("/api/cashier/bills", { cache: "no-store" });
        const listBody = await readBackendJson(listResponse);
        if (listResponse.ok && Array.isArray(listBody)) {
            const found = listBody.find(
                (item: any) =>
                    item?.id === params.id ||
                    item?.invoice_code === params.id ||
                    item?.invoiceCode === params.id
            );
            if (found) {
                return NextResponse.json(found);
            }
        }
    } catch {
        // ignore fallback errors
    }

    return NextResponse.json(
        { error: body?.error || "Failed to load bill." },
        { status: backendResponse.status }
    );
}
