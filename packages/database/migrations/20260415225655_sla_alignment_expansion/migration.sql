/*
  Warnings:

  - You are about to drop the column `clusterMasterId` on the `Ticket` table. All the data in the column will be lost.
  - The `severity` column on the `TicketCluster` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketCategory" ADD VALUE 'FULFILLMENT';
ALTER TYPE "TicketCategory" ADD VALUE 'VAM';
ALTER TYPE "TicketCategory" ADD VALUE 'HELPDESK';
ALTER TYPE "TicketCategory" ADD VALUE 'SMARTHAND';
ALTER TYPE "TicketCategory" ADD VALUE 'INVENTORY';
ALTER TYPE "TicketCategory" ADD VALUE 'REPORTING';
ALTER TYPE "TicketCategory" ADD VALUE 'ADDITIONAL_SERVICE';
ALTER TYPE "TicketCategory" ADD VALUE 'AVAILABILITY';

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "clusterMasterId",
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "syncAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telegramNotified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TicketCluster" DROP COLUMN "severity",
ADD COLUMN     "severity" "TicketPriority" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "TicketCluster_severity_idx" ON "TicketCluster"("severity");
