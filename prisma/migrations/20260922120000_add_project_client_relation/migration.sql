-- AlterTable
ALTER TABLE "projects" ADD COLUMN "client_id" TEXT;

-- CreateIndex
CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
