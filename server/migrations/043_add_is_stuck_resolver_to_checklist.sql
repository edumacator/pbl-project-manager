-- Add is_stuck_resolver column to task_checklist_items
ALTER TABLE task_checklist_items 
ADD COLUMN is_stuck_resolver TINYINT(1) DEFAULT 0 AFTER sort_order;
