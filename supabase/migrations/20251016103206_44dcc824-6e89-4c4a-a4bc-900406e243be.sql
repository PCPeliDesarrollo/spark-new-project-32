-- Remove duplicate role entries for users
-- Keep only one role per user (prioritizing admin, then vip, then standard)
DELETE FROM user_roles
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id 
             ORDER BY 
               CASE role 
                 WHEN 'admin' THEN 1
                 WHEN 'vip' THEN 2
                 WHEN 'standard' THEN 3
               END
           ) as rn
    FROM user_roles
  ) sub
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);