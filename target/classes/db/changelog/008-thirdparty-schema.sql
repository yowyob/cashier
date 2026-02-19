-- liquibase formatted sql

-- changeset antigravity:8-thirdparty-schema
CREATE TABLE IF NOT EXISTS tiers (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    agency_id UUID,
    code VARCHAR(255) UNIQUE,
    compte_comptable VARCHAR(255),
    compte_bancaire VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255),
    long_name VARCHAR(255),
    description VARCHAR(1000),
    
    -- Legal
    numero_fiscal VARCHAR(255),
    registre_commerce VARCHAR(255),
    
    -- Enums
    type_entreprise VARCHAR(255),
    secteur_activite VARCHAR(255),
    taille_entreprise VARCHAR(255),
    
    -- Contact
    email VARCHAR(255),
    phone_number VARCHAR(255),
    website VARCHAR(255),
    canal_prefere VARCHAR(255),
    
    -- Address
    address VARCHAR(255),
    complement VARCHAR(255),
    postal_code VARCHAR(255),
    city VARCHAR(255),
    pays VARCHAR(255),
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY,
    segment VARCHAR(255),
    plafond_credit NUMERIC(38,2),
    canal_aquisition VARCHAR(255),
    numero_tva VARCHAR(255),
    est_assujetti_tva BOOLEAN DEFAULT false,
    
    -- Flags Vente
    vente_detail BOOLEAN DEFAULT false,
    vente_demi_gros BOOLEAN DEFAULT false,
    vente_gros BOOLEAN DEFAULT false,
    vente_super_gros BOOLEAN DEFAULT false,
    
    type_client_ohada VARCHAR(255),
    
    CONSTRAINT fk_clients_tiers FOREIGN KEY (id) REFERENCES tiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fournisseurs (
    id UUID PRIMARY KEY,
    mode_paiement VARCHAR(255),
    produits_principaux VARCHAR(255),
    delai_livraison VARCHAR(255),
    certification VARCHAR(255),
    
    CONSTRAINT fk_fournisseurs_tiers FOREIGN KEY (id) REFERENCES tiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY,
    source_prospect VARCHAR(255),
    potentiel VARCHAR(255),
    probabilite INT,
    date_conversion DATE,
    notes_prospect VARCHAR(2000),
    
    CONSTRAINT fk_prospects_tiers FOREIGN KEY (id) REFERENCES tiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerciaux (
    id UUID PRIMARY KEY,
    type_commercial VARCHAR(255),
    zones_couvertes VARCHAR(255),
    specialisations VARCHAR(255),
    commission NUMERIC(38,2),
    date_debut_contrat DATE,
    date_fin_contrat DATE,
    
    CONSTRAINT fk_commerciaux_tiers FOREIGN KEY (id) REFERENCES tiers(id) ON DELETE CASCADE
);

-- rollback DROP TABLE IF EXISTS commerciaux;
-- rollback DROP TABLE IF EXISTS prospects;
-- rollback DROP TABLE IF EXISTS fournisseurs;
-- rollback DROP TABLE IF EXISTS clients;
-- rollback DROP TABLE IF EXISTS tiers;
