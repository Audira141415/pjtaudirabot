-- Grant admin role to all users currently in the DB to ensure testing can proceed
UPDATE "User" SET role = 'admin' WHERE role != 'admin';
