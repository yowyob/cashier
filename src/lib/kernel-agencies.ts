import { fetchBackend, readBackendJson } from "@/lib/backend";

/**
 * Les agences de la caisse, lues sur l'API organisation du noyau.
 *
 * La caisse appelait `/api/agencies`, `/api/agencies/{id}` (lecture, modification, suppression) :
 * routes de l'ancien serveur Spring, absentes du noyau. L'administration des agences et la lecture
 * de l'agence à la connexion échouaient. Le noyau range les agences sous leur organisation :
 * `/api/organizations/{org}/agencies`, modification par PATCH, fermeture plutôt que suppression.
 */

export function cheminAgences(organizationId: string) {
    return `/api/organizations/${encodeURIComponent(organizationId)}/agencies`;
}

/** Ajoute à chaque agence ses caisses, comme le faisait l'ancien serveur (l'écran les attend). */
async function avecLeursCaisses(agences: any[]) {
    const reponse = await fetchBackend("/api/cash-registers", { cache: "no-store" }, "cashier");
    const caisses = reponse.ok ? await readBackendJson(reponse) : null;
    const liste: any[] = Array.isArray(caisses) ? caisses : Array.isArray(caisses?.data) ? caisses.data : [];
    return agences.map((agence) => ({
        ...agence,
        // Noms historiques de l'écran, en plus de ceux du noyau.
        address: agence.address ?? agence.location ?? null,
        town: agence.town ?? agence.city ?? null,
        is_active: agence.is_active ?? agence.active,
        cash_registers: liste
            .filter((caisse) => String(caisse?.agency_id ?? "") === String(agence.id))
            .map((caisse) => ({ ...caisse, sessions: Array.isArray(caisse.sessions) ? caisse.sessions : [] })),
    }));
}

export async function listerAgences(organizationId: string) {
    const reponse = await fetchBackend(cheminAgences(organizationId), { cache: "no-store" }, "tiers");
    const corps = await readBackendJson(reponse);
    if (!reponse.ok) {
        return { ok: false as const, status: reponse.status, error: corps?.message || corps?.error || "Failed to load agencies." };
    }
    const liste: any[] = Array.isArray(corps?.data) ? corps.data : Array.isArray(corps) ? corps : [];
    return { ok: true as const, agences: await avecLeursCaisses(liste) };
}

/** Le noyau exige un code d'agence ; l'écran de la caisse n'en saisit pas : on le dérive du nom. */
function codeDepuis(nom: string) {
    const base = (nom || "AGENCE")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        .slice(0, 20) || "AGENCE";
    return `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Corps attendu par le noyau (CreateAgencyRequest / UpdateAgencyRequest) depuis celui de l'écran. */
export function versAgenceNoyau(saisie: any, existante?: any) {
    return {
        code: existante?.code ?? saisie.code ?? codeDepuis(saisie.name),
        name: saisie.name ?? existante?.name,
        location: saisie.address ?? saisie.location_hint ?? existante?.location ?? undefined,
        description: saisie.neighborhood ?? existante?.description ?? undefined,
        country: saisie.country ?? existante?.country ?? undefined,
        city: saisie.town ?? saisie.city ?? existante?.city ?? undefined,
        phone: saisie.phone ?? existante?.phone ?? undefined,
        email: saisie.email ?? existante?.email ?? undefined,
        active: saisie.is_active ?? saisie.active ?? existante?.active ?? undefined,
    };
}
