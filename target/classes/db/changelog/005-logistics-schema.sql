-- liquibase formatted sql

-- changeset igor.comops-core:5-logistics-schema
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    long_name VARCHAR(255),
    type VARCHAR(50),
    location TEXT,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    timezone VARCHAR(100),
    owner_id UUID,
    manager_id UUID,
    transferable BOOLEAN,
    is_headquarter BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN,
    is_business BOOLEAN,
    is_individual_business BOOLEAN,
    logo_uri VARCHAR(512),
    logo_id UUID,
    phone VARCHAR(50),
    email VARCHAR(255),
    whatsapp VARCHAR(50),
    social_network JSONB,
    greeting_message TEXT,
    description TEXT,
    open_time VARCHAR(20),
    close_time VARCHAR(20),
    average_revenue NUMERIC,
    capital_share NUMERIC,
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    keywords JSONB,
    total_affiliated_customers INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

ALTER TABLE organization_members ADD CONSTRAINT fk_member_agency FOREIGN KEY (agency_id) REFERENCES agencies(id);
ALTER TABLE agency_settings ADD CONSTRAINT fk_settings_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS opening_hours_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 0=Lundi, 6=Dimanche
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_rule_per_agency_day UNIQUE (agency_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS opening_hours_intervals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES opening_hours_rules(id) ON DELETE CASCADE,
    start_time TIME,
    end_time TIME
);

CREATE TABLE IF NOT EXISTS special_opening_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    label VARCHAR(255),
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_exception_per_agency_date UNIQUE (agency_id, date)
);

CREATE TABLE IF NOT EXISTS special_opening_hours_intervals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    special_id UUID NOT NULL REFERENCES special_opening_hours(id) ON DELETE CASCADE,
    start_time TIME,
    end_time TIME
);

CREATE TABLE IF NOT EXISTS point_of_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    description TEXT,
    media_uri VARCHAR(512),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_pois (
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    poi_id UUID NOT NULL REFERENCES point_of_interests(id) ON DELETE CASCADE,
    distance_meters INT,
    description TEXT,
    PRIMARY KEY (agency_id, poi_id)
);

-- rollback DROP TABLE IF EXISTS agency_pois;
-- rollback DROP TABLE IF EXISTS point_of_interests;
-- rollback DROP TABLE IF EXISTS special_opening_hours_intervals;
-- rollback DROP TABLE IF EXISTS special_opening_hours;
-- rollback DROP TABLE IF EXISTS opening_hours_intervals;
-- rollback DROP TABLE IF EXISTS opening_hours_rules;
-- rollback ALTER TABLE agency_settings DROP CONSTRAINT IF EXISTS fk_settings_agency;
-- rollback ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_member_agency;
-- rollback DROP TABLE IF EXISTS agencies;