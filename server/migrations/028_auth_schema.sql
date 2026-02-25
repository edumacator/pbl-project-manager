-- Migration 028: Add authentication fields to users table
ALTER TABLE users
ADD COLUMN first_name VARCHAR(100)
AFTER id,
    ADD COLUMN last_name VARCHAR(100)
AFTER first_name,
    ADD COLUMN password_hash VARCHAR(255)
AFTER email,
    ADD COLUMN auth_token VARCHAR(255)
AFTER password_hash;
-- Migrate existing 'name' column data to 'first_name' temporarily
-- For MVP, we just split on the first space.
UPDATE users
SET first_name = SUBSTRING_INDEX(name, ' ', 1),
    last_name = IF(
        LOCATE(' ', name) > 0,
        SUBSTRING(name, LOCATE(' ', name) + 1),
        ''
    );
-- We keep the 'name' column for now to avoid breaking existing queries, but we will transition to first_name/last_name.
-- Actually, the request said: "Each user should have first and last name, email as their login and password."
-- Let's drop 'name' later or keep it as a computed field/app-level concat for now, but we'll use first_name and last_name going forward.
-- For safety, we keep name in DB but don't strictly require it going forward if we update everything.