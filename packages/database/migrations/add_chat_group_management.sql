-- Add ChatGroup and ReportGroupConfig tables for managing monitored groups and report delivery

CREATE TABLE IF NOT EXISTS "ChatGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "groupJid" TEXT NOT NULL UNIQUE,
  "groupName" TEXT NOT NULL,
  "description" TEXT,
  "groupPicture" TEXT,
  
  "isMonitored" BOOLEAN NOT NULL DEFAULT false,
  "isReportTarget" BOOLEAN NOT NULL DEFAULT false,
  "reportTypes" JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  "participantCount" INTEGER NOT NULL DEFAULT 0,
  "lastMessageAt" TIMESTAMP(3),
  
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ChatGroup_isMonitored_idx" ON "ChatGroup"("isMonitored");
CREATE INDEX IF NOT EXISTS "ChatGroup_isReportTarget_idx" ON "ChatGroup"("isReportTarget");
CREATE INDEX IF NOT EXISTS "ChatGroup_createdAt_idx" ON "ChatGroup"("createdAt");

CREATE TABLE IF NOT EXISTS "ReportGroupConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chatGroupId" TEXT NOT NULL UNIQUE,
  
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "ReportGroupConfig_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "ChatGroup" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReportGroupConfig_enableDaily_idx" ON "ReportGroupConfig"("enableDaily");
CREATE INDEX IF NOT EXISTS "ReportGroupConfig_enableWeekly_idx" ON "ReportGroupConfig"("enableWeekly");
CREATE INDEX IF NOT EXISTS "ReportGroupConfig_enableMonthly_idx" ON "ReportGroupConfig"("enableMonthly");
