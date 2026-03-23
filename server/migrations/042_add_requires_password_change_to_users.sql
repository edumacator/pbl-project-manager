-- Add requires_password_change column to users table
ALTER TABLE users 
ADD COLUMN requires_password_change TINYINT(1) NOT NULL DEFAULT 1 AFTER role;

-- Mark all existing users as NOT requiring a password change to avoid breaking their current sessions
UPDATE users SET requires_password_change = 0;
