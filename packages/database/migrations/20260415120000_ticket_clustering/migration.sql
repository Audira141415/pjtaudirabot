-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "clusterMasterId" TEXT;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClusterStatus') THEN
        CREATE TYPE "ClusterStatus" AS ENUM ('OPEN', 'ESCALATED', 'IN_RESOLUTION', 'RESOLVED', 'CLOSED', 'FALSE_POSITIVE');
    END IF;
END
$$;

-- CreateTable
CREATE TABLE "TicketCluster" (
    "id" TEXT NOT NULL,
    "clusterNumber" TEXT NOT NULL,
    "masterTicketId" TEXT NOT NULL,
    "commonLocation" TEXT,
    "commonCustomer" TEXT,
    "commonService" TEXT,
    "commonProblem" TEXT,
    "affectedAssets" JSONB NOT NULL DEFAULT '[]',
    "status" "ClusterStatus" NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "impactScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "affectedTicketCount" INTEGER NOT NULL DEFAULT 1,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cascadeOnResolve" BOOLEAN NOT NULL DEFAULT true,
    "resolutionAlias" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketClusterMember" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchingFactors" JSONB NOT NULL DEFAULT '[]',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketClusterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketClusterHistory" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "changedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketClusterHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketCluster_clusterNumber_key" ON "TicketCluster"("clusterNumber");

-- CreateIndex
CREATE INDEX "TicketCluster_status_idx" ON "TicketCluster"("status");

-- CreateIndex
CREATE INDEX "TicketCluster_severity_idx" ON "TicketCluster"("severity");

-- CreateIndex
CREATE INDEX "TicketCluster_masterTicketId_idx" ON "TicketCluster"("masterTicketId");

-- CreateIndex
CREATE INDEX "TicketCluster_detectedAt_idx" ON "TicketCluster"("detectedAt");

-- CreateIndex
CREATE INDEX "TicketCluster_createdAt_idx" ON "TicketCluster"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketClusterMember_clusterId_ticketId_key" ON "TicketClusterMember"("clusterId", "ticketId");

-- CreateIndex
CREATE INDEX "TicketClusterMember_clusterId_idx" ON "TicketClusterMember"("clusterId");

-- CreateIndex
CREATE INDEX "TicketClusterMember_ticketId_idx" ON "TicketClusterMember"("ticketId");

-- CreateIndex
CREATE INDEX "TicketClusterHistory_clusterId_idx" ON "TicketClusterHistory"("clusterId");

-- CreateIndex
CREATE INDEX "TicketClusterHistory_createdAt_idx" ON "TicketClusterHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "TicketCluster" ADD CONSTRAINT "TicketCluster_masterTicketId_fkey" FOREIGN KEY ("masterTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketClusterMember" ADD CONSTRAINT "TicketClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "TicketCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketClusterMember" ADD CONSTRAINT "TicketClusterMember_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketClusterHistory" ADD CONSTRAINT "TicketClusterHistory_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "TicketCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
