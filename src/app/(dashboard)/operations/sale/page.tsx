"use client";

import { useEffect, useState } from "react";
import ProductCart from "@/components/cashier/product-cart";

type ActiveSession = { id: string; registerId: string | null; currency: string };

// Vente au comptant (walk-in) : le caissier compose un panier depuis le catalogue produit
// (modèle KSM A), le total est encaissé en espèces comme mouvement de caisse SALE — SANS
// compte client. Le kernel crédite la caisse du registre et passe l'écriture d'encaissement.
export default function SalePage() {
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [amount, setAmount] = useState(0);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        fetch("/api/cashier/sessions")
            .then((r) => r.json())
            .then((d) => {
                if (!alive) return;
                const arr: any[] = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
                const open = arr.find((s) => String(s?.status ?? "").toUpperCase() === "OPEN") ?? null;
                if (open) {
                    setSession({
                        id: String(open.id),
                        registerId: open.register_id ?? open.registerId ?? null,
                        currency: open.currency ?? "XAF"
                    });
                }
            })
            .catch(() => {})
            .finally(() => {
                if (alive) setSessionLoading(false);
            });
        return () => {
            alive = false;
        };
    }, []);

    async function handleSale() {
        if (amount <= 0) {
            setError("Ajoutez des articles au panier avant d'encaisser.");
            return;
        }
        if (!session) {
            setError("Aucune session de caisse ouverte. Ouvrez une session pour encaisser une vente.");
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const reference = reason || `Vente ${new Date().toLocaleString()}`;
            const response = await fetch("/api/movements/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "SALE",
                    amount,
                    currency: session.currency,
                    reference,
                    sessionId: session.id,
                    registerId: session.registerId ?? undefined
                })
            });
            const body = await response.json();
            if (!response.ok) {
                throw new Error(body?.error || "Échec de l'encaissement de la vente.");
            }
            setSuccess(`Vente encaissée : ${amount.toLocaleString()} ${session.currency}`);
            setAmount(0);
            setReason("");
        } catch (e: any) {
            setError(e?.message ?? "Erreur lors de l'encaissement.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Vente au comptant</h1>
                <p className="text-muted-foreground">
                    Encaisser une vente d'articles en espèces, sans compte client.
                </p>
            </div>

            {!sessionLoading && !session && (
                <div className="rounded-md bg-amber-500/15 p-3 text-sm text-amber-700">
                    Aucune session de caisse ouverte. Ouvrez une session pour pouvoir encaisser une vente.
                </div>
            )}
            {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
            {success && <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">{success}</div>}

            <div className="rounded-xl border bg-card p-6 space-y-4">
                <ProductCart
                    defaultOpen
                    applyLabel="Valider le panier"
                    onApply={(total, summary) => {
                        setAmount(total);
                        setReason(summary);
                        setSuccess(null);
                        setError(null);
                    }}
                />

                <div className="flex items-center justify-between border-t border-input pt-4">
                    <div>
                        <div className="text-sm text-muted-foreground">Montant à encaisser</div>
                        <div className="text-2xl font-bold">
                            {amount.toLocaleString()} {session?.currency ?? "XAF"}
                        </div>
                        {reason && <div className="mt-1 text-xs text-muted-foreground">{reason}</div>}
                    </div>
                    <button
                        type="button"
                        onClick={handleSale}
                        disabled={loading || amount <= 0 || !session}
                        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? "Encaissement..." : "Encaisser (espèces)"}
                    </button>
                </div>
            </div>
        </div>
    );
}
