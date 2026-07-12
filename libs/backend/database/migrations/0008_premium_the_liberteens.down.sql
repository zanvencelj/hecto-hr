-- DESTRUCTIVE: drops employee_availability and shifts.is_open; re-adding NOT NULL on shifts.user_id fails if any open shift (null user_id) rows exist, which safely aborts the revert
DROP TABLE IF EXISTS "employee_availability" CASCADE;
ALTER TABLE "shifts" DROP COLUMN IF EXISTS "is_open";
ALTER TABLE "shifts" ALTER COLUMN "user_id" SET NOT NULL;
