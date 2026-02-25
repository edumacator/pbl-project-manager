ALTER TABLE team_members
ADD COLUMN role ENUM('lead', 'member', 'scribe') DEFAULT 'member';