-- CreateEnum
CREATE TYPE "SentimentType" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED');

-- CreateEnum
CREATE TYPE "ScheduledMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('MESSAGE', 'CALL', 'EMAIL', 'NOTE', 'MEETING', 'TICKET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutoModFeature" AS ENUM ('SPAM_DETECTION', 'PROFANITY_FILTER', 'LINK_FILTER', 'CAPS_DETECTION', 'INVITE_FILTER', 'MEDIA_FILTER', 'NEW_MEMBER_RESTRICT');

-- CreateTable
CREATE TABLE "SentimentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "platform" "Platform",
    "message" TEXT NOT NULL,
    "sentiment" "SentimentType" NOT NULL DEFAULT 'NEUTRAL',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emotions" JSONB NOT NULL DEFAULT '{}',
    "language" TEXT,
    "groupId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentimentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledMessage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetPlatform" "Platform",
    "targetGroupId" TEXT,
    "targetUserId" TEXT,
    "schedule" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "status" "ScheduledMessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "targetPlatform" "Platform",
    "targetSegment" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "position" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "segment" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "lastInteractionAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMInteraction" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "channel" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "sentiment" "SentimentType",
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CRMInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "contactId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "description" TEXT,
    "invoiceNumber" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "fromUserId" TEXT,
    "fromName" TEXT NOT NULL,
    "fromNumber" TEXT,
    "groupId" TEXT,
    "groupName" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "replyTo" TEXT,
    "sentiment" "SentimentType",
    "tags" JSONB NOT NULL DEFAULT '[]',
    "assignedTo" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoModConfig" (
    "id" TEXT NOT NULL,
    "feature" "AutoModFeature" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "action" "ModerationAction" NOT NULL DEFAULT 'WARN',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoModConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentimentLog_sentiment_idx" ON "SentimentLog"("sentiment");

-- CreateIndex
CREATE INDEX "SentimentLog_userId_idx" ON "SentimentLog"("userId");

-- CreateIndex
CREATE INDEX "SentimentLog_createdAt_idx" ON "SentimentLog"("createdAt");

-- CreateIndex
CREATE INDEX "SentimentLog_platform_idx" ON "SentimentLog"("platform");

-- CreateIndex
CREATE INDEX "ScheduledMessage_status_idx" ON "ScheduledMessage"("status");

-- CreateIndex
CREATE INDEX "ScheduledMessage_scheduledAt_idx" ON "ScheduledMessage"("scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledMessage_createdBy_idx" ON "ScheduledMessage"("createdBy");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "CRMContact_segment_idx" ON "CRMContact"("segment");

-- CreateIndex
CREATE INDEX "CRMContact_score_idx" ON "CRMContact"("score");

-- CreateIndex
CREATE INDEX "CRMContact_createdAt_idx" ON "CRMContact"("createdAt");

-- CreateIndex
CREATE INDEX "CRMInteraction_contactId_idx" ON "CRMInteraction"("contactId");

-- CreateIndex
CREATE INDEX "CRMInteraction_type_idx" ON "CRMInteraction"("type");

-- CreateIndex
CREATE INDEX "CRMInteraction_createdAt_idx" ON "CRMInteraction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionId_key" ON "PaymentTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_contactId_idx" ON "PaymentTransaction"("contactId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "InboxMessage_platform_idx" ON "InboxMessage"("platform");

-- CreateIndex
CREATE INDEX "InboxMessage_fromUserId_idx" ON "InboxMessage"("fromUserId");

-- CreateIndex
CREATE INDEX "InboxMessage_isRead_idx" ON "InboxMessage"("isRead");

-- CreateIndex
CREATE INDEX "InboxMessage_isStarred_idx" ON "InboxMessage"("isStarred");

-- CreateIndex
CREATE INDEX "InboxMessage_isArchived_idx" ON "InboxMessage"("isArchived");

-- CreateIndex
CREATE INDEX "InboxMessage_createdAt_idx" ON "InboxMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutoModConfig_feature_key" ON "AutoModConfig"("feature");

-- CreateIndex
CREATE INDEX "FAQEntry_category_idx" ON "FAQEntry"("category");

-- CreateIndex
CREATE INDEX "FAQEntry_isActive_idx" ON "FAQEntry"("isActive");

-- CreateIndex
CREATE INDEX "FAQEntry_matchCount_idx" ON "FAQEntry"("matchCount");

-- AddForeignKey
ALTER TABLE "CRMInteraction" ADD CONSTRAINT "CRMInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
