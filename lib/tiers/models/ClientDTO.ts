export type ClientDTO = {
    readonly id?: string;
    readonly accountingAccount?: string;
    bankAccountNumber?: string;
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
    country?: string;
    businessSector?: string;
    companySize?: string;
    dateCreation?: string;
    tradeRegistryNumber?: string;
    taxNumber?: string;
    preferredChannel?: string;
    typeEntreprise?: string;
    tenantId?: string;
    agencyId?: string;
    ohadaType?: ClientDTO.ohadaType;
    segment?: ClientDTO.segment;
    creditLimit?: number;
    acquisitionChannel?: string;
    vatSubject?: boolean;
    customerVatNumber?: string;
    retailSale?: boolean;
    semiWholesale?: boolean;
    wholesale?: boolean;
    superWholesale?: boolean;
};
export namespace ClientDTO {
    export enum ohadaType {
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
