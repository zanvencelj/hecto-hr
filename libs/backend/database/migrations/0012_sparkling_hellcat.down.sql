-- DESTRUCTIVE: drops admin_audit_logs (all platform-admin audit history) and
-- organizations.deleted_at (soft-deleted orgs become indistinguishable from live ones).
-- NOTE: the 'superadmin' enum value cannot be removed from user_role without
-- recreating the type; it is left in place (harmless if unused).
DROP TABLE IF EXISTS "admin_audit_logs" CASCADE;
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "deleted_at";
