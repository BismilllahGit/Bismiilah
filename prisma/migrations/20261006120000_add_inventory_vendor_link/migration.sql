-- Optional vendor link on inventory transactions, plus the vendor ledger
-- entry auto-created for a BUY with a vendor.
ALTER TABLE "inventory_transactions" ADD COLUMN "vendor_id" TEXT;
ALTER TABLE "inventory_transactions" ADD COLUMN "vendor_transaction_id" TEXT;

CREATE UNIQUE INDEX "inventory_transactions_vendor_transaction_id_key" ON "inventory_transactions"("vendor_transaction_id");
CREATE INDEX "inventory_transactions_vendor_id_idx" ON "inventory_transactions"("vendor_id");

ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_vendor_transaction_id_fkey" FOREIGN KEY ("vendor_transaction_id") REFERENCES "vendor_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
