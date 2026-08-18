-- CreateTable
CREATE TABLE "wage_rate_presets" (
    "id" TEXT NOT NULL,
    "workerType" "WorkerType" NOT NULL,
    "default_rate" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wage_rate_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_labour_entries" (
    "id" TEXT NOT NULL,
    "voucher_number" VARCHAR(20) NOT NULL,
    "project_id" TEXT NOT NULL,
    "worker_type" "WorkerType" NOT NULL,
    "date" DATE NOT NULL,
    "headcount" INTEGER NOT NULL,
    "wage_rate" DECIMAL(10,2) NOT NULL,
    "brought_by" VARCHAR(255),
    "title" VARCHAR(255),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_labour_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wage_rate_presets_workerType_key" ON "wage_rate_presets"("workerType");

-- CreateIndex
CREATE UNIQUE INDEX "daily_labour_entries_voucher_number_key" ON "daily_labour_entries"("voucher_number");

-- CreateIndex
CREATE INDEX "daily_labour_entries_project_id_date_idx" ON "daily_labour_entries"("project_id", "date");

-- CreateIndex
CREATE INDEX "daily_labour_entries_worker_type_date_idx" ON "daily_labour_entries"("worker_type", "date");

-- CreateIndex
CREATE INDEX "daily_labour_entries_date_idx" ON "daily_labour_entries"("date");

-- AddForeignKey
ALTER TABLE "daily_labour_entries" ADD CONSTRAINT "daily_labour_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

