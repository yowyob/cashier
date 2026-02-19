export type CommercialDTO = {
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
    typePersonnelOhada?: CommercialDTO.typePersonnelOhada;
    typeCommercial?: CommercialDTO.typeCommercial;
    commission?: number;
    dateDebutContrat?: string;
    dateFinContrat?: string;
    zonesCouvertes?: string;
    specialisations?: string;
};
export namespace CommercialDTO {
    export enum typePersonnelOhada {
        PERSONNEL = 'PERSONNEL',
        ORGANISMES_SOCIAUX = 'ORGANISMES_SOCIAUX',
        ETAT = 'ETAT',
        DIVERS = 'DIVERS',
    }
    export enum typeCommercial {
        INTERNE = 'INTERNE',
        EXTERNE = 'EXTERNE',
        INDEPENDANT = 'INDEPENDANT',
    }
}
