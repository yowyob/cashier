"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Encaissement d'un client SANS compte Yowyob : le caissier montre un QR, le client le scanne et
 * paie sur son téléphone.
 *
 * Ce panneau interroge le noyau de lui-même, parce qu'un QR mène DIRECTEMENT chez le prestataire :
 * le client ne revient sur aucune de nos pages, et personne ne déclencherait la relecture à sa
 * place.
 *
 * Il est monté par encaissement — l'appelant lui donne une `key` tirée de l'achat — pour qu'un
 * nouvel encaissement reparte d'un état neuf.
 */

export type EtatPaiement =
    | "PENDING_PAYMENT"
    | "SETTLED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "REFUND_DUE";

export type EncaissementOuvert = {
    sessionId: string;
    paymentUrl: string;
    qrCode: string;
    amount: number;
    currency: string;
    reference: string | null;
};

/** Le noyau refuse de rappeler le prestataire plus d'une fois toutes les 3 s : on reste au-dessus. */
const CADENCE_MS = 4000;

/** Au-delà, on cesse d'interroger sans rien conclure : la réconciliation du noyau fait le reste. */
const DUREE_MAX_MS = 10 * 60_000;

function phrase(etat: EtatPaiement): { ton: "attente" | "bon" | "mauvais"; texte: string } {
    switch (etat) {
        case "SETTLED":
            return { ton: "bon", texte: "Paiement reçu — le portefeuille de l'agence est crédité." };
        case "PENDING_PAYMENT":
            return { ton: "attente", texte: "En attente du paiement du client…" };
        case "FAILED":
            return {
                ton: "mauvais",
                texte: "Paiement refusé. Reprenez l'encaissement pour obtenir un nouveau lien."
            };
        case "CANCELLED":
            return { ton: "mauvais", texte: "Paiement annulé." };
        case "EXPIRED":
            return { ton: "mauvais", texte: "Lien de paiement expiré. Reprenez l'encaissement." };
        case "REFUND_DUE":
            return {
                ton: "mauvais",
                texte:
                    "Le client a payé, mais l'achat n'était plus à régler : l'argent est arrivé sans "
                    + "destinataire et doit lui être remboursé. Signalez-le à votre responsable."
            };
        default:
            return { ton: "attente", texte: "Issue du paiement inconnue." };
    }
}

