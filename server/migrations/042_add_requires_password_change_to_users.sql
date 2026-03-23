-- Add requires_password_change column to users table
ALTER TABLE users 
ADD COLUMN requires_password_change TINYINT(1) NOT NULL DEFAULT 1 AFTER role;

-- Mark all existing users as requiring a password change, EXCEPT the admin
UPDATE users SET requires_password_change = 1 WHERE email != 'kents@fultonschools.org';
UPDATE users SET requires_password_change = 0 WHERE email = 'kents@fultonschools.org';
