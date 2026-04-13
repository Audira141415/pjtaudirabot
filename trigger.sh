docker exec pjtaudi-db psql -U pjtaudi -d pjtaudi -c "UPDATE \"MaintenanceSchedule\" SET \"nextDueDate\" = CURRENT_DATE WHERE title = 'PAC';"
docker restart pjtaudi-whatsapp
