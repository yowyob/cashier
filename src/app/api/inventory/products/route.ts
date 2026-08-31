import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

const finite = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

type RawBalance = {
    product_id?: string; on_hand_quantity?: unknown; reserved_quantity?: unknown; available_quantity?: unknown;
};
type RawTier = {
    price_rule_id?: string; code?: string; name?: string; minimum_quantity?: unknown;
    maximum_quantity?: unknown; unit_price?: unknown; currency?: string;
};
type RawProduct = {
    product_id?: string; product_offering_id?: string | null; name?: string; global_code?: string;
    unit_price?: unknown; currency?: string; min_stock_level?: unknown; max_stock_level?: unknown;
    price_tiers?: RawTier[];
};

export async function GET() {
    const session = await getSession().catch(() => null);
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const organizationId = session?.user?.organizationId ?? session?.user?.organization_id
        ?? session?.organization?.id ?? null;
    const agencyId = session?.user?.agencyId ?? session?.user?.agency_id ?? session?.agency?.id ?? null;
    if (!organizationId) {
        return NextResponse.json({ error: "Contexte organisation manquant." }, { status: 400 });
    }

    const sellablesResponse = await fetchBackend(
        `/api/product-core/sellable-products?organizationId=${encodeURIComponent(organizationId)}`,
        { cache: "no-store" }, "cashier",
    );
    const sellablesBody = await readBackendJson(sellablesResponse);
    if (!sellablesResponse.ok) {
        return NextResponse.json({ error: sellablesBody?.message ?? "Catalogue indisponible." },
            { status: sellablesResponse.status });
    }

    let balances: RawBalance[] = [];
    if (agencyId) {
        const query = new URLSearchParams({ organizationId, agencyId });
        const balancesResponse = await fetchBackend(`/api/stock/balances/agency?${query}`,
            { cache: "no-store" }, "cashier");
        const balancesBody = await readBackendJson(balancesResponse);
        if (balancesResponse.ok) {
            balances = (Array.isArray(balancesBody?.data) ? balancesBody.data
                : Array.isArray(balancesBody) ? balancesBody : []) as RawBalance[];
        }
    }

    const balanceByProduct = new Map(balances.map((balance) => [balance.product_id, balance]));
    const sellables = (Array.isArray(sellablesBody?.data) ? sellablesBody.data
        : Array.isArray(sellablesBody) ? sellablesBody : []) as RawProduct[];
    const products = sellables.map((product) => {
        const balance = balanceByProduct.get(product.product_id);
        return {
            productId: product.product_id,
            productOfferingId: product.product_offering_id,
            name: product.name,
            globalCode: product.global_code,
            unitPrice: finite(product.unit_price),
            currency: product.currency ?? "XAF",
            minStockLevel: finite(product.min_stock_level),
            maxStockLevel: product.max_stock_level == null ? null : finite(product.max_stock_level),
            onHand: finite(balance?.on_hand_quantity),
            reserved: finite(balance?.reserved_quantity),
            available: finite(balance?.available_quantity),
            priceTiers: (Array.isArray(product.price_tiers) ? product.price_tiers : []).map((tier) => ({
                priceRuleId: tier.price_rule_id,
                code: tier.code,
                name: tier.name,
                minimumQuantity: finite(tier.minimum_quantity),
                maximumQuantity: tier.maximum_quantity == null ? null : finite(tier.maximum_quantity),
                unitPrice: finite(tier.unit_price),
                currency: tier.currency ?? product.currency ?? "XAF",
            })),
        };
    });
    return NextResponse.json(products);
}
