-- In order to allow users to sign up, create an initial organization if not exists
INSERT INTO organizations (id, slug, name) VALUES ('00000000-0000-0000-0000-000000000000', 'default-org', 'Default Organization') ON CONFLICT DO NOTHING;
