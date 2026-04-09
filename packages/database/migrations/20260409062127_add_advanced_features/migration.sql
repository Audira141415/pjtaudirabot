-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('GREETING', 'AWAY', 'QUICK_REPLY', 'NOTIFICATION', 'FOLLOW_UP', 'CLOSING', 'PROMOTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('AGENT', 'SENIOR_AGENT', 'SUPERVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'AWAY', 'ON_BREAK');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "WebhookLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'XLSX', 'PDF', 'JSON');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ALL',
    "language" TEXT NOT NULL DEFAULT 'id',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotFlow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerKeyword" TEXT,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CSATSurvey" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "contactId" TEXT,
    "platform" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "agentId" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSATSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "role" "AgentRole" NOT NULL DEFAULT 'AGENT',
    "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE',
    "department" TEXT,
    "maxConcurrent" INTEGER NOT NULL DEFAULT 5,
    "activeTickets" INTEGER NOT NULL DEFAULT 0,
    "totalResolved" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" INTEGER,
    "rating" DOUBLE PRECISION,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "description" TEXT,
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMDeal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contactId" TEXT,
    "contactName" TEXT,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "stage" "DealStage" NOT NULL DEFAULT 'LEAD',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expectedClose" TIMESTAMP(3),
    "assignedTo" TEXT,
    "notes" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "lostReason" TEXT,
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT,
    "category" TEXT,
    "uploadedBy" TEXT,
    "platform" TEXT,
    "messageId" TEXT,
    "thumbnailUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedResponse" (
    "id" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CannedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "requestHeaders" JSONB,
    "requestBody" JSONB,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "duration" INTEGER,
    "status" "WebhookLogStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "totalRows" INTEGER,
    "error" TEXT,
    "requestedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerEvent" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "channels" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'id',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "notifications" JSONB NOT NULL DEFAULT '{}',
    "dashboardLayout" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageTemplate_category_idx" ON "MessageTemplate"("category");

-- CreateIndex
CREATE INDEX "MessageTemplate_platform_idx" ON "MessageTemplate"("platform");

-- CreateIndex
CREATE INDEX "MessageTemplate_isActive_idx" ON "MessageTemplate"("isActive");

-- CreateIndex
CREATE INDEX "ChatbotFlow_isActive_idx" ON "ChatbotFlow"("isActive");

-- CreateIndex
CREATE INDEX "ChatbotFlow_triggerKeyword_idx" ON "ChatbotFlow"("triggerKeyword");

-- CreateIndex
CREATE INDEX "CSATSurvey_ticketId_idx" ON "CSATSurvey"("ticketId");

-- CreateIndex
CREATE INDEX "CSATSurvey_agentId_idx" ON "CSATSurvey"("agentId");

-- CreateIndex
CREATE INDEX "CSATSurvey_rating_idx" ON "CSATSurvey"("rating");

-- CreateIndex
CREATE INDEX "CSATSurvey_respondedAt_idx" ON "CSATSurvey"("respondedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_department_idx" ON "Agent"("department");

-- CreateIndex
CREATE INDEX "Agent_role_idx" ON "Agent"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_category_idx" ON "Tag"("category");

-- CreateIndex
CREATE INDEX "Tag_usageCount_idx" ON "Tag"("usageCount");

-- CreateIndex
CREATE INDEX "CRMDeal_stage_idx" ON "CRMDeal"("stage");

-- CreateIndex
CREATE INDEX "CRMDeal_assignedTo_idx" ON "CRMDeal"("assignedTo");

-- CreateIndex
CREATE INDEX "CRMDeal_contactId_idx" ON "CRMDeal"("contactId");

-- CreateIndex
CREATE INDEX "ManagedFile_category_idx" ON "ManagedFile"("category");

-- CreateIndex
CREATE INDEX "ManagedFile_mimeType_idx" ON "ManagedFile"("mimeType");

-- CreateIndex
CREATE INDEX "ManagedFile_uploadedBy_idx" ON "ManagedFile"("uploadedBy");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CannedResponse_shortcut_key" ON "CannedResponse"("shortcut");

-- CreateIndex
CREATE INDEX "CannedResponse_shortcut_idx" ON "CannedResponse"("shortcut");

-- CreateIndex
CREATE INDEX "CannedResponse_category_idx" ON "CannedResponse"("category");

-- CreateIndex
CREATE INDEX "CannedResponse_isActive_idx" ON "CannedResponse"("isActive");

-- CreateIndex
CREATE INDEX "WebhookLog_webhookId_idx" ON "WebhookLog"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookLog_status_idx" ON "WebhookLog"("status");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "ExportJob_module_idx" ON "ExportJob"("module");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

-- CreateIndex
CREATE INDEX "ExportJob_requestedBy_idx" ON "ExportJob"("requestedBy");

-- CreateIndex
CREATE INDEX "NotificationRule_triggerEvent_idx" ON "NotificationRule"("triggerEvent");

-- CreateIndex
CREATE INDEX "NotificationRule_isActive_idx" ON "NotificationRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_period_idx" ON "AnalyticsSnapshot"("period");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_period_date_key" ON "AnalyticsSnapshot"("period", "date");
