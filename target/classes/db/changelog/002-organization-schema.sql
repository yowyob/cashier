-- liquibase formatted sql

-- changeset igor.comops-core:2-organization-schema
CREATE TABLE IF NOT EXISTS business_actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    business_id VARCHAR(100),
    niu VARCHAR(100),
    trade_registry_number VARCHAR(100),
    website VARCHAR(255),
    contact_phone VARCHAR(50),
    private_address TEXT,
    business_address TEXT,
    business_profile TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_actor_id UUID NOT NULL REFERENCES business_actors(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100),
    is_individual_business BOOLEAN DEFAULT false,
    status VARCHAR(50),
    manager_id UUID,
    email VARCHAR(255),
    description TEXT,
    logo_uri VARCHAR(512),
    logo_id UUID,
    website_url VARCHAR(512),
    social_network JSONB,
    business_registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    capital_share NUMERIC,
    ceo_name VARCHAR(255),
    year_founded INT,
    founding_date DATE,
    legal_form VARCHAR(100),
    keywords JSONB,
    number_of_employees INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add foreign key constraint from users to business_actors
ALTER TABLE users ADD CONSTRAINT fk_user_business_actor FOREIGN KEY (business_actor_id) REFERENCES business_actors(id);

-- Add foreign key constraint from users to organizations
ALTER TABLE users ADD CONSTRAINT fk_user_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- rollback ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_user_organization;
-- rollback ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_user_business_actor;
-- rollback DROP TABLE IF EXISTS organizations;
-- rollback DROP TABLE IF EXISTS business_actors;