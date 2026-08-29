-- 1. Fix tautological RLS join predicates (a.job_id = a.job_id)
DROP POLICY IF EXISTS "repair parties view dokuvera link" ON public.dokuvera_case_links;
CREATE POLICY "repair parties view dokuvera link"
ON public.dokuvera_case_links FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = dokuvera_case_links.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.job_awards a
    JOIN public.trade_companies tc ON tc.id = a.trade_company_id
    WHERE a.job_id = dokuvera_case_links.job_id AND tc.owner_profile_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "repair parties view diagnoses" ON public.repair_diagnoses;
CREATE POLICY "repair parties view diagnoses"
ON public.repair_diagnoses FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = repair_diagnoses.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.repair_dispatch_invites i
    JOIN public.trade_companies tc ON tc.id = i.trade_company_id
    WHERE i.job_id = repair_diagnoses.job_id AND tc.owner_profile_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "awarded trades view safe repair media metadata" ON public.repair_intake_media;
CREATE POLICY "awarded trades view safe repair media metadata"
ON public.repair_intake_media FOR SELECT TO authenticated
USING (
  redaction_status = 'safe'
  AND EXISTS (
    SELECT 1 FROM public.job_awards a
    JOIN public.trade_companies tc ON tc.id = a.trade_company_id
    WHERE a.job_id = repair_intake_media.job_id AND tc.owner_profile_id = auth.uid()
  )
);

-- 2. Scope broadcast reads to the channel audience
DROP POLICY IF EXISTS "Authenticated users read broadcasts" ON public.broadcast_messages;
CREATE POLICY "Authenticated users read broadcasts"
ON public.broadcast_messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.broadcast_channels c
    WHERE c.id = broadcast_messages.channel_id
      AND (
        c.audience_role = 'all'
        OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = c.audience_role)
      )
  )
);

-- 3. Trigger functions must not be callable through the API
REVOKE ALL ON FUNCTION public.enforce_subscribed_repair_provider() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_trade_repair_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_source_product_award() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_marketplace_visibility() FROM PUBLIC, anon, authenticated;

-- 4. Replace SECURITY DEFINER views with SECURITY INVOKER views over
--    RLS-protected, PII-free data.
CREATE TABLE IF NOT EXISTS public.trader_public_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text,
  company_name text,
  trade_specialism trade_type,
  rating numeric NOT NULL DEFAULT 0,
  review_count bigint NOT NULL DEFAULT 0,
  services_description text,
  service_radius_miles integer,
  cover_image_url text,
  website_url text,
  years_experience integer,
  trade_bodies text[] NOT NULL DEFAULT '{}',
  verified boolean NOT NULL DEFAULT false,
  languages text[] NOT NULL DEFAULT '{}',
  city text NOT NULL DEFAULT '',
  postcode_district text NOT NULL DEFAULT '',
  accepting_work boolean NOT NULL DEFAULT false,
  emergency_work boolean NOT NULL DEFAULT false,
  insurance_verified boolean NOT NULL DEFAULT false,
  credential text,
  completed_jobs bigint NOT NULL DEFAULT 0,
  response_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trader_public_profiles TO anon, authenticated;
