-- DESTRUCTIVE: drops invitations, employee_profiles, shifts, and leave_* tables and all their data
DROP TABLE IF EXISTS "leave_requests" CASCADE;
DROP TABLE IF EXISTS "leave_balances" CASCADE;
DROP TABLE IF EXISTS "leave_types" CASCADE;
DROP TABLE IF EXISTS "shift_breaks" CASCADE;
DROP TABLE IF EXISTS "shifts" CASCADE;
DROP TABLE IF EXISTS "recurring_shifts" CASCADE;
DROP TABLE IF EXISTS "employee_profiles" CASCADE;
DROP TABLE IF EXISTS "invitations" CASCADE;
DROP TYPE IF EXISTS "leave_request_status";
DROP TYPE IF EXISTS "invitation_status";
