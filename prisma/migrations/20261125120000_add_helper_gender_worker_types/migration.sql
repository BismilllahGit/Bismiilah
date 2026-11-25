-- Data migration: add gender-specific helper worker types.
-- Existing "Helpers" type is kept so historical labour entries stay valid.
INSERT INTO "worker_types" ("id", "name", "default_rate", "payment_cycle", "is_custom", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'Helpers (Male)', 1000, 'WEEKLY', false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Helpers (Female)', 1000, 'WEEKLY', false, true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