GRANT ALL ON public.trader_public_profiles TO service_role;
ALTER TABLE public.trader_public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public trader listings readable" ON public.trader_public_profiles;
CREATE POLICY "public trader listings readable"
ON public.trader_public_profiles FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.refresh_trader_public_profile(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  p public.profiles;
  tc public.trade_companies;
  trp public.trade_repair_profiles;
  v_rating numeric := 0;
  v_reviews bigint := 0;
  v_completed bigint := 0;
  v_response integer;
BEGIN
  IF p_id IS NULL THEN RETURN; END IF;

  SELECT * INTO p FROM public.profiles WHERE id = p_id;
  IF p.id IS NULL
     OR NOT p.is_active OR NOT p.verified OR NOT p.marketplace_visible
     OR (p.marketplace_visible_until IS NOT NULL AND p.marketplace_visible_until <= now())
     OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p_id AND ur.role = 'trade'::app_role)
  THEN
    DELETE FROM public.trader_public_profiles WHERE id = p_id;
    RETURN;
  END IF;

  SELECT * INTO tc FROM public.trade_companies c
   WHERE c.owner_profile_id = p_id ORDER BY c.created_at LIMIT 1;

  IF tc.id IS NOT NULL THEN
    SELECT * INTO trp FROM public.trade_repair_profiles r
     WHERE r.trade_company_id = tc.id AND r.trade = p.trade_specialism
     ORDER BY r.updated_at DESC LIMIT 1;
  END IF;

  SELECT COALESCE(avg(rating)::numeric(3,2), 0), count(*)
    INTO v_rating, v_reviews
    FROM public.reviews WHERE trader_profile_id = p_id AND verified_job = true;

  SELECT count(DISTINCT CASE WHEN j.status = 'completed'::job_status THEN j.id END),
         round(avg(EXTRACT(epoch FROM q.created_at - j.created_at) / 60::numeric))::integer
    INTO v_completed, v_response
    FROM public.trade_companies c
    LEFT JOIN public.quotes q ON q.trade_company_id = c.id
    LEFT JOIN public.jobs j ON j.id = q.job_id
   WHERE c.owner_profile_id = p_id;

  INSERT INTO public.trader_public_profiles (
    id, full_name, company_name, trade_specialism, rating, review_count, services_description,
    service_radius_miles, cover_image_url, website_url, years_experience, trade_bodies, verified,
    languages, city, postcode_district, accepting_work, emergency_work, insurance_verified,
    credential, completed_jobs, response_minutes, created_at
  ) VALUES (
    p.id, p.full_name, p.company_name, p.trade_specialism, v_rating, v_reviews, p.services_description,
    p.service_radius_miles, p.cover_image_url, p.website_url, p.years_experience,
    COALESCE(p.trade_bodies, '{}'), p.verified, COALESCE(p.languages, '{}'),
    COALESCE(tc.city, ''), upper(split_part(COALESCE(tc.postcode, ''), ' ', 1)),
    COALESCE(trp.available, false), COALESCE(trp.emergency_work, false), COALESCE(trp.insurance_verified, false),
    CASE WHEN trp.credential_verified THEN trp.credential_type END,
    COALESCE(v_completed, 0), v_response, p.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    trade_specialism = EXCLUDED.trade_specialism,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    services_description = EXCLUDED.services_description,
    service_radius_miles = EXCLUDED.service_radius_miles,
    cover_image_url = EXCLUDED.cover_image_url,
    website_url = EXCLUDED.website_url,
    years_experience = EXCLUDED.years_experience,
    trade_bodies = EXCLUDED.trade_bodies,
    verified = EXCLUDED.verified,
    languages = EXCLUDED.languages,
    city = EXCLUDED.city,
    postcode_district = EXCLUDED.postcode_district,
    accepting_work = EXCLUDED.accepting_work,
    emergency_work = EXCLUDED.emergency_work,
    insurance_verified = EXCLUDED.insurance_verified,
    credential = EXCLUDED.credential,
    completed_jobs = EXCLUDED.completed_jobs,
    response_minutes = EXCLUDED.response_minutes;
END;
$fn$;

REVOKE ALL ON FUNCTION public.refresh_trader_public_profile(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_refresh_trader_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $tg$
DECLARE
  target uuid;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    target := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    target := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'trade_companies' THEN
    target := COALESCE(NEW.owner_profile_id, OLD.owner_profile_id);
  ELSIF TG_TABLE_NAME = 'trade_repair_profiles' THEN
    SELECT c.owner_profile_id INTO target FROM public.trade_companies c
     WHERE c.id = COALESCE(NEW.trade_company_id, OLD.trade_company_id);
  ELSIF TG_TABLE_NAME = 'reviews' THEN
    target := COALESCE(NEW.trader_profile_id, OLD.trader_profile_id);
  ELSIF TG_TABLE_NAME = 'quotes' THEN
    SELECT c.owner_profile_id INTO target FROM public.trade_companies c
     WHERE c.id = COALESCE(NEW.trade_company_id, OLD.trade_company_id);
  END IF;

  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'profiles' THEN
    DELETE FROM public.trader_public_profiles WHERE id = target;
    RETURN OLD;
  END IF;

  PERFORM public.refresh_trader_public_profile(target);
  RETURN COALESCE(NEW, OLD);
END;
$tg$;

REVOKE ALL ON FUNCTION public.tg_refresh_trader_public_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refresh_public_profile ON public.profiles;
CREATE TRIGGER refresh_public_profile AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_trader_public_profile();

DROP TRIGGER IF EXISTS refresh_public_profile ON public.user_roles;
CREATE TRIGGER refresh_public_profile AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_trader_public_profile();

DROP TRIGGER IF EXISTS refresh_public_profile ON public.trade_companies;
CREATE TRIGGER refresh_public_profile AFTER INSERT OR UPDATE OR DELETE ON public.trade_companies
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_trader_public_profile();

DROP TRIGGER IF EXISTS refresh_public_profile ON public.trade_repair_profiles;
CREATE TRIGGER refresh_public_profile AFTER INSERT OR UPDATE OR DELETE ON public.trade_repair_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_trader_public_profile();

DROP TRIGGER IF EXISTS refresh_public_profile ON public.reviews;
CREATE TRIGGER refresh_public_profile AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_trader_public_profile();

DROP TRIGGER IF EXISTS refresh_public_profile ON public.quotes;
CREATE TRIGGER refresh_public_profile AFTER INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_trader_public_profile();

-- Backfill
DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.refresh_trader_public_profile(r.id);
  END LOOP;
END;
$do$;

-- 4b. Public read access for remaining view sources, PII columns withheld
DROP POLICY IF EXISTS "verified reviews publicly readable" ON public.reviews;
CREATE POLICY "verified reviews publicly readable"
ON public.reviews FOR SELECT TO anon, authenticated USING (verified_job = true);

REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (id, trader_profile_id, rating, comment, created_at, verified_job) ON public.reviews TO anon;

DROP POLICY IF EXISTS "directory listings publicly readable" ON public.trader_directory_profiles;
CREATE POLICY "directory listings publicly readable"
ON public.trader_directory_profiles FOR SELECT TO anon, authenticated
USING (is_active = true AND claim_status = ANY (ARRAY['unclaimed'::text, 'pending'::text]));

REVOKE SELECT ON public.trader_directory_profiles FROM anon, authenticated;
GRANT SELECT (
  id, business_name, trade, country_code, city, region, postcode_district,
  service_radius_miles, services, languages, factual_summary,
  registration_authority, verification_status, claim_status, source_name,
  source_checked_at, imported_at, is_active
) ON public.trader_directory_profiles TO anon, authenticated;

-- 4c. Recreate views as SECURITY INVOKER
DROP VIEW IF EXISTS public.marketplace_stats_public;
DROP VIEW IF EXISTS public.marketplace_listings_public;
DROP VIEW IF EXISTS public.trader_profiles_public;
DROP VIEW IF EXISTS public.reviews_public;
DROP VIEW IF EXISTS public.marketplace_directory_public;

CREATE VIEW public.trader_profiles_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, full_name, company_name, trade_specialism, rating, services_description,
       service_radius_miles, cover_image_url, website_url, years_experience,
       trade_bodies, verified, created_at, languages
FROM public.trader_public_profiles;

CREATE VIEW public.reviews_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, trader_profile_id, rating, comment, created_at, verified_job
FROM public.reviews
WHERE verified_job = true;

CREATE VIEW public.marketplace_directory_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, business_name, trade, country_code, city, region, postcode_district,
       service_radius_miles, services, languages, factual_summary,
       registration_authority, verification_status, claim_status, source_name,
       source_checked_at, imported_at
FROM public.trader_directory_profiles
WHERE is_active = true AND claim_status = ANY (ARRAY['unclaimed'::text, 'pending'::text]);

CREATE VIEW public.marketplace_listings_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT t.id AS listing_id,
       t.id AS profile_id,
       'member'::text AS listing_kind,
       0 AS member_rank,
       t.full_name AS display_name,
       t.company_name,
       t.trade_specialism,
       t.rating,
       t.review_count,
       t.services_description,
       t.service_radius_miles,
       t.years_experience,
       t.trade_bodies,
       t.verified,
       t.cover_image_url,
       'GB'::text AS country_code,
       t.city,
       t.postcode_district,
       t.languages,
       t.accepting_work,
       t.emergency_work,
       t.insurance_verified,
       t.credential,
       true AS subscription_verified,
       NULL::text AS claim_status,
       NULL::text AS source_name,
       NULL::timestamptz AS source_checked_at,
       t.completed_jobs,
       t.response_minutes,
       100::numeric + t.rating * 10::numeric + LEAST(t.review_count, 50::bigint)::numeric
         + CASE WHEN t.accepting_work THEN 8 ELSE 0 END::numeric
         + CASE WHEN t.insurance_verified THEN 8 ELSE 0 END::numeric AS recommended_score
FROM public.trader_public_profiles t
UNION ALL
SELECT d.id AS listing_id,
       NULL::uuid AS profile_id,
       'directory'::text AS listing_kind,
       1 AS member_rank,
       d.business_name AS display_name,
       d.business_name AS company_name,
       d.trade AS trade_specialism,
       0::numeric AS rating,
       0::bigint AS review_count,
       d.factual_summary AS services_description,
       d.service_radius_miles,
       NULL::integer AS years_experience,
       ARRAY[]::text[] AS trade_bodies,
       false AS verified,
       NULL::text AS cover_image_url,
       d.country_code,
       d.city,
       d.postcode_district,
       d.languages,
       false AS accepting_work,
       false AS emergency_work,
       false AS insurance_verified,
       CASE WHEN d.verification_status = 'verified' THEN d.registration_authority END AS credential,
       false AS subscription_verified,
       d.claim_status,
       d.source_name,
       d.source_checked_at,
       0::bigint AS completed_jobs,
       NULL::integer AS response_minutes,
       0::numeric AS recommended_score
FROM public.marketplace_directory_public d;

CREATE VIEW public.marketplace_stats_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT count(*) FILTER (WHERE listing_kind = 'member') AS verified_members,
       count(*) FILTER (WHERE listing_kind = 'directory') AS directory_profiles,
       COALESCE(sum(completed_jobs) FILTER (WHERE listing_kind = 'member'), 0::numeric)::bigint AS completed_jobs,
       COALESCE(round(avg(NULLIF(rating, 0::numeric)) FILTER (WHERE listing_kind = 'member'), 1), 0::numeric) AS average_rating,
       COALESCE(round(avg(response_minutes) FILTER (WHERE listing_kind = 'member')), 0::numeric)::integer AS average_response_minutes
FROM public.marketplace_listings_public;

REVOKE ALL ON public.trader_profiles_public FROM PUBLIC;
REVOKE ALL ON public.reviews_public FROM PUBLIC;
REVOKE ALL ON public.marketplace_directory_public FROM PUBLIC;
REVOKE ALL ON public.marketplace_listings_public FROM PUBLIC;
REVOKE ALL ON public.marketplace_stats_public FROM PUBLIC;
GRANT SELECT ON public.trader_profiles_public, public.reviews_public, public.marketplace_directory_public,
  public.marketplace_listings_public, public.marketplace_stats_public TO anon, authenticated;