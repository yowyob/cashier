export type UserRole = 'admin' | 'secretaire' | 'comptable' | 'manager' | 'rh' | 'commercial';
export type Permission = 'read' | 'create' | 'update' | 'delete' | 'export';
export type TierType = 'client' | 'fournisseur' | 'commercial' | 'prospect';

export interface TiersUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    permissions: Record<TierType, Permission[]>;
    avatar?: string;
}

// Java Backend Enums
export type Pays = 'CMR' | 'CG' | 'TC' | 'GB' | 'CI';
export type SecteurActivite = 'IT' | 'FINANCE' | 'SANTE' | 'INDUSTRIE' | 'COMMERCE';
export type TailleEntreprise = 'MICRO' | 'PME' | 'ETI' | 'GE';
export type CanalPrefere = 'EMAIL' | 'PHONE' | 'COURRIER' | 'IN_PERSON';
export type TypeEntreprise = 'PARTICULIER' | 'ENTREPRISE' | 'REVENDEUR';

// Specific Enums
export type SourceProspect = 'SITE_WEB' | 'RESEAU_SOCIAL' | 'SALON' | 'RECOMMANDATION';
export type Potentiel = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'STRATEGIQUE';
export type ModePaiementFournisseur = 'VIREMENT' | 'CHEQUE' | 'TRAITE';
export type ProduitPrincipal = 'ELECTRONIQUE' | 'MATERIEL' | 'LOGICIEL';
export type TypeCommercial = 'INTERNE' | 'EXTERNE' | 'INDEPENDANT';
export type ZoneCouverture = 'NORD' | 'SUD' | 'EST' | 'OUEST' | 'CENTRE' | 'LITTORAL' | 'INTERNATIONAL';
export type Specialisation = 'B2B' | 'B2C' | 'SECTEUR_PUBLIC' | 'GRANDS_COMPTES';
export type SegmentClient = 'PARTICULIER' | 'ENTREPRISE' | 'REVENDEUR';
export type CanalAquisition = 'WEB' | 'RESEAU' | 'RECOMMANDATION';

// Financial Types
export type ModePaiementAutorise = 'CHEQUE' | 'VIREMENT' | 'ESPECE' | 'CREDIT' | 'MOBILE_MONEY';

// Payment Methods for Clients/Fournisseurs
export type ModePaiementClient = 'CHEQUE' | 'PAR_COMPTE' | 'CREDIT' | 'ESPECES' | 'VIREMENT';

// Transaction Categories (pricing tiers)
export type CategorieTransaction = 'DETAIL' | 'DEMI_GROS' | 'GROS' | 'SUPER_GROS';

export const LABEL_MODE_PAIEMENT: Record<ModePaiementClient, string> = {
    CHEQUE: 'Chèque',
    PAR_COMPTE: 'Par Compte',
    CREDIT: 'Crédit',
    ESPECES: 'Espèces',
    VIREMENT: 'Virement',
};

export const LABEL_CATEGORIE_TRANSACTION: Record<CategorieTransaction, string> = {
    DETAIL: 'Détail',
    DEMI_GROS: 'Demi-Gros',
    GROS: 'Gros',
    SUPER_GROS: 'Super Gros',
};

export interface FinancialInfo {
    solde: number;
    modesPaiementAutorises: ModePaiementAutorise[];
    rib?: string;
    devise: string;
}

export interface CompteBancaire {
    id: string;
    iban: string;
    bic: string;
    banque: string;
}

export interface Note {
    id: string;
    content: string;
    date: Date;
    authorId: string;
}

export interface Contact {
    id: string;
    nom: string;
    poste: string;
    email: string;
    telephone: string;
}

export interface Facture {
    id: string;
    numero: string;
    date: Date;
    montantHT: number;
    montantTTC: number;
    statut: 'brouillon' | 'envoée' | 'payée' | 'en retard' | 'annulée';
    echeance?: Date;
    pdfUrl?: string;
    actionSuivi?: {              // Action de suivi associée à la facture
        type: string;
        date: Date;
        note: string;
        statut: 'PENDING' | 'DONE';
    };
}

export interface LigneProduit {
    id: string;
    reference: string;
    designation: string;
    quantite: number;
    prixUnitaire: number;
    remise?: number;       // % remise
    total: number;
    unite?: string;         // ex: 'kg', 'pieces', 'litre'
    categorie?: string;
}

export interface HistoriqueProduit {
    id: string;
    date: Date;
    factureNumero?: string;
    produits: LigneProduit[];
    montantTotal: number;
    type: 'achat' | 'vente';  // achat = client, vente = fournisseur
}

export interface Affaire {
    id: string;
    titre: string;
    montant: number;
    status: 'en_cours' | 'gagnée' | 'perdue';
    date: Date;
}

export interface Communication {
    id: string;
    type: 'email' | 'appel' | 'rdv' | 'note';
    date: Date;
    sujet: string;
    contenu: string;
    canal: string;
    participant: string;
    piecesJointes?: string[];
}

export interface PaiementCommission {
    id: string;
    date: Date;
    montant: number;
    reference: string;
    note?: string;
    statut: 'en_attente' | 'payé' | 'annulé';
}

export type ActionEffect = 'IMMEDIATE' | 'DEFERRED';
export type ActionStatus = 'PENDING' | 'DONE' | 'CANCELLED';
export type NotificationMethod = 'EMAIL' | 'SMS' | 'APP';
export type ActionType = 'RELANCE_PAIEMENT' | 'DEMANDE_DEVIS' | 'RDV_CLIENT' | 'RECLAMATION' | 'AUTRE' | 'COMMANDE' | 'LIVRAISON';

export interface TiersAction {
    id: string;
    title: string;
    type: ActionType;
    object: string;
    followedBy: string;
    notificationMethod: NotificationMethod;
    date: Date;
    content: string;
    effect: ActionEffect;
    status: ActionStatus;
    createdAt: Date;
    completedAt?: Date;
}

// Core Entity Structure
export interface TierBase {
    id: string;
    tenantId?: string;
    agencyId?: string;
    code?: string;
    name: string;
    compteComptable?: string;
    nui?: string;
    shortName?: string;
    longName?: string;
    description?: string;
    avatar?: string;
    email: string;
    phoneNumber: string;
    website?: string;
    address: string;
    complement?: string;
    postalCode: string;
    city: string;
    pays?: Pays;
    secteurActivite?: SecteurActivite;
    tailleEntreprise?: TailleEntreprise;
    dateCreation?: Date;
    registreCommerce?: string;
    numeroFiscal?: string;
    enterpriseName?: string;
    canalPrefere?: CanalPrefere;
    typeEntreprise?: TypeEntreprise;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    financial?: FinancialInfo;
    contacts?: Contact[];
    actions?: TiersAction[];
    comptesBancaires?: CompteBancaire[]; // Comptes bancaires associés
    nom?: string;
    ville?: string;
    telephone?: string;
}

export interface TiersClient extends TierBase {
    type: 'client';
    segment?: SegmentClient;
    plafondCredit?: number;
    canalAquisition?: CanalAquisition;
    fax?: string;
    contact?: string;
    formeJuridique?: string;
    familleClient?: string;
    pricingCategory?: {
        detail: boolean;
        demisGros: boolean;
        gros: boolean;
        superGros: boolean;
    };
    creditInfo?: {
        activé: boolean;
        copiesFacture?: number;
        tauxRemise?: number;
    };
    notes?: string;
    factures?: Facture[];
    produitsHistorique?: HistoriqueProduit[];
    communications?: Communication[];
    balanceStatusData?: {
        magasin: string;
        etat: string;
        blNo: string;
        livreLe: string;
        reglement: string;
        montantTTC: number;
    }[];
    paymentMethodsData?: {
        code: string;
        libelle: string;
        autorise: boolean;
    }[];
    // New: explicit payment methods and category flags
    modesPaiementClient?: ModePaiementClient[];
    categoriesVente?: CategorieTransaction[];
    categorie?: 'A' | 'B' | 'C';
    siret?: string;
    tva?: string;
    estAssujettiTVA?: boolean;
}

export interface TiersFournisseur extends TierBase {
    type: 'fournisseur';
    modePaiement?: ModePaiementFournisseur;
    delaiLivraison?: string;
    produitsPrincipaux?: ProduitPrincipal;
    certification?: string;
    fax?: string;
    contact?: string;
    formeJuridique?: string;
    familleFournisseur?: string;
    factures?: Facture[];
    produitsHistorique?: HistoriqueProduit[];
    notes?: string;
    codeFournisseur?: string;
    conditionsPaiement?: string;
    // New: explicit payment methods and category flags
    modesPaiementFournisseur?: ModePaiementClient[];
    categoriesAchat?: CategorieTransaction[];
}

export interface TiersCommercial extends TierBase {
    type: 'commercial';
    typeCommercial?: TypeCommercial;
    commission?: number;
    dateDebutContrat?: Date;
    dateFinContrat?: Date;
    zonesCouvertes?: ZoneCouverture;
    specialisations?: Specialisation;
    fax?: string;
    contact?: string;
    notes?: string;
    matricule?: string;
    clients?: string[];
    affaires?: Affaire[];
    paiements?: PaiementCommission[];
}

export interface TiersProspect extends TierBase {
    type: 'prospect';
    sourceProspect?: SourceProspect;
    potentiel?: Potentiel;
    dateConversion?: Date;
    probabilite?: number;
    notesProspect?: string;
    fax?: string;
    contact?: string;
    familleProspect?: string;
    notes?: string;
}

export type Tier = TiersClient | TiersFournisseur | TiersCommercial | TiersProspect;
