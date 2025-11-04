-- Make user_id nullable for guest purchases
ALTER TABLE single_class_purchases 
ALTER COLUMN user_id DROP NOT NULL;