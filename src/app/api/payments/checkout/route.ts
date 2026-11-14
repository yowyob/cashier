import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

/**
 * Ouvre un encaissement par mobile money pour un client SANS compte Yowyob.
 *
 * Deux appels au noyau en un seul aller-retour, parce qu'ils ne valent rien séparés :
 *  1. déclarer l'achat — le VENDEUR est l'agence de la session, et c'est SON portefeuille qui
 *     sera crédité ; le noyau recalcule le montant à partir des lignes ;
 *  2. ouvrir le paiement — le noyau rend le lien du prestataire et son QR.
 *
 * Les prix partent d'ici, côté serveur, et le montant qui s'affiche sur le QR est celui que le
 * noyau a arrêté. Un navigateur ne fixe aucun prix : il n'enverrait qu'un souhait.
 *
 * Server-only : la clé client kernel est posée par fetchBackend et ne quitte jamais le serveur.
 */

type LigneEntrante = {
    label?: unknown;
    description?: unknown;
    quantity?: unknown;
    unitAmount?: unknown;
};

type LigneSortante = { label: string; description: string | null; quantity: number; unitAmount: number };

const MAX_LIGNES = 50;

function texte(valeur: unknown, longueurMax: number): string | null {
    if (typeof valeur !== "string") return null;
    const propre = valeur.trim();
    return propre.length > 0 ? propre.slice(0, longueurMax) : null;
}

/**
 * Normalise les lignes avant de les envoyer.
 *
 * Le noyau refuserait de toute façon une ligne sans libellé ou à prix nul — mais son refus
 * arriverait comme une erreur technique au milieu d'une vente. Autant le dire ici, en français,
 * avant d'ouvrir quoi que ce soit chez le prestataire.
 */
function lignesValides(brut: unknown): { items?: LigneSortante[]; erreur?: string } {
    if (!Array.isArray(brut) || brut.length === 0) {
        return { erreur: "Ajoutez au moins un article avant d'encaisser." };
    }
    if (brut.length > MAX_LIGNES) {
        return { erreur: `Un encaissement ne porte pas plus de ${MAX_LIGNES} lignes.` };
    }
    const items: LigneSortante[] = [];
    for (const ligne of brut as LigneEntrante[]) {
        const label = texte(ligne?.label, 160);
        const quantite = Number(ligne?.quantity);
        const prix = Number(ligne?.unitAmount);
        if (!label) return { erreur: "Chaque ligne doit porter le nom de l'article." };
        if (!Number.isInteger(quantite) || quantite <= 0) {
            return { erreur: `Quantité invalide pour « ${label} ».` };
        }
        if (!Number.isFinite(prix) || prix <= 0) {
            return { erreur: `Pas de prix de vente pour « ${label} » : renseignez-le au catalogue.` };
        }
        items.push({
            label,
            description: texte(ligne?.description, 320),
            quantity: quantite,
            unitAmount: prix
        });
    }
    return { items };
}

export async function POST(request: Request) {
    try {
        const session = await getSession().catch(() => null);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const organizationId = session?.user?.organizationId;
        if (!organizationId) {
            return NextResponse.json(
                { error: "Aucune organisation dans votre session. Reconnectez-vous." },
                { status: 400 }
            );
        }

        const body = await request.json().catch(() => null);
        const { items, erreur } = lignesValides(body?.items);
        if (erreur || !items) {
            return NextResponse.json({ error: erreur ?? "Encaissement invalide." }, { status: 400 });
        }

        // L'AGENCE de la session est le vendeur quand il y en a une. C'est la règle du porteur :
        // l'argent d'une vente va à la caisse de l'agence qui l'a faite, et seule l'organisation
        // peut ensuite le faire sortir.
        const agencyId = session?.user?.agencyId ?? null;
        const reference = texte(body?.reference, 128);

        const creation = await fetchBackend("/api/payments/checkout-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                merchantOrganizationId: String(organizationId),
                merchantAgencyId: agencyId ? String(agencyId) : null,
                items,
                currency: "XAF",
                reference
            })
        });
        const cree = await readBackendJson(creation);
        if (!creation.ok) {
            return NextResponse.json(
                { error: cree?.message || cree?.error || "L'achat n'a pas pu être créé." },
                { status: creation.status }
            );
        }
        const sessionId = cree?.data?.session?.id ?? cree?.session?.id ?? null;
        if (!sessionId) {
            return NextResponse.json(
                { error: "Le noyau n'a pas rendu d'identifiant d'achat." },
                { status: 502 }
            );
        }

        const ouverture = await fetchBackend(`/api/payments/guest-checkout/${sessionId}/mobile-money`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: texte(body?.phone, 32), email: null })
        });
        const ouvert = await readBackendJson(ouverture);
        if (!ouverture.ok) {
            // L'achat existe désormais sans paiement ouvert. Ce n'est pas perdu : on rend son
            // identifiant, et un nouvel essai depuis l'écran rouvrira le paiement du MÊME achat
            // (le noyau est idempotent sur la référence) au lieu d'en créer un second.
            return NextResponse.json(
                {
                    error: ouvert?.message || ouvert?.error || "Le paiement n'a pas pu être ouvert.",
                    sessionId: String(sessionId)
                },
                { status: ouverture.status }
            );
        }

        // readBackendJson met les clés en snake_case (paymentUrl -> payment_url). On accepte les
        // deux formes : le jour où cette normalisation changera, l'encaissement ne doit pas tomber.
        const paiement = ouvert?.data ?? ouvert ?? {};
        return NextResponse.json({
            sessionId: String(sessionId),
            paymentUrl: paiement?.payment_url ?? paiement?.paymentUrl ?? null,
            qrCode: paiement?.qr_code ?? paiement?.qrCode ?? null,
            status: paiement?.status ?? "PENDING_PAYMENT",
            amount: Number(paiement?.amount ?? 0),
            currency: paiement?.currency ?? "XAF",
            reference
        });
    } catch (error: unknown) {
        // Une cause n'est pas forcément une Error : lire `.message` à l'aveugle rendrait un corps
        // d'erreur vide, et l'écran afficherait « undefined » au milieu d'une vente.
        const motif = error instanceof Error && error.message.trim() ? error.message : "Erreur lors de l'ouverture du paiement.";
        return NextResponse.json({ error: motif }, { status: 500 });
    }
}
