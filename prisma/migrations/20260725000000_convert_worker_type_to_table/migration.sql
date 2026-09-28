-- Reconstructed: this migration was applied to the real database (between
-- add_daily_labour and add_boq_hierarchy -- add_boq_hierarchy already
-- references a "worker_types" table via FK) but its file was never
-- committed to version control, and the DB's migration ledger has no
-- record of it by name either. It is inserted here only so Prisma's
-- shadow-database replay (used by future `migrate dev`/`migrate diff`
-- runs) can rebuild a schema that matches the real database; it is marked
-- "applied" via `prisma migrate resolve` rather than actually executed
-- against the real database, which already has this structure.
--
-- Reconstructed by comparing the committed schema (which has a `WorkerType`
-- model/table, no `WageRatePreset` model) against the prior migration
-- (20260721120000_add_daily_labour, which created a `wage_rate_presets`
-- table and a `worker_type` enum column) -- the enum-backed preset table was
-- superseded by a proper `worker_types` table with a foreign key.

-- DropTable: superseded by worker_types
DROP TABLE "wage_rate_presets";

-- CreateEnum
CREATE TYPE "PaymentCycle" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "worker_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "default_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_cycle" "PaymentCycle" NOT NULL DEFAULT 'WEEKLY',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_types_name_key" ON "worker_types"("name");

-- Convert daily_labour_entries.worker_type (enum) into worker_type_id (FK)
DROP INDEX "daily_labour_entries_worker_type_date_idx";

ALTER TABLE "daily_labour_entries" DROP COLUMN "worker_type";
ALTER TABLE "daily_labour_entries" ADD COLUMN "worker_type_id" TEXT NOT NULL;

CREATE INDEX "daily_labour_entries_worker_type_id_date_idx" ON "daily_labour_entries"("worker_type_id", "date");

ALTER TABLE "daily_labour_entries" ADD CONSTRAINT "daily_labour_entries_worker_type_id_fkey" FOREIGN KEY ("worker_type_id") REFERENCES "worker_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropEnum: no longer referenced by any column
DROP TYPE "WorkerType";
