-- DESTRUCTIVE: drops work_events table and all clock-in/out history
DROP TABLE IF EXISTS "work_events" CASCADE;
DROP TYPE IF EXISTS "work_event_type";
