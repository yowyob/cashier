export type FournisseurDTO = {
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
    typeFournisseurOhada?: FournisseurDTO.typeFournisseurOhada;
    paymentMode?: FournisseurDTO.paymentMode;
    deliveryLeadTime?: string;
    mainProductType?: string;
    certification?: string;
};
export namespace FournisseurDTO {
    export enum typeFournisseurOhada {
        EXPLOITATION = 'EXPLOITATION',
        GROUPE = 'GROUPE',
        IMMOBILISATIONS = 'IMMOBILISATIONS',
        DIVERS = 'DIVERS',
    }
    export enum paymentMode {
        VIREMENT = 'VIREMENT',
        CHEQUE = 'CHEQUE',
        TRAITE = 'TRAITE',
    }
}
