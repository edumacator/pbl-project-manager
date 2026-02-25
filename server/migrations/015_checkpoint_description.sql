ALTER TABLE checkpoints
ADD COLUMN description TEXT NULL
AFTER title;