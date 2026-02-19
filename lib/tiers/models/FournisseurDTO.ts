export type FournisseurDTO = {
    readonly id?: string;
    readonly compteComptable?: string;
    code?: string;
    name: string;
    shortName?: string;
    longName?: string;
    active?: boolean;
    description?: string;
    email?: string;
    phoneNumber?: string;
    website?: string;
    address?: string;
    complement?: string;
    postalCode?: string;
    city?: string;
    pays?: string;
    secteurActivite?: string;
    tailleEntreprise?: string;
    dateCreation?: string;
    registreCommerce?: string;
    numeroFiscal?: string;
    canalPrefere?: string;
    typeEntreprise?: string;
    tenantId?: string;
    agencyId?: string;
    typeFournisseurOhada?: FournisseurDTO.typeFournisseurOhada;
    modePaiement?: FournisseurDTO.modePaiement;
    delaiLivraison?: string;
    produitsPrincipaux?: string;
    certification?: string;
};
export namespace FournisseurDTO {
    export enum typeFournisseurOhada {
        EXPLOITATION = 'EXPLOITATION',
        GROUPE = 'GROUPE',
        IMMOBILISATIONS = 'IMMOBILISATIONS',
        DIVERS = 'DIVERS',
    }
    export enum modePaiement {
        VIREMENT = 'VIREMENT',
        CHEQUE = 'CHEQUE',
        TRAITE = 'TRAITE',
    }
}
