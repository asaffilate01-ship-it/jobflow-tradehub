-- Forward-only onboarding and notification security fix.
-- Stage this before shipping the matching signup UI. Never rewrite legacy
-- migrations or infer an authorised user role from mutable metadata on login.
BEGIN;

-- The existing auth.users trigger already calls handle_new_user(). Replace its
-- implementation without replacing the trigger or its historical identity.
-- User metadata is a one-time signup preference, never an authorisation claim.
-- Unknown/admin/staff requests are downgraded to the least privileged role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_requested text;
  v_initial_role public.app_role;
BEGIN
  v_requested := pg_catalog.lower(
    pg_catalog.btrim(COALESCE(NEW.raw_user_meta_data ->> 'role', 'customer'))
  );
  v_initial_role := CASE v_requested
    WHEN 'trade' THEN 'trade'::public.app_role
    WHEN 'driver' THEN 'driver'::public.app_role
    ELSE 'customer'::public.app_role
  END;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    pg_catalog.left(pg_catalog.btrim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), 200),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Roles are written in the same auth.users transaction, even when email
  -- confirmation means the browser has no session after signUp().
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_initial_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- A newly registered driver is NOT verified. Existing server checks must
  -- continue to require KYC approval and driver_profiles.verified.
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

-- Do not let a customer turn themselves into a trader or driver by adding a
-- role row through PostgREST. The existing admins-only role policy is kept.
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert allowed roles only" ON public.user_roles;

-- Restore safe access for signup accounts stranded without a role by the old
-- client-side role insert before email confirmation. Give *customer* only:
-- mutable legacy user_metadata is never sufficient to backfill trade/driver.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'customer'::public.app_role
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles AS r WHERE r.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Historic policy allowed any authenticated browser to forge notification
-- messages to any user. In-app messages must go through the authenticated
-- dispatch-notification Edge Function with service role and recipient checks.
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.notifications TO service_role;

-- Keep recipient-owned SELECT / read_at / DELETE policies intact.
COMMIT;
