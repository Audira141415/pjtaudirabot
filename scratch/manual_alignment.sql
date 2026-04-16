ALTER TYPE "TicketCategory" ADD VALUE 'FULFILLMENT';
ALTER TYPE "TicketCategory" ADD VALUE 'VAM';
ALTER TYPE "TicketCategory" ADD VALUE 'HELPDESK';
ALTER TYPE "TicketCategory" ADD VALUE 'SMARTHAND';
ALTER TYPE "TicketCategory" ADD VALUE 'INVENTORY';
ALTER TYPE "TicketCategory" ADD VALUE 'REPORTING';
ALTER TYPE "TicketCategory" ADD VALUE 'ADDITIONAL_SERVICE';
ALTER TYPE "TicketCategory" ADD VALUE 'AVAILABILITY';

ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "clusterMasterId";

-- Ensure columns exist and have correct types (safe if they already exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Ticket' AND column_name='syncAttemptCount') THEN
        ALTER TABLE "Ticket" ADD COLUMN "syncAttemptCount" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Ticket' AND column_name='telegramNotified') THEN
        ALTER TABLE "Ticket" ADD COLUMN "telegramNotified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
