-- AlterTable: optional link from an inventory transaction to an Extra Work entry
ALTER TABLE "inventory_transactions" ADD COLUMN "extra_work_id" TEXT;

-- CreateIndex
CREATE INDEX "inventory_transactions_extra_work_id_idx" ON "inventory_transactions"("extra_work_id");

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_extra_work_id_fkey" FOREIGN KEY ("extra_work_id") REFERENCES "extra_work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
