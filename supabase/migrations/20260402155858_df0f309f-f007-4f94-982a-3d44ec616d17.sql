
-- Fix jobs policy (the profile one was already applied in previous migration)
DROP POLICY IF EXISTS "trades view posted jobs scoped" ON public.jobs;

CREATE POLICY "trades view posted jobs scoped"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  customer_profile_id = auth.uid()
  OR trade_company_id IN (
    SELECT id FROM trade_companies WHERE owner_profile_id = auth.uid()
  )
  OR id IN (
    SELECT q.job_id FROM quotes q
    JOIN trade_companies tc ON tc.id = q.trade_company_id
    WHERE tc.owner_profile_id = auth.uid()
  )
  OR status = 'posted'
);
