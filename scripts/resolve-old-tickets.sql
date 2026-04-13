-- Update specific tickets to RESOLVED status
UPDATE "Ticket" 
SET 
  status = 'RESOLVED', 
  "resolvedAt" = NOW(), 
  "rootCause" = 'Cleanup SLA Breach',
  "solution" = 'Resolved via bulk maintenance cleanup'
WHERE "ticketNumber" IN (
  'TKT-20260412-0003', 
  'TKT-20260411-0009', 
  'TKT-20260411-0007', 
  'TKT-20260411-0004'
) AND status != 'RESOLVED';

-- Also find any other MAINTENANCE tickets from before today that might still be open
UPDATE "Ticket"
SET 
  status = 'RESOLVED', 
  "resolvedAt" = NOW(),
  "rootCause" = 'Inactivity cleanup',
  "solution" = 'System auto-resolve for old maintenance tickets'
WHERE category = 'MAINTENANCE' 
  AND status != 'RESOLVED' 
  AND status != 'CLOSED'
  AND "createdAt" < CURRENT_DATE;
