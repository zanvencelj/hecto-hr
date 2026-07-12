-- DESTRUCTIVE: drops leave_requests edit-tracking columns and their data
ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "edited_at";
ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "edited_by_user_id";
ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "is_edited";
