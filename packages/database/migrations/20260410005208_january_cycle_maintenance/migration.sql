-- AlterTable
ALTER TABLE "MaintenanceSchedule" ADD COLUMN     "anchorDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "anchorMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastMaintainedAt" TIMESTAMP(3),
ADD COLUMN     "lastMaintenanceTicketId" TEXT,
ADD COLUMN     "reminderEveryMonths" INTEGER NOT NULL DEFAULT 3;
