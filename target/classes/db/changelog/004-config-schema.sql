-- liquibase formatted sql

-- changeset igor.comops-core:4-config-schema
CREATE TABLE IF NOT EXISTS app_business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    organization_prefix VARCHAR(10),
    negotiate_selling_price BOOLEAN,
    selling_price_include_vat BOOLEAN,
    authorize_exceptional_discount BOOLEAN,
    grantable_discount_rate NUMERIC(5, 2),
    length_of_vat_invoice_number INT,
    prefix_of_vat_invoice_number VARCHAR(20),
    low_stock_alert BOOLEAN,
    preventive_maintenance_alert BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_settings_per_org UNIQUE (organization_id)
);

CREATE TABLE IF NOT EXISTS agency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL, -- FK added in logistics-schema
    agency_prefix VARCHAR(10),
    is_print_logo BOOLEAN,
    paper_format VARCHAR(50),
    ticket_footer_message TEXT,
    allow_negative_stock BOOLEAN,
    default_timezone VARCHAR(100),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_settings_per_agency UNIQUE (agency_id)
);

CREATE TABLE IF NOT EXISTS document_sequences (
    organization_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    current_value INT NOT NULL DEFAULT 0,
    PRIMARY KEY (organization_id, document_type, year)
);

-- rollback DROP TABLE IF EXISTS document_sequences;
-- rollback DROP TABLE IF EXISTS agency_settings;
-- rollback DROP TABLE IF EXISTS app_business_settings;