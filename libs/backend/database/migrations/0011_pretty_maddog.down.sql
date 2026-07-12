-- DESTRUCTIVE: drops visits (all visitor sign-in records incl. signature keys),
-- kiosk_pairing_codes and kiosk_devices (all paired kiosk tablets lose access)
DROP TABLE IF EXISTS "visits" CASCADE;
DROP TABLE IF EXISTS "kiosk_pairing_codes" CASCADE;
DROP TABLE IF EXISTS "kiosk_devices" CASCADE;
