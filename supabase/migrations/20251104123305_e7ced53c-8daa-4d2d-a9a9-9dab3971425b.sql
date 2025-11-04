-- Add reminder_sent field to class_bookings to track if 1-hour reminder was sent
ALTER TABLE class_bookings 
ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;