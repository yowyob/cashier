"use client";

import { useEffect, useMemo, useState } from "react";

type CatalogProduct = {
    id: string;
    name: string;
    sku: string | null;
    unitPrice: number;
    currency: string;
    photo: string | null;
};

type CartLine = { product: CatalogProduct; qty: number };

/**
 * Panier produits de la caisse : charge le catalogue depuis le modèle KSM A (via /api/catalog),
 * laisse le caissier choisir des articles (noms + prix issus du catalogue), calcule le total,
 * puis le pousse dans le montant + le motif itemisé de l'opération d'encaissement.
 */
export default function ProductCart({
    onApply
}: {
    onApply: (total: number, summary: string) => void;
}) {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        fetch("/api/catalog")
            .then((r) => r.json())
            .then((d) => {
                if (!alive) return;
                setProducts(Array.isArray(d?.products) ? d.products : []);
                setError(d?.error ?? null);
            })
            .catch((e) => {
                if (alive) setError(String(e?.message ?? e));
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return products;
        return products.filter(
            (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
        );
    }, [products, query]);

    const lines = Object.values(cart);
    const total = lines.reduce((s, l) => s + l.product.unitPrice * l.qty, 0);

    function add(p: CatalogProduct) {
        setCart((c) => ({ ...c, [p.id]: { product: p, qty: (c[p.id]?.qty ?? 0) + 1 } }));
    }
    function setQty(id: string, qty: number) {
        setCart((c) => {
            const n = { ...c };
            if (qty <= 0) delete n[id];
            else if (n[id]) n[id] = { ...n[id], qty };
            return n;
        });
    }
    function clear() {
        setCart({});
    }
    function apply() {
        const summary = lines.map((l) => `${l.qty}x ${l.product.name}`).join(", ");
        onApply(total, summary ? `Vente: ${summary}` : "");
    }

    const fmt = (n: number) => n.toLocaleString();

    return (
        <div className="rounded-md border border-input bg-muted/30 p-3">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium"
            >
                <span>Catalogue produits{lines.length > 0 ? ` — ${lines.length} article(s), ${fmt(total)} XAF` : ""}</span>
                <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Rechercher un produit (nom ou référence)..."
                    />

                    {loading && <div className="text-sm text-muted-foreground">Chargement du catalogue...</div>}
                    {error && !loading && (
                        <div className="rounded-md bg-destructive/15 p-2 text-sm text-destructive">{error}</div>
                    )}
                    {!loading && !error && products.length === 0 && (
                        <div className="text-sm text-muted-foreground">Aucun produit au catalogue.</div>
                    )}

                    {!loading && filtered.length > 0 && (
                        <div className="max-h-56 overflow-y-auto rounded-md border border-input">
                            {filtered.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => add(p)}
                                    className="flex w-full items-center justify-between border-b border-input px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                                >
                                    <span className="truncate">
                                        {p.name}
                                        {p.sku ? <span className="text-muted-foreground"> · {p.sku}</span> : null}
                                    </span>
                                    <span className="ml-2 shrink-0 font-medium">{fmt(p.unitPrice)} {p.currency}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {lines.length > 0 && (
                        <div className="space-y-2">
                            {lines.map((l) => (
                                <div key={l.product.id} className="flex items-center gap-2 text-sm">
                                    <span className="flex-1 truncate">{l.product.name}</span>
                                    <span className="text-muted-foreground">{fmt(l.product.unitPrice)}</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setQty(l.product.id, l.qty - 1)}
                                            className="h-7 w-7 rounded-md border border-input hover:bg-muted"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            value={l.qty}
                                            onChange={(e) => setQty(l.product.id, Math.max(0, Number(e.target.value)))}
                                            className="h-7 w-12 rounded-md border border-input bg-background px-1 text-center text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setQty(l.product.id, l.qty + 1)}
                                            className="h-7 w-7 rounded-md border border-input hover:bg-muted"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="w-24 shrink-0 text-right font-medium">
                                        {fmt(l.product.unitPrice * l.qty)}
                                    </span>
                                </div>
                            ))}

                            <div className="flex items-center justify-between border-t border-input pt-2 text-sm font-semibold">
                                <span>Total</span>
                                <span>{fmt(total)} XAF</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={apply}
                                    className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Appliquer au montant
                                </button>
                                <button
                                    type="button"
                                    onClick={clear}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm hover:bg-muted"
                                >
                                    Vider
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
