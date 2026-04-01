
-- Add trader-specific columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS services_description text,
ADD COLUMN IF NOT EXISTS service_radius_miles integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS years_experience integer,
ADD COLUMN IF NOT EXISTS trade_bodies text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Create a public view for marketplace trader cards (no PII)
CREATE OR REPLACE VIEW public.trader_profiles_public
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.full_name,
  p.company_name,
  p.trade_specialism,
  p.rating,
  p.services_description,
  p.service_radius_miles,
  p.cover_image_url,
  p.website_url,
  p.years_experience,
  p.trade_bodies,
  p.verified,
  p.created_at
FROM public.profiles p
WHERE p.is_active = true
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'trade'
  );

-- Allow public read of profiles for marketplace (view uses security_invoker so RLS applies)
-- We need a SELECT policy that allows reading trader profiles publicly
CREATE POLICY "public can view active trader profiles"
ON public.profiles
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = id AND ur.role = 'trade'
  )
);

-- Allow authenticated users to insert roles during signup
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
