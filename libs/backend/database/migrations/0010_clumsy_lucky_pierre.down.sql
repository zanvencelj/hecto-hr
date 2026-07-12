-- DESTRUCTIVE: drops event_change_requests table and all pending/reviewed change requests
DROP TABLE IF EXISTS "event_change_requests" CASCADE;
DROP TYPE IF EXISTS "change_request_type";
DROP TYPE IF EXISTS "change_request_status";
