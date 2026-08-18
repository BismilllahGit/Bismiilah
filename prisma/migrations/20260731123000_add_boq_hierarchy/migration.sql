-- CreateEnum
CREATE TYPE "BOQStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BOQLineType" AS ENUM ('CALCULATED', 'LUMP_SUM');

-- CreateTable
CREATE TABLE "boqs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "BOQStatus" NOT NULL DEFAULT 'DRAFT',
    "target_budget" DECIMAL(14,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "boqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_groups" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boq_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_sections" (
    "id" TEXT NOT NULL,
    "boq_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "group_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boq_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_categories" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_line_items" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "line_type" "BOQLineType" NOT NULL DEFAULT 'CALCULATED',
    "quantity" DECIMAL(12,2),
    "unit" VARCHAR(50),
    "rate" DECIMAL(10,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "grade" "ItemGrade",
    "item_id" TEXT,
    "worker_type_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boq_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "boqs_project_id_version_number_idx" ON "boqs"("project_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "boq_groups_name_key" ON "boq_groups"("name");

-- CreateIndex
CREATE INDEX "boq_sections_boq_id_idx" ON "boq_sections"("boq_id");

-- CreateIndex
CREATE INDEX "boq_sections_group_id_idx" ON "boq_sections"("group_id");

-- CreateIndex
CREATE INDEX "boq_categories_section_id_idx" ON "boq_categories"("section_id");

-- CreateIndex
CREATE INDEX "boq_line_items_category_id_idx" ON "boq_line_items"("category_id");

-- AddForeignKey
ALTER TABLE "boqs" ADD CONSTRAINT "boqs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_sections" ADD CONSTRAINT "boq_sections_boq_id_fkey" FOREIGN KEY ("boq_id") REFERENCES "boqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_sections" ADD CONSTRAINT "boq_sections_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "boq_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_categories" ADD CONSTRAINT "boq_categories_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "boq_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_line_items" ADD CONSTRAINT "boq_line_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "boq_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_line_items" ADD CONSTRAINT "boq_line_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_line_items" ADD CONSTRAINT "boq_line_items_worker_type_id_fkey" FOREIGN KEY ("worker_type_id") REFERENCES "worker_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

