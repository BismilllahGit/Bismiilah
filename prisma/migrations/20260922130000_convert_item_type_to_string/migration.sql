-- Convert items.type from the fixed "ItemType" enum to free text so users
-- can add new item types from the UI without a schema change. Existing
-- values are preserved by casting the enum to text; no rows are touched.
ALTER TABLE "items" ALTER COLUMN "type" TYPE VARCHAR(50) USING "type"::text;

-- DropEnum: no longer referenced by any column
DROP TYPE "ItemType";