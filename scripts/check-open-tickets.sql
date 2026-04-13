SELECT "ticketNumber", status, category, "createdAt" 
FROM "Ticket" 
WHERE status != 'RESOLVED' AND status != 'CLOSED'
ORDER BY "createdAt" DESC 
LIMIT 10;