export default function MobileMoneyQr({
    encaissement,
    onPaye,
    onClose
}: {
    encaissement: EncaissementOuvert;
    /** Appelé UNE SEULE FOIS, quand l'argent est porté au portefeuille de l'agence. */
    onPaye: (encaissement: EncaissementOuvert) => void;
    onClose: () => void;
}) {
    const [etat, setEtat] = useState<EtatPaiement>("PENDING_PAYMENT");
    const [refus, setRefus] = useState<string | null>(null);
    const [sondage, setSondage] = useState(false);
    const [cadenceLibre, setCadenceLibre] = useState(true);
    const [abandonne, setAbandonne] = useState(false);
    const dejaAnnonce = useRef(false);
    const monte = useRef(true);
    useEffect(() => () => { monte.current = false; }, []);

    const sonder = useCallback(async (): Promise<EtatPaiement | null> => {
        setSondage(true);
        setCadenceLibre(false);
        try {
            const reponse = await fetch(`/api/payments/checkout/${encaissement.sessionId}/refresh`, {
                method: "POST"
            });
            const corps = await reponse.json().catch(() => null);
            if (!reponse.ok) {
                throw new Error(corps?.error || "La vérification du paiement n'a pas abouti.");
            }
            const suivant = String(corps?.status ?? "PENDING_PAYMENT") as EtatPaiement;
            if (monte.current) {
                setRefus(null);
                setEtat(suivant);
            }
            return suivant;
        } catch (e: unknown) {
            // Un réseau qui hoquette n'est pas un refus de paiement : on le dit, et on continue
            // d'interroger. Conclure « échec » ici ferait refuser une vente pourtant payée.
            const motif = e instanceof Error && e.message.trim()
                ? e.message
                : "La vérification du paiement n'a pas abouti.";
            if (monte.current) setRefus(motif);
            return null;
        } finally {
            if (monte.current) setSondage(false);
            window.setTimeout(() => { if (monte.current) setCadenceLibre(true); }, CADENCE_MS);
        }
    }, [encaissement.sessionId]);

    useEffect(() => {
        let vivant = true;
        const depart = Date.now();
        const minuterie = window.setInterval(() => {
            if (!vivant) return;
            if (Date.now() - depart > DUREE_MAX_MS) {
                setAbandonne(true);
                window.clearInterval(minuterie);
                return;
            }
            void sonder().then((suivant) => {
                if (vivant && suivant && suivant !== "PENDING_PAYMENT") window.clearInterval(minuterie);
            });
        }, CADENCE_MS);
        return () => { vivant = false; window.clearInterval(minuterie); };
    }, [sonder]);

    useEffect(() => {
        if (etat === "SETTLED" && !dejaAnnonce.current) {
            dejaAnnonce.current = true;
            onPaye(encaissement);
        }
    }, [etat, onPaye, encaissement]);

    const issue = phrase(etat);
    const termine = etat !== "PENDING_PAYMENT";
    const fmt = (n: number) => `${n.toLocaleString()} ${encaissement.currency}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div role="dialog" aria-modal="true" aria-label="Encaissement par mobile money"
                className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                <h2 className="text-xl font-bold tracking-tight">Encaissement par mobile money</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Le client paie depuis son téléphone. Aucun compte, aucune application.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
                    {/* LE CODE, assez grand pour être scanné depuis un téléphone tenu à bout de
                        bras, sur fond blanc imposé : un PNG noir sur fond sombre ne se lit pas. */}
                    <figure className="mx-auto w-fit rounded-2xl border bg-white p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={encaissement.qrCode}
                            alt={`Code à scanner pour payer ${fmt(encaissement.amount)}`}
                            width={240} height={240} className="h-60 w-60" />
                    </figure>

                    <div className="min-w-0 space-y-4">
                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                À encaisser
                            </div>
                            <div className="text-3xl font-bold tabular-nums">{fmt(encaissement.amount)}</div>
                            {encaissement.reference && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Référence : {encaissement.reference}
                                </div>
                            )}
                        </div>

                        <div role="status" aria-live="polite"
                            className={`rounded-md p-3 text-sm ${issue.ton === "bon"
                                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                : issue.ton === "mauvais"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-muted text-muted-foreground"}`}>
                            {issue.texte}
                        </div>

                        {/* CE QUE LE CAISSIER DOIT SAVOIR, et qu'aucun autre écran ne dira :
                            cet argent n'est PAS dans le tiroir. Le compter à la clôture ferait
                            apparaître un manque qui n'existe pas. */}
                        {etat === "SETTLED" && (
                            <div className="rounded-md bg-amber-500/15 p-3 text-xs leading-5 text-amber-700 dark:text-amber-400">
                                Cet argent est allé au <strong>portefeuille de l&apos;agence</strong>, pas dans la
                                caisse. Ne le comptez pas dans les espèces à la clôture de session : le fonds
                                de caisse n&apos;a pas bougé.
                            </div>
                        )}

                        {refus && (
                            <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
                                {refus} Nouvelle tentative dans quelques secondes.
                            </p>
                        )}

                        {abandonne && !termine && (
                            <p className="rounded-md bg-amber-500/15 p-3 text-xs leading-5 text-amber-700 dark:text-amber-400">
                                Plus de vérification automatique après dix minutes. Si le client a payé, le
                                noyau portera l&apos;encaissement de lui-même ; vérifiez le portefeuille de
                                l&apos;agence avant de remettre la marchandise.
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            {!termine && (
                                <button type="button" onClick={() => void sonder()}
                                    disabled={sondage || !cadenceLibre}
                                    className="inline-flex h-10 items-center rounded-md border border-input px-3 text-sm font-medium hover:bg-muted disabled:opacity-40">
                                    Le client a payé — vérifier
                                </button>
                            )}
                            <a href={encaissement.paymentUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-primary hover:underline">
                                Ouvrir la page de paiement
                            </a>
                            <button type="button" onClick={onClose}
                                className="ml-auto inline-flex h-10 items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground">
                                {termine ? "Fermer" : "Abandonner l'encaissement"}
                            </button>
                        </div>

                        {!termine && (
                            <p className="text-xs text-muted-foreground">
                                Ne fermez pas cette fenêtre avant la confirmation : c&apos;est elle qui vérifie
                                le paiement.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
