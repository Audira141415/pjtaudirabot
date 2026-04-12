DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClusterStatus') THEN
    CREATE TYPE "ClusterStatus" AS ENUM (
      'OPEN',
      'ESCALATED',
      'IN_RESOLUTION',
      'RESOLVED',
      'CLOSED',
      'FALSE_POSITIVE'
    );
  END IF;
END
$$;

ALTER TABLE "TicketCluster"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "TicketCluster"
  ALTER COLUMN "status" TYPE "ClusterStatus" USING "status"::"ClusterStatus";

ALTER TABLE "TicketCluster"
  ALTER COLUMN "status" SET DEFAULT 'OPEN'::"ClusterStatus";
