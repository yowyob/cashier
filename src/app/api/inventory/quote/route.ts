import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
    const session = await getSession().catch(() => null);
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const organizationId = session?.user?.organizationId ?? session?.user?.organization_id
        ?? session?.organization?.id ?? null;
    const body = await request.json().catch(() => ({}));
    const quantity = Number(body.quantity);
    if (!organizationId || !body.productOfferingId || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Produit, organisation et quantité valide requis." }, { status: 400 });
    }
    const response = await fetchBackend("/api/product-core/pricing/resolve", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, productOfferingId: body.productOfferingId, quantity }),
    }, "cashier");
    const payload = await readBackendJson(response);
    if (!response.ok) {
        return NextResponse.json({ error: payload?.message ?? "Prix indisponible." }, { status: response.status });
    }
    const price = payload?.data ?? payload;
    return NextResponse.json(price ? {
        tierCode: price.tier_code,
        tierName: price.tier_name,
        quantity: Number(price.quantity),
        unitPrice: Number(price.unit_price),
        totalPrice: Number(price.total_price),
        currency: price.currency,
    } : null);
}
