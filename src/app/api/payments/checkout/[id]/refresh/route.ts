import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

/**
 * Relit l'issue d'un encaissement chez le prestataire.
 *
 * Avec un QR, le client paie sur SON téléphone et ne revient sur aucune de nos pages : personne ne
 * déclenche cette relecture à sa place. C'est l'écran du caissier qui interroge, et c'est ce qui
 * lui dit s'il peut remettre la marchandise.
 *
 * Le noyau impose un intervalle minimal entre deux relectures réelles (3 s par défaut) : en deçà
 * il rend l'état déjà connu sans rappeler le prestataire. Interroger plus souvent ne sert donc à
 * rien et nous ferait limiter.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession().catch(() => null);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
            return NextResponse.json({ error: "Identifiant d'achat invalide." }, { status: 400 });
        }

        const reponse = await fetchBackend(`/api/payments/guest-checkout/${id}/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        const corps = await readBackendJson(reponse);
        if (!reponse.ok) {
            return NextResponse.json(
                { error: corps?.message || corps?.error || "La vérification du paiement n'a pas abouti." },
                { status: reponse.status }
            );
        }
        const issue = corps?.data ?? corps ?? {};
        return NextResponse.json({
            sessionId: issue?.session_id ?? issue?.sessionId ?? id,
            status: issue?.status ?? "PENDING_PAYMENT",
            amount: Number(issue?.amount ?? 0),
            currency: issue?.currency ?? "XAF"
        });
    } catch (error: unknown) {
        // Une cause n'est pas forcément une Error : lire `.message` à l'aveugle rendrait un corps
        // d'erreur vide, et l'écran afficherait « undefined » au milieu d'une vente.
        const motif = error instanceof Error && error.message.trim() ? error.message : "Erreur lors de la vérification du paiement.";
        return NextResponse.json({ error: motif }, { status: 500 });
    }
}
