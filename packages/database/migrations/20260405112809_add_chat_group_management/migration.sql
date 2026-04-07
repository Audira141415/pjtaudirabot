-- CreateTable
CREATE TABLE "ChatGroup" (
    "id" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "description" TEXT,
    "groupPicture" TEXT,
    "isMonitored" BOOLEAN NOT NULL DEFAULT false,
    "isReportTarget" BOOLEAN NOT NULL DEFAULT false,
    "reportTypes" JSONB NOT NULL DEFAULT '[]',
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportGroupConfig" (
    "id" TEXT NOT NULL,
    "chatGroupId" TEXT NOT NULL,
    "enableDaily" BOOLEAN NOT NULL DEFAULT false,
    "enableWeekly" BOOLEAN NOT NULL DEFAULT false,
    "enableMonthly" BOOLEAN NOT NULL DEFAULT false,
    "dailyHour" INTEGER,
    "weeklyDay" INTEGER,
    "weeklyHour" INTEGER,
    "monthlyDay" INTEGER,
    "monthlyHour" INTEGER,
    "timezone" TEXT,
    "includeCharts" BOOLEAN NOT NULL DEFAULT true,
    "includeSummary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportGroupConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatGroup_groupJid_key" ON "ChatGroup"("groupJid");

-- CreateIndex
CREATE INDEX "ChatGroup_isMonitored_idx" ON "ChatGroup"("isMonitored");

-- CreateIndex
CREATE INDEX "ChatGroup_isReportTarget_idx" ON "ChatGroup"("isReportTarget");

-- CreateIndex
CREATE INDEX "ChatGroup_createdAt_idx" ON "ChatGroup"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportGroupConfig_chatGroupId_key" ON "ReportGroupConfig"("chatGroupId");

-- CreateIndex
CREATE INDEX "ReportGroupConfig_enableDaily_idx" ON "ReportGroupConfig"("enableDaily");

-- CreateIndex
CREATE INDEX "ReportGroupConfig_enableWeekly_idx" ON "ReportGroupConfig"("enableWeekly");

-- CreateIndex
CREATE INDEX "ReportGroupConfig_enableMonthly_idx" ON "ReportGroupConfig"("enableMonthly");

-- AddForeignKey
ALTER TABLE "ReportGroupConfig" ADD CONSTRAINT "ReportGroupConfig_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "ChatGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
