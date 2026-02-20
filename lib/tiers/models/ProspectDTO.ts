export type ProspectDTO = {
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
    typeProspectOhada?: ProspectDTO.typeProspectOhada;
    source?: string;
    potential?: string;
    conversionDate?: string;
    probability?: number;
    notes?: string;
};
export namespace ProspectDTO {
    export enum typeProspectOhada {
        ORDINAIRE = 'ORDINAIRE',
        STRATEGIQUE = 'STRATEGIQUE',
        PARTENAIRE = 'PARTENAIRE',
    }
}
