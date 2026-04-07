-- CreateEnum
CREATE TYPE "UptimeCheckType" AS ENUM ('PING', 'TCP', 'HTTP', 'HTTPS');

-- CreateEnum
CREATE TYPE "UptimeStatus" AS ENUM ('UP', 'DOWN', 'DEGRADED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "UptimeTarget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER,
    "checkType" "UptimeCheckType" NOT NULL DEFAULT 'PING',
    "intervalSec" INTEGER NOT NULL DEFAULT 60,
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "retries" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "UptimeStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckAt" TIMESTAMP(3),
    "lastUpAt" TIMESTAMP(3),
    "lastDownAt" TIMESTAMP(3),
    "consecutiveFails" INTEGER NOT NULL DEFAULT 0,
    "uptimePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "autoTicket" BOOLEAN NOT NULL DEFAULT true,
    "lastTicketId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UptimeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UptimeCheck" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "UptimeStatus" NOT NULL,
    "responseMs" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UptimeCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL,
    "shiftLabel" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openTickets" INTEGER NOT NULL DEFAULT 0,
    "slaDueSoon" INTEGER NOT NULL DEFAULT 0,
    "slaBreached" INTEGER NOT NULL DEFAULT 0,
    "pendingTasks" INTEGER NOT NULL DEFAULT 0,
    "activeIncidents" INTEGER NOT NULL DEFAULT 0,
    "criticalAlerts" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "actionItems" JSONB NOT NULL DEFAULT '[]',
    "deliveredTo" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UptimeTarget_name_key" ON "UptimeTarget"("name");

-- CreateIndex
CREATE INDEX "UptimeTarget_status_idx" ON "UptimeTarget"("status");

-- CreateIndex
CREATE INDEX "UptimeTarget_isActive_idx" ON "UptimeTarget"("isActive");

-- CreateIndex
CREATE INDEX "UptimeTarget_host_idx" ON "UptimeTarget"("host");

-- CreateIndex
CREATE INDEX "UptimeCheck_targetId_idx" ON "UptimeCheck"("targetId");

-- CreateIndex
CREATE INDEX "UptimeCheck_status_idx" ON "UptimeCheck"("status");

-- CreateIndex
CREATE INDEX "UptimeCheck_checkedAt_idx" ON "UptimeCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "ShiftHandover_shiftDate_idx" ON "ShiftHandover"("shiftDate");

-- CreateIndex
CREATE INDEX "ShiftHandover_shiftLabel_idx" ON "ShiftHandover"("shiftLabel");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftHandover_shiftLabel_shiftDate_key" ON "ShiftHandover"("shiftLabel", "shiftDate");

-- AddForeignKey
ALTER TABLE "UptimeCheck" ADD CONSTRAINT "UptimeCheck_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "UptimeTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
