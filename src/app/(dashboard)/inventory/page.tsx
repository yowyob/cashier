"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch, RefreshCw, TriangleAlert } from "lucide-react";

type Tier = { priceRuleId: string; name: string; minimumQuantity: number; unitPrice: number; currency: string };
type Product = {
    productId: string; productOfferingId?: string | null; name: string; globalCode: string;
    unitPrice: number; currency: string; minStockLevel: number; maxStockLevel?: number | null;
    onHand: number; reserved: number; available: number; priceTiers: Tier[];
};
type Quote = { tierName?: string | null; quantity: number; unitPrice: number; totalPrice: number; currency: string };

const number = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? new Intl.NumberFormat("fr-FR").format(parsed) : "—";
};

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [quotes, setQuotes] = useState<Record<string, Quote>>({});

    const load = async () => {
        setLoading(true); setError(null);
        try {
            const response = await fetch("/api/inventory/products", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error ?? "Chargement impossible.");
            setProducts(Array.isArray(payload) ? payload : []);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Chargement impossible.");
        } finally { setLoading(false); }
    };
    useEffect(() => { void load(); }, []);

    const filtered = useMemo(() => products.filter((product) =>
        `${product.name} ${product.globalCode}`.toLowerCase().includes(search.toLowerCase())), [products, search]);

    const quote = async (product: Product) => {
        const quantity = Number(quantities[product.productId] ?? 1);
        if (!product.productOfferingId || !Number.isFinite(quantity) || quantity <= 0) return;
        const response = await fetch("/api/inventory/quote", { method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productOfferingId: product.productOfferingId, quantity }) });
        const payload = await response.json();
        if (!response.ok) { setError(payload?.error ?? "Prix indisponible."); return; }
        if (payload) setQuotes((current) => ({ ...current, [product.productId]: payload }));
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Catalogue connecté</p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight">Produits, stocks et tarifs</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Les quantités et prix applicables proviennent du Kernel.</p>
                </div>
                <button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm hover:bg-muted">
                    <RefreshCw className="h-4 w-4" /> Actualiser
                </button>
            </header>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit…"
                className="h-10 w-full max-w-sm rounded-lg border bg-background px-3 text-sm" />
            <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-left text-muted-foreground"><tr>
                        <th className="px-4 py-3">Produit</th><th className="px-4 py-3 text-right">Disponible</th>
                        <th className="px-4 py-3 text-right">Seuil</th><th className="px-4 py-3">Grille tarifaire</th>
                        <th className="px-4 py-3">Simulation Kernel</th>
                    </tr></thead>
                    <tbody>
                        {loading && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Chargement…</td></tr>}
                        {!loading && filtered.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">
                            <PackageSearch className="mx-auto mb-2 h-8 w-8" />Aucun produit vendable.</td></tr>}
                        {!loading && filtered.map((product) => {
                            const low = product.available <= product.minStockLevel;
                            const currentQuote = quotes[product.productId];
                            return <tr key={product.productId} className="border-b align-top last:border-0">
                                <td className="px-4 py-4"><p className="font-medium">{product.name}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{product.globalCode}</p></td>
                                <td className={`px-4 py-4 text-right font-semibold ${low ? "text-amber-600" : ""}`}>
                                    {number(product.available)}{low && <TriangleAlert className="ml-2 inline h-4 w-4" />}</td>
                                <td className="px-4 py-4 text-right">{number(product.minStockLevel)}</td>
                                <td className="px-4 py-4"><div className="flex max-w-md flex-wrap gap-1">
                                    {product.priceTiers.map((tier) => <span key={tier.priceRuleId}
                                        className="rounded-full border px-2 py-1 text-xs">{tier.name} ≥ {number(tier.minimumQuantity)} : {number(tier.unitPrice)} {tier.currency}</span>)}
                                    {!product.priceTiers.length && <span>{number(product.unitPrice)} {product.currency}</span>}
                                </div></td>
                                <td className="px-4 py-4"><div className="flex min-w-72 items-center gap-2">
                                    <input type="number" min="1" step="any" value={quantities[product.productId] ?? "1"}
                                        onChange={(event) => setQuantities((current) => ({ ...current, [product.productId]: event.target.value }))}
                                        className="h-9 w-20 rounded-md border bg-background px-2" />
                                    <button onClick={() => void quote(product)} className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">Calculer</button>
                                </div>{currentQuote && <p className="mt-2 text-xs"><strong>{currentQuote.tierName ?? "Prix"}</strong> : {number(currentQuote.unitPrice)} × {number(currentQuote.quantity)} = <strong>{number(currentQuote.totalPrice)} {currentQuote.currency}</strong></p>}</td>
                            </tr>;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
