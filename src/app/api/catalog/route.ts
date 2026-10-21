import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

// Catalogue produit de la caisse : articles en vente de l'organisation, lus sur l'API produit du
// noyau (/api/product-core/sellable-products). L'ancienne route /api/product-core/catalog a été
// retirée du noyau le 23/08/2026 : le catalogue de la caisse était vide depuis.
// Server-only (utilise la clé client kernel).
// Scopé à l'organisation de la session — le kernel applique en plus son isolation RLS.
export async function GET() {
    try {
        const session = await getSession().catch(() => null);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const orgId = session?.user?.organizationId;
        if (!orgId) {
            return NextResponse.json({ products: [] });
        }

        const response = await fetchBackend(
            `/api/product-core/sellable-products?organizationId=${encodeURIComponent(String(orgId))}&status=ACTIVE`,
            { cache: "no-store" },
            "cashier"
        );
        const body = await readBackendJson(response);
        if (!response.ok) {
            return NextResponse.json(
                { error: body?.error || "Impossible de charger le catalogue.", products: [] },
                { status: response.status }
            );
        }

        // ApiResponse.success -> { data: [...] } ; readBackendJson snake_case-ise les clés
        // (productId -> product_id, unitPrice -> unit_price). On ne garde que ce qui est en vente.
        const raw: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        const products = raw
            .map((p: any) => ({
                id: String(p?.product_id ?? p?.id ?? ""),
                name: String(p?.name ?? p?.global_code ?? "Produit"),
                sku: p?.global_code ?? p?.sku ?? null,
                unitPrice: Number(p?.unit_price ?? 0),
                currency: p?.currency ?? "XAF",
                photo: p?.image_uri ?? p?.photo ?? null,
                status: String(p?.lifecycle_status ?? p?.status ?? "ACTIVE")
            }))
            .filter((p) => p.id && p.status.toUpperCase() === "ACTIVE");

        return NextResponse.json({ products });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message ?? "Erreur catalogue", products: [] }, { status: 500 });
    }
}
