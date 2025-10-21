-- Create cron job to reset weekly bookings every Monday at 00:00
SELECT cron.schedule(
  'reset-weekly-bookings',
  '0 0 * * 1', -- Every Monday at midnight (0 0 * * 1)
  $$
  SELECT
    net.http_post(
        url:='https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/reset-weekly-bookings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);