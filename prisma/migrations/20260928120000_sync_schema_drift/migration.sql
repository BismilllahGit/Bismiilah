-- Reconciles migration history with prisma/schema.prisma: schema.prisma had
-- accumulated model changes (new tables, column renames, enum additions)
-- that were never captured as migration files. Generated via
-- `prisma migrate diff --from-url <db> --to-schema-datamodel schema.prisma
-- --script` against the freshly-reset database on 2026-09-28, before any
-- real data existed post-reset.

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('MATERIAL', 'TOOL', 'PAINT', 'CEMENT');

-- AlterEnum
ALTER TYPE "ContactType" ADD VALUE 'LABOUR_CONTRACTOR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_IN';

-- DropForeignKey
ALTER TABLE "boq_categories" DROP CONSTRAINT "boq_categories_section_id_fkey";

-- DropForeignKey
ALTER TABLE "boq_line_items" DROP CONSTRAINT "boq_line_items_category_id_fkey";

-- DropForeignKey
ALTER TABLE "client_payments" DROP CONSTRAINT "client_payments_invoice_id_fkey";

-- DropIndex
DROP INDEX "boq_line_items_category_id_idx";

-- DropIndex
DROP INDEX "vendor_transactions_contact_id_date_idx";

-- AlterTable
ALTER TABLE "boq_line_items" DROP COLUMN "category_id",
ADD COLUMN     "executed_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "executed_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "itemNo" VARCHAR(20),
ADD COLUMN     "make" VARCHAR(255),
ADD COLUMN     "section_id" TEXT NOT NULL,
ADD COLUMN     "title" VARCHAR(255) NOT NULL DEFAULT 'Item',
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "boqs" ADD COLUMN     "cgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 9.00,
ADD COLUMN     "sgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 9.00,
ADD COLUMN     "terms_override" TEXT;

-- AlterTable
ALTER TABLE "client_payments" ADD COLUMN     "voucher_number" VARCHAR(20) NOT NULL,
ALTER COLUMN "invoice_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "daily_labour_entries" DROP COLUMN "brought_by",
ADD COLUMN     "contractor_id" TEXT,
ADD COLUMN     "paid_immediately" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "extra_work" ADD COLUMN     "voucher_number" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "transfer_group_id" VARCHAR(40),
ADD COLUMN     "voucher_number" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "void_reason" TEXT;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "type",
ADD COLUMN     "type" "ItemType" NOT NULL;

-- AlterTable
ALTER TABLE "project_inventory" ADD COLUMN     "qty_transferred_in" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "qty_transferred_out" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "site_expenses" ADD COLUMN     "voucher_number" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "vendor_transactions" ADD COLUMN     "voucher_number" VARCHAR(20) NOT NULL;

-- DropTable
DROP TABLE "boq_categories";

-- DropTable
DROP TABLE "notification_logs";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- DropEnum
DROP TYPE "NotificationStatus";

-- DropEnum
DROP TYPE "NotificationType";

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_date" DATE NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "client_payment_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_payments" (
    "id" TEXT NOT NULL,
    "voucher_number" VARCHAR(20) NOT NULL,
    "contact_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labour_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_logs" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_sequences" (
    "id" TEXT NOT NULL,
    "nextVal" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "voucher_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profile" (
    "id" TEXT NOT NULL,
    "companyName" VARCHAR(255) NOT NULL,
    "tagline" VARCHAR(255),
    "licenseDetails" TEXT,
    "address" TEXT,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "gstNumber" VARCHAR(50),
    "tanNumber" VARCHAR(50),
    "logoUrl" TEXT,
    "bankAccountName" VARCHAR(255),
    "bankAccountNumber" VARCHAR(50),
    "bankIfsc" VARCHAR(20),
    "bankName" VARCHAR(255),
    "bankBranch" VARCHAR(255),
    "bankAccountType" VARCHAR(50),
    "upiId" VARCHAR(100),
    "defaultTerms" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_payment_milestones" (
    "id" TEXT NOT NULL,
    "boq_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "stageName" TEXT NOT NULL,
    "target_date" DATE,
    "percentage" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "boq_payment_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boq_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_template_sections" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "group_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boq_template_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_template_line_items" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boq_template_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_tasks_project_id_target_date_idx" ON "project_tasks"("project_id", "target_date");

-- CreateIndex
CREATE INDEX "project_tasks_target_date_status_idx" ON "project_tasks"("target_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "labour_payments_voucher_number_key" ON "labour_payments"("voucher_number");

-- CreateIndex
CREATE INDEX "labour_payments_contact_id_payment_date_created_at_idx" ON "labour_payments"("contact_id", "payment_date", "created_at");

-- CreateIndex
CREATE INDEX "share_logs_reference_type_reference_id_idx" ON "share_logs"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "boq_payment_milestones_boq_id_idx" ON "boq_payment_milestones"("boq_id");

-- CreateIndex
CREATE INDEX "boq_line_items_section_id_idx" ON "boq_line_items"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_payments_voucher_number_key" ON "client_payments"("voucher_number");

-- CreateIndex
CREATE INDEX "client_payments_client_id_payment_date_created_at_idx" ON "client_payments"("client_id", "payment_date", "created_at");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "contacts_name_idx" ON "contacts"("name");

-- CreateIndex
CREATE INDEX "daily_labour_entries_contractor_id_idx" ON "daily_labour_entries"("contractor_id");

-- CreateIndex
CREATE INDEX "daily_labour_entries_contractor_id_date_created_at_idx" ON "daily_labour_entries"("contractor_id", "date", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "extra_work_voucher_number_key" ON "extra_work"("voucher_number");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transactions_voucher_number_key" ON "inventory_transactions"("voucher_number");

-- CreateIndex
CREATE INDEX "inventory_transactions_project_id_item_id_date_created_at_idx" ON "inventory_transactions"("project_id", "item_id", "date", "created_at");

-- CreateIndex
CREATE INDEX "inventory_transactions_transfer_group_id_idx" ON "inventory_transactions"("transfer_group_id");

-- CreateIndex
CREATE INDEX "invoices_client_id_issued_date_created_at_idx" ON "invoices"("client_id", "issued_date", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "site_expenses_voucher_number_key" ON "site_expenses"("voucher_number");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_transactions_voucher_number_key" ON "vendor_transactions"("voucher_number");

-- CreateIndex
CREATE INDEX "vendor_transactions_contact_id_date_created_at_idx" ON "vendor_transactions"("contact_id", "date", "created_at");

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_labour_entries" ADD CONSTRAINT "daily_labour_entries_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_client_payment_id_fkey" FOREIGN KEY ("client_payment_id") REFERENCES "client_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_payments" ADD CONSTRAINT "labour_payments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_line_items" ADD CONSTRAINT "boq_line_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "boq_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_payment_milestones" ADD CONSTRAINT "boq_payment_milestones_boq_id_fkey" FOREIGN KEY ("boq_id") REFERENCES "boqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_template_sections" ADD CONSTRAINT "boq_template_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "boq_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_template_sections" ADD CONSTRAINT "boq_template_sections_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "boq_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_template_line_items" ADD CONSTRAINT "boq_template_line_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "boq_template_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

