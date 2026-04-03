
-- 1. Fix profiles PII exposure: drop the broad public policy
DROP POLICY IF EXISTS "public can view safe trader profile fields" ON public.profiles;

-- 2. Fix user_roles privilege escalation: remove driver from self-assignable roles
DROP POLICY IF EXISTS "Users can insert allowed roles only" ON public.user_roles;
CREATE POLICY "Users can insert allowed roles only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (role = ANY (ARRAY['customer'::app_role, 'trade'::app_role]))
);

-- 3. Fix delivery acceptance: require verified driver profile
DROP POLICY IF EXISTS "drivers accept broadcast deliveries" ON public.deliveries;
CREATE POLICY "drivers accept broadcast deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  (status = ANY (ARRAY['unassigned'::delivery_status, 'broadcast'::delivery_status]))
  AND (driver_profile_id IS NULL)
  AND has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.profile_id = auth.uid() AND dp.verified = true
  )
)
WITH CHECK (
  has_role(auth.uid(), 'driver'::app_role)
  AND (driver_profile_id = auth.uid())
);

-- 4. Fix reviews INSERT: require reviewer to be the job customer
DROP POLICY IF EXISTS "Users can create reviews for their jobs" ON public.reviews;
CREATE POLICY "Users can create reviews for their jobs"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = reviews.job_id
      AND j.customer_profile_id = auth.uid()
  )
);

-- 5. Fix audit log tampering: remove user insert policy
DROP POLICY IF EXISTS "users insert own audit logs" ON public.audit_logs;

-- 6. Fix job-evidence storage: make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'job-evidence';

-- Remove the open SELECT policy
DROP POLICY IF EXISTS "Anyone can view job evidence" ON storage.objects;

-- Add scoped SELECT policy for authenticated users (uploader or job parties)
CREATE POLICY "Authenticated users view own job evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-evidence'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
