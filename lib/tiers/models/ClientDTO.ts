export type ClientDTO = {
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
    typeClientOhada?: ClientDTO.typeClientOhada;
    segment?: ClientDTO.segment;
    plafondCredit?: number;
    canalAquisition?: string;
    estAssujettiTVA?: boolean;
};
export namespace ClientDTO {
    export enum typeClientOhada {
        ORDINAIRE = 'ORDINAIRE',
        ETAT = 'ETAT',
        GROUPE = 'GROUPE',
        DOUTEUX = 'DOUTEUX',
        DIVERS = 'DIVERS',
    }
    export enum segment {
        PARTICULIER = 'PARTICULIER',
        ENTREPRISE = 'ENTREPRISE',
        REVENDEUR = 'REVENDEUR',
    }
}
