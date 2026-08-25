-- Intentionally retained as a no-op migration marker.
--
-- The Repair Assist schema was originally applied by Lovable as migration
-- 20260824221602_75248a38-3b14-48fc-90b8-6c87fdaf6b58.sql. A second copy with
-- this earlier version number was committed afterwards. Keeping both schema
-- bodies makes fresh databases fail with duplicate objects, while deleting the
-- marker can make environments that recorded this version report divergent
-- history. The canonical schema remains in 20260824221602; forward-only fixes
-- are applied by 20260825090000_repair_marketplace_hardening.sql.
SELECT 1;
