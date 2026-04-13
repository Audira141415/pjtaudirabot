SELECT m.filename, m.category, m."maintenanceScheduleId", s.title as schedule_title, s."lastTicketId"
FROM "ManagedFile" m
LEFT JOIN "MaintenanceSchedule" s ON m."maintenanceScheduleId" = s.id
WHERE m."maintenanceScheduleId" IS NOT NULL;
