-- Payment status for vendor purchase bills (PAYMENT rows stay NULL).
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE');

ALTER TABLE "vendor_transactions" ADD COLUMN "payment_status" "PaymentStatus";

-- Existing purchases are treated as already settled.
UPDATE "vendor_transactions" SET "payment_status" = 'PAID' WHERE "type" = 'PURCHASE';
