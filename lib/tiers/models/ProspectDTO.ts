export type ProspectDTO = {
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
    typeProspectOhada?: ProspectDTO.typeProspectOhada;
    sourceProspect?: string;
    potentiel?: string;
    dateConversion?: string;
    probabilite?: number;
    notesProspect?: string;
};
export namespace ProspectDTO {
    export enum typeProspectOhada {
        ORDINAIRE = 'ORDINAIRE',
        STRATEGIQUE = 'STRATEGIQUE',
        PARTENAIRE = 'PARTENAIRE',
    }
}
