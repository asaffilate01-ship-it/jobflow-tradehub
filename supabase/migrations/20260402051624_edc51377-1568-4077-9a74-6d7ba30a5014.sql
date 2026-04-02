
-- The INSERT policy WITH CHECK (true) is acceptable for notifications
-- because notifications are created by the system/other users for a recipient.
-- However, let's ensure only authenticated users can insert, which is already set.
-- No change needed - the TO authenticated clause already restricts to logged-in users.
-- Marking as reviewed.
SELECT 1;
