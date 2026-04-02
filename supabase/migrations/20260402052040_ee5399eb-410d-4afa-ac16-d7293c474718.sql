
-- 1. Fix: Customer addresses publicly readable — restrict to authenticated
DROP POLICY IF EXISTS "trades view posted jobs" ON public.jobs;
CREATE POLICY "trades view posted jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    status IN ('posted', 'quoted', 'awarded', 'active', 'completed')
  );

-- 2. Fix: Notification injection — restrict INSERT to admin or self-targeting
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = recipient_id
  );

-- 3. Fix: Delivery claim privilege escalation — require driver role
DROP POLICY IF EXISTS "drivers accept broadcast deliveries" ON public.deliveries;
CREATE POLICY "drivers accept broadcast deliveries" ON public.deliveries
  FOR UPDATE TO authenticated
  USING (
    (status = ANY (ARRAY['unassigned'::delivery_status, 'broadcast'::delivery_status]))
    AND driver_profile_id IS NULL
    AND has_role(auth.uid(), 'driver'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'driver'::app_role)
    AND driver_profile_id = auth.uid()
  );

-- 4. Fix: GL entries with NULL company readable by anyone
DROP POLICY IF EXISTS "trades manage own gl entries" ON public.gl_entries;
CREATE POLICY "trades manage own gl entries" ON public.gl_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trade_companies tc
      WHERE tc.id = gl_entries.trade_company_id AND tc.owner_profile_id = auth.uid()
    )
    OR (trade_company_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trade_companies tc
      WHERE tc.id = gl_entries.trade_company_id AND tc.owner_profile_id = auth.uid()
    )
  );

-- 5. Fix: Storage upload path enforcement
DROP POLICY IF EXISTS "Authenticated users can upload job evidence" ON storage.objects;
CREATE POLICY "Authenticated users can upload own job evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-evidence'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 6. Fix: Broken trader profile visibility policy
DROP POLICY IF EXISTS "public can view active trader profiles" ON public.profiles;
CREATE POLICY "public can view active trader profiles" ON public.profiles
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = profiles.id AND ur.role = 'trade'::app_role
    )
  );
