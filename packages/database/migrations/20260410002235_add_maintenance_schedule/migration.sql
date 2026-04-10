-- CreateTable
CREATE TABLE "MaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customer" TEXT,
    "location" TEXT,
    "ao" TEXT,
    "sid" TEXT,
    "service" TEXT,
    "hostnameSwitch" TEXT,
    "intervalMonths" INTEGER NOT NULL DEFAULT 3,
    "notifyDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "lastCreatedAt" TIMESTAMP(3),
    "lastTicketId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_nextDueDate_idx" ON "MaintenanceSchedule"("nextDueDate");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_isActive_idx" ON "MaintenanceSchedule"("isActive");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_createdById_idx" ON "MaintenanceSchedule"("createdById");

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
