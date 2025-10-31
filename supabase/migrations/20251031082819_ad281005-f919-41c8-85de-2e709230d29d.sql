-- Programar la función check-renewals para ejecutarse diariamente a las 8:00 AM
SELECT cron.schedule(
  'check-renewals-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/check-renewals',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);