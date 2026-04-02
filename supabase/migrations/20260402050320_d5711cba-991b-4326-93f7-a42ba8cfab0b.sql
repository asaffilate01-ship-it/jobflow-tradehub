
-- 1. Fix the dangerous "Users can insert own role" policy
-- Drop the old permissive policy that allows any role
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- Create a restricted policy: users can only assign customer, trade, or driver to themselves
CREATE POLICY "Users can insert allowed roles only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('customer'::app_role, 'trade'::app_role, 'driver'::app_role)
);

-- 2. Add kyc_status and phone_verified to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- 3. Add constraint for valid kyc_status values via trigger
CREATE OR REPLACE FUNCTION public.validate_kyc_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kyc_status NOT IN ('pending', 'submitted', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid kyc_status value: %', NEW.kyc_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_kyc_status_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_kyc_status();
