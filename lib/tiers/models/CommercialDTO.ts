export type CommercialDTO = {
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
    typePersonnelOhada?: CommercialDTO.typePersonnelOhada;
    agentType?: CommercialDTO.agentType;
    commission?: number;
    contractStartDate?: string;
    contractEndDate?: string;
    coveredZones?: string;
    specializations?: string;
};
export namespace CommercialDTO {
    export enum typePersonnelOhada {
        PERSONNEL = 'PERSONNEL',
        ORGANISMES_SOCIAUX = 'ORGANISMES_SOCIAUX',
        ETAT = 'ETAT',
        DIVERS = 'DIVERS',
    }
    export enum agentType {
        INTERNE = 'INTERNE',
        EXTERNE = 'EXTERNE',
        INDEPENDANT = 'INDEPENDANT',
    }
}
