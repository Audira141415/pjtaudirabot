-- AlterTable
ALTER TABLE "MaintenanceSchedule" ADD COLUMN     "lastCompletionNote" TEXT;

-- AlterTable
ALTER TABLE "ManagedFile" ADD COLUMN     "maintenanceScheduleId" TEXT,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "ManagedFile_maintenanceScheduleId_idx" ON "ManagedFile"("maintenanceScheduleId");

-- AddForeignKey
ALTER TABLE "ManagedFile" ADD CONSTRAINT "ManagedFile_maintenanceScheduleId_fkey" FOREIGN KEY ("maintenanceScheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
