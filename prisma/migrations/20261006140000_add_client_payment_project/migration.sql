-- AlterTable
ALTER TABLE "client_payments" ADD COLUMN "project_id" TEXT;

-- Backfill from the linked invoice's project
UPDATE "client_payments" cp
SET "project_id" = i."project_id"
FROM "invoices" i
WHERE cp."invoice_id" = i."id";

-- CreateIndex
CREATE INDEX "client_payments_project_id_idx" ON "client_payments"("project_id");

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
