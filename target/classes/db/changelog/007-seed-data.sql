-- liquibase formatted sql

-- changeset igor.comops-core:7-seed-data
-- Roles de base du système
INSERT INTO roles (name, description) VALUES ('ROLE_ADMIN', 'Super administrateur de l''organisation') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, description) VALUES ('ROLE_MANAGER', 'Manager d''agence ou de département') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, description) VALUES ('ROLE_STAFF', 'Employé standard') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, description) VALUES ('ROLE_USER', 'Rôle technique de base pour tout utilisateur') ON CONFLICT (name) DO NOTHING;

-- Permissions de base pour la gestion RH
INSERT INTO permissions (resource, action, description) VALUES ('HR', 'MANAGE_GLOBAL', 'Recruter et gérer les administrateurs et membres du siège') ON CONFLICT (resource, action) DO NOTHING;
INSERT INTO permissions (resource, action, description) VALUES ('HR', 'MANAGE_LOCAL', 'Recruter et gérer le staff de sa propre agence') ON CONFLICT (resource, action) DO NOTHING;
INSERT INTO permissions (resource, action, description) VALUES ('SETTINGS', 'MANAGE_GLOBAL', 'Gérer les paramètres de l''organisation') ON CONFLICT (resource, action) DO NOTHING;
INSERT INTO permissions (resource, action, description) VALUES ('SETTINGS', 'MANAGE_LOCAL', 'Gérer les paramètres de son agence') ON CONFLICT (resource, action) DO NOTHING;

-- Assigner les permissions au rôle ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_ADMIN' AND p.resource IN ('HR', 'SETTINGS')
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_MANAGER' AND p.action = 'MANAGE_LOCAL'
ON CONFLICT DO NOTHING;

-- rollback DELETE FROM role_permissions;
-- rollback DELETE FROM permissions;
-- rollback DELETE FROM roles;