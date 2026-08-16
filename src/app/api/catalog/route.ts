import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

// Catalogue produit de la caisse : lecture DIRECTE du modèle KSM riche A (product_core)
// du kernel via /api/product-core/catalog. Server-only (utilise la clé client kernel).
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
            `/api/product-core/catalog?organizationId=${encodeURIComponent(String(orgId))}`,
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

        // A renvoie ApiResponse.success -> { data: [...] } ; readBackendJson snake_case-ise les clés
        // (unitPrice -> unit_price). On ne garde que les vendables (statut ACTIF).
        const raw: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        const products = raw
            .map((p: any) => ({
                id: String(p?.id ?? ""),
                name: String(p?.name ?? p?.sku ?? "Produit"),
                sku: p?.sku ?? null,
                unitPrice: Number(p?.unit_price ?? p?.unitPrice ?? 0),
                currency: p?.currency ?? "XAF",
                photo: p?.photo ?? null,
                status: String(p?.status ?? "ACTIVE")
            }))
            .filter((p) => p.id && p.status.toUpperCase() === "ACTIVE");

        return NextResponse.json({ products });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message ?? "Erreur catalogue", products: [] }, { status: 500 });
    }
}
