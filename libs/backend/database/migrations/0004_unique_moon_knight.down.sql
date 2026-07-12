-- DESTRUCTIVE: drops organizations/password_resets tables and tenancy columns; re-added is_superuser/is_staff get default values, not their original data
ALTER TABLE "users" ADD COLUMN "is_superuser" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN "is_staff" boolean DEFAULT false NOT NULL;
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at";
DROP TABLE IF EXISTS "password_resets" CASCADE;
DROP TABLE IF EXISTS "organizations" CASCADE;
DROP TYPE IF EXISTS "user_role";
