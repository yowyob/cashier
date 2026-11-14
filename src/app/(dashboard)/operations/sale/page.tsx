"use client";

import { useCallback, useEffect, useState } from "react";
import ProductCart, { type LigneEncaissement } from "@/components/cashier/product-cart";
import MobileMoneyQr, { type EncaissementOuvert } from "@/components/cashier/mobile-money-qr";

type ActiveSession = { id: string; registerId: string | null; currency: string };

/**
 * Le message d'une cause d'échec, quelle qu'elle soit.
 *
 * `catch (e: any)` ferait l'affaire, mais une cause n'est PAS forcément une `Error` : un rejet de
 * promesse porte n'importe quoi, et lire `.message` dessus rend `undefined` — soit un écran muet.
 */
function causeLisible(cause: unknown, repli: string): string {
    if (cause instanceof Error && cause.message.trim()) return cause.message;
    return repli;
}


// Vente au comptant (walk-in) : le caissier compose un panier depuis le catalogue produit
// (modèle KSM A), puis choisit comment le client règle.
//
//  - ESPÈCES : mouvement de caisse SALE. Le kernel crédite la caisse du registre et passe
//    l'écriture d'encaissement. Exige une session de caisse ouverte — c'est elle qui tient le
//    fonds et qu'on recomptera à la clôture.
//  - MOBILE MONEY : le client scanne un QR et paie chez le prestataire, SANS compte Yowyob.
//    L'argent va au portefeuille de l'agence. Aucun mouvement d'espèces n'est écrit, et aucune
//    session de caisse n'est requise : le tiroir ne reçoit rien.
export default function SalePage() {
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [amount, setAmount] = useState(0);
    const [reason, setReason] = useState("");
    const [lignes, setLignes] = useState<LigneEncaissement[]>([]);
    const [loading, setLoading] = useState(false);
    const [ouverture, setOuverture] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [encaissement, setEncaissement] = useState<EncaissementOuvert | null>(null);

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

    function viderLePanier() {
        setAmount(0);
        setReason("");
        setLignes([]);
    }

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
            setSuccess(`Vente encaissée en espèces : ${amount.toLocaleString()} ${session.currency}`);
            viderLePanier();
        } catch (e: unknown) {
            setError(causeLisible(e, "Erreur lors de l'encaissement."));
        } finally {
            setLoading(false);
        }
    }

    /**
     * Ouvre le paiement mobile money et affiche le QR.
     *
     * Les lignes du panier partent au noyau, qui recalcule le montant : c'est SON total que le
     * client verra. On ne lui envoie pas le nombre affiché ici — un total calculé dans un
     * navigateur ne fait pas foi.
     */
    async function handleMobileMoney() {
        if (lignes.length === 0) {
            setError("Validez le panier avant d'encaisser par mobile money.");
            return;
        }
        setOuverture(true);
        setError(null);
        setSuccess(null);
        try {
            const reference = reason || `Vente ${new Date().toLocaleString()}`;
            const response = await fetch("/api/payments/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: lignes, reference })
            });
            const body = await response.json();
            if (!response.ok || !body?.qrCode || !body?.paymentUrl) {
                throw new Error(body?.error || "Le paiement n'a pas pu être ouvert.");
            }
            setEncaissement({
                sessionId: String(body.sessionId),
                paymentUrl: String(body.paymentUrl),
                qrCode: String(body.qrCode),
                amount: Number(body.amount ?? amount),
                currency: String(body.currency ?? "XAF"),
                reference: body.reference ?? reference
            });
        } catch (e: unknown) {
            setError(causeLisible(e, "Erreur lors de l'ouverture du paiement."));
        } finally {
            setOuverture(false);
        }
    }

    /**
     * Le client a payé : l'argent est au portefeuille de l'agence.
     *
     * AUCUN mouvement d'espèces n'est écrit, et c'est délibéré. Un mouvement SALE est un
     * encaissement en espèces : le kernel crédite le fonds du registre, et le caissier devrait
     * retrouver ces billets au comptage de clôture. Il ne les a jamais eus — l'écart serait porté
     * à son débit. La vente est tracée là où elle a eu lieu : l'achat chez le prestataire et
     * l'opération au portefeuille de l'agence.
     */
    const apresPaiement = useCallback((paye: EncaissementOuvert) => {
        setSuccess(
            `Payé par mobile money : ${paye.amount.toLocaleString()} ${paye.currency} portés au `
            + `portefeuille de l'agence (réf. ${paye.reference ?? paye.sessionId}). `
            + "Rien n'a été ajouté au fonds de caisse."
        );
        viderLePanier();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Vente au comptant</h1>
                <p className="text-muted-foreground">
                    Encaisser une vente d&apos;articles, sans compte client — en espèces ou par mobile money.
                </p>
            </div>

            {!sessionLoading && !session && (
                <div className="rounded-md bg-amber-500/15 p-3 text-sm text-amber-700">
                    Aucune session de caisse ouverte : l&apos;encaissement en espèces est indisponible.
                    L&apos;encaissement par mobile money reste possible — il ne passe pas par le tiroir.
                </div>
            )}
            {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
            {success && (
                <div role="status" className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">{success}</div>
            )}

            <div className="rounded-xl border bg-card p-6 space-y-4">
                <ProductCart
                    defaultOpen
                    applyLabel="Valider le panier"
                    onApply={(total, summary, detail) => {
                        setAmount(total);
                        setReason(summary);
                        setLignes(detail);
                        setSuccess(null);
                        setError(null);
                    }}
                />

                <div className="flex flex-wrap items-end justify-between gap-4 border-t border-input pt-4">
                    <div>
                        <div className="text-sm text-muted-foreground">Montant à encaisser</div>
                        <div className="text-2xl font-bold tabular-nums">
                            {amount.toLocaleString()} {session?.currency ?? "XAF"}
                        </div>
                        {reason && <div className="mt-1 text-xs text-muted-foreground">{reason}</div>}
                    </div>
                    {/* LES DEUX MODES DE RÈGLEMENT, nommés. Le mobile money n'est pas une variante
                        de l'encaissement en espèces : l'argent n'arrive pas au même endroit, et
                        c'est ce que les libellés doivent dire. */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSale}
                            disabled={loading || ouverture || amount <= 0 || !session}
                            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading ? "Encaissement..." : "Encaisser (espèces)"}
                        </button>
                        <button
                            type="button"
                            onClick={handleMobileMoney}
                            disabled={loading || ouverture || lignes.length === 0}
                            className="inline-flex h-11 items-center justify-center rounded-md border border-primary px-6 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                        >
                            {ouverture ? "Ouverture du paiement..." : "Encaisser par mobile money (QR)"}
                        </button>
                    </div>
                </div>

                <p className="text-xs leading-5 text-muted-foreground">
                    <strong>Mobile money :</strong> le client scanne un QR, paie depuis son téléphone et
                    n&apos;a besoin d&apos;aucun compte Yowyob. L&apos;argent est porté au portefeuille de
                    l&apos;agence, pas au fonds de caisse — ne le comptez pas dans les espèces à la clôture.
                </p>
            </div>

            {encaissement && (
                <MobileMoneyQr
                    key={encaissement.sessionId}
                    encaissement={encaissement}
                    onPaye={apresPaiement}
                    onClose={() => setEncaissement(null)}
                />
            )}
        </div>
    );
}
