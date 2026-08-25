-- Claimable trader directory, verified-job reviews and honest marketplace metrics.
-- Imported records are discovery-only. They never receive leads, expose contact
-- details or enter AI matching until claimed, verified and subscribed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE VIEW public.trader_profiles_public
WITH (security_invoker = false, security_barrier = true) AS
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
  p.created_at,
  p.languages
FROM public.profiles p
WHERE p.is_active = true
  AND p.verified = true
  AND p.marketplace_visible = true
  AND (p.marketplace_visible_until IS NULL OR p.marketplace_visible_until > now())
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'trade'
  );

REVOKE ALL ON public.trader_profiles_public FROM PUBLIC;
GRANT SELECT ON public.trader_profiles_public TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.trader_directory_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_record_id text NOT NULL,
  source_url text NOT NULL,
  source_checked_at timestamptz NOT NULL DEFAULT now(),
  business_name text NOT NULL,
  trade public.trade_type NOT NULL,
  country_code text NOT NULL DEFAULT 'GB' CHECK (country_code IN ('GB', 'DE')),
  city text NOT NULL,
  region text,
  postcode_district text NOT NULL,
  service_radius_miles integer CHECK (service_radius_miles IS NULL OR service_radius_miles BETWEEN 1 AND 250),
  services text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  factual_summary text,
  registration_authority text,
  registration_reference text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'expired', 'rejected')),
  claim_status text NOT NULL DEFAULT 'unclaimed'
    CHECK (claim_status IN ('unclaimed', 'pending', 'claimed', 'rejected')),
  claimed_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_name, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_directory_marketplace_search
  ON public.trader_directory_profiles(country_code, trade, postcode_district, claim_status)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.trader_directory_contacts (
  directory_profile_id uuid PRIMARY KEY REFERENCES public.trader_directory_profiles(id) ON DELETE CASCADE,
  business_email text,
  business_phone text,
  website_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trader_profile_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_profile_id uuid NOT NULL REFERENCES public.trader_directory_profiles(id) ON DELETE CASCADE,
  claimant_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_at_business text NOT NULL CHECK (length(trim(role_at_business)) BETWEEN 2 AND 100),
  registration_number text,
  verification_method text NOT NULL
    CHECK (verification_method IN ('business_email', 'business_phone', 'company_document', 'regulator_record')),
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_directory_claim
  ON public.trader_profile_claims(directory_profile_id, claimant_profile_id)
  WHERE status = 'pending';

ALTER TABLE public.trader_directory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trader_directory_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trader_profile_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage directory profiles" ON public.trader_directory_profiles;
CREATE POLICY "admins manage directory profiles"
  ON public.trader_directory_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage directory contacts" ON public.trader_directory_contacts;
CREATE POLICY "admins manage directory contacts"
  ON public.trader_directory_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "claimants view own claims" ON public.trader_profile_claims;
CREATE POLICY "claimants view own claims"
  ON public.trader_profile_claims FOR SELECT TO authenticated
  USING (claimant_profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "users submit own claims" ON public.trader_profile_claims;
CREATE POLICY "users submit own claims"
  ON public.trader_profile_claims FOR INSERT TO authenticated
  WITH CHECK (claimant_profile_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "admins review claims" ON public.trader_profile_claims;
CREATE POLICY "admins review claims"
  ON public.trader_profile_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_trader_profile_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.claimant_profile_id := auth.uid();
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.admin_notes := NULL;
    IF NOT EXISTS (
      SELECT 1 FROM public.trader_directory_profiles d
      WHERE d.id = NEW.directory_profile_id AND d.is_active = true
        AND d.claim_status IN ('unclaimed', 'pending')
    ) THEN
      RAISE EXCEPTION 'This directory profile is not available to claim';
    END IF;
    UPDATE public.trader_directory_profiles
    SET claim_status = 'pending', updated_at = now()
    WHERE id = NEW.directory_profile_id AND claim_status = 'unclaimed';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_trader_profile_claim ON public.trader_profile_claims;
CREATE TRIGGER protect_trader_profile_claim
  BEFORE INSERT OR UPDATE ON public.trader_profile_claims
  FOR EACH ROW EXECUTE FUNCTION public.protect_trader_profile_claim();

CREATE OR REPLACE FUNCTION public.approve_trader_profile_claim(p_claim_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.trader_profile_claims%ROWTYPE;
  v_directory public.trader_directory_profiles%ROWTYPE;
  v_company_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;

  SELECT * INTO v_claim FROM public.trader_profile_claims WHERE id = p_claim_id FOR UPDATE;
  IF v_claim.id IS NULL OR v_claim.status <> 'pending' THEN RAISE EXCEPTION 'Pending claim not found'; END IF;
  SELECT * INTO v_directory FROM public.trader_directory_profiles WHERE id = v_claim.directory_profile_id FOR UPDATE;
  IF v_directory.id IS NULL OR v_directory.claim_status NOT IN ('unclaimed', 'pending') THEN
    RAISE EXCEPTION 'Directory profile is no longer claimable';
  END IF;

  UPDATE public.profiles
  SET company_name = COALESCE(NULLIF(company_name, ''), v_directory.business_name),
      trade_specialism = COALESCE(trade_specialism, v_directory.trade),
      services_description = COALESCE(NULLIF(services_description, ''), v_directory.factual_summary),
      service_radius_miles = COALESCE(service_radius_miles, v_directory.service_radius_miles),
      languages = CASE WHEN cardinality(languages) = 0 THEN v_directory.languages ELSE languages END,
      updated_at = now()
  WHERE id = v_claim.claimant_profile_id;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_claim.claimant_profile_id, 'trade')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO v_company_id FROM public.trade_companies
  WHERE owner_profile_id = v_claim.claimant_profile_id ORDER BY created_at LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.trade_companies(
      owner_profile_id, legal_name, trading_name, company_number, city, postcode
    ) VALUES (
      v_claim.claimant_profile_id, v_directory.business_name, v_directory.business_name,
      v_claim.registration_number, v_directory.city, v_directory.postcode_district
    ) RETURNING id INTO v_company_id;
  END IF;

  UPDATE public.trader_directory_profiles
  SET claim_status = 'claimed', claimed_profile_id = v_claim.claimant_profile_id, updated_at = now()
  WHERE id = v_directory.id;

  UPDATE public.trader_profile_claims
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_claim_id;

  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_trader_profile_claim(p_claim_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_directory_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  UPDATE public.trader_profile_claims
  SET status = 'rejected', admin_notes = left(p_reason, 1000), reviewed_by = auth.uid(),
      reviewed_at = now(), updated_at = now()
  WHERE id = p_claim_id AND status = 'pending'
  RETURNING directory_profile_id INTO v_directory_id;
  IF v_directory_id IS NULL THEN RAISE EXCEPTION 'Pending claim not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.trader_profile_claims
    WHERE directory_profile_id = v_directory_id AND status = 'pending'
  ) THEN
    UPDATE public.trader_directory_profiles SET claim_status = 'unclaimed', updated_at = now()
    WHERE id = v_directory_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_trader_profile_claim(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_trader_profile_claim(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_trader_profile_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_trader_profile_claim(uuid, text) TO authenticated;

CREATE OR REPLACE VIEW public.marketplace_directory_public
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  id, business_name, trade, country_code, city, region, postcode_district,
  service_radius_miles, services, languages, factual_summary,
  registration_authority, verification_status, claim_status,
  source_name, source_checked_at, imported_at
FROM public.trader_directory_profiles
WHERE is_active = true AND claim_status IN ('unclaimed', 'pending');

REVOKE ALL ON public.marketplace_directory_public FROM PUBLIC;
GRANT SELECT ON public.marketplace_directory_public TO anon, authenticated;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified_job boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
DROP POLICY IF EXISTS "reviewers read own reviews" ON public.reviews;
CREATE POLICY "reviewers read own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR trader_profile_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

UPDATE public.reviews r
SET verified_job = EXISTS (
  SELECT 1
  FROM public.jobs j
  JOIN public.job_awards a ON a.job_id = j.id
  JOIN public.trade_companies tc ON tc.id = a.trade_company_id
  WHERE j.id = r.job_id AND j.status = 'completed'
    AND j.customer_profile_id = r.reviewer_id
    AND tc.owner_profile_id = r.trader_profile_id
);

CREATE OR REPLACE FUNCTION public.enforce_verified_job_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.reviewer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Reviews must be submitted by the signed-in customer';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.job_awards a ON a.job_id = j.id
    JOIN public.trade_companies tc ON tc.id = a.trade_company_id
    WHERE j.id = NEW.job_id AND j.status = 'completed'
      AND j.customer_profile_id = auth.uid()
      AND tc.owner_profile_id = NEW.trader_profile_id
  ) THEN
    RAISE EXCEPTION 'Only the customer can review the awarded trader after a completed job';
  END IF;
  NEW.verified_job := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_verified_job_review ON public.reviews;
CREATE TRIGGER enforce_verified_job_review
  BEFORE INSERT OR UPDATE OF job_id, reviewer_id, trader_profile_id, rating, comment ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_verified_job_review();

DROP POLICY IF EXISTS "Users can create reviews for their jobs" ON public.reviews;
CREATE POLICY "customers review completed awarded jobs"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM public.jobs j
      JOIN public.job_awards a ON a.job_id = j.id
      JOIN public.trade_companies tc ON tc.id = a.trade_company_id
      WHERE j.id = reviews.job_id AND j.status = 'completed'
        AND j.customer_profile_id = auth.uid()
        AND tc.owner_profile_id = reviews.trader_profile_id
    )
  );

CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = false, security_barrier = true) AS
SELECT id, trader_profile_id, rating, comment, created_at, verified_job
FROM public.reviews
WHERE verified_job = true;

REVOKE ALL ON public.reviews_public FROM PUBLIC;
GRANT SELECT ON public.reviews_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.marketplace_listings_public
WITH (security_invoker = false, security_barrier = true) AS
WITH review_stats AS (
  SELECT trader_profile_id, count(*)::bigint AS review_count, avg(rating)::numeric(3,2) AS verified_rating
  FROM public.reviews WHERE verified_job = true GROUP BY trader_profile_id
), member_metrics AS (
  SELECT tc.owner_profile_id,
    count(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END)::bigint AS completed_jobs,
    round(avg(EXTRACT(epoch FROM (q.created_at - j.created_at)) / 60))::integer AS response_minutes
  FROM public.trade_companies tc
  LEFT JOIN public.quotes q ON q.trade_company_id = tc.id
  LEFT JOIN public.jobs j ON j.id = q.job_id
  GROUP BY tc.owner_profile_id
)
SELECT
  p.id AS listing_id,
  p.id AS profile_id,
  'member'::text AS listing_kind,
  0::integer AS member_rank,
  p.full_name AS display_name,
  p.company_name,
  p.trade_specialism,
  COALESCE(rs.verified_rating, 0)::numeric AS rating,
  COALESCE(rs.review_count, 0)::bigint AS review_count,
  p.services_description,
  p.service_radius_miles,
  p.years_experience,
  p.trade_bodies,
  p.verified,
  p.cover_image_url,
  'GB'::text AS country_code,
  COALESCE(tc.city, '')::text AS city,
  upper(split_part(COALESCE(tc.postcode, ''), ' ', 1))::text AS postcode_district,
  COALESCE(p.languages, '{}')::text[] AS languages,
  COALESCE(trp.available, false) AS accepting_work,
  COALESCE(trp.emergency_work, false) AS emergency_work,
  COALESCE(trp.insurance_verified, false) AS insurance_verified,
  CASE WHEN trp.credential_verified THEN trp.credential_type ELSE NULL END AS credential,
  true AS subscription_verified,
  NULL::text AS claim_status,
  NULL::text AS source_name,
  NULL::timestamptz AS source_checked_at,
  COALESCE(mm.completed_jobs, 0)::bigint AS completed_jobs,
  mm.response_minutes,
  (100 + COALESCE(rs.verified_rating, 0) * 10 + LEAST(COALESCE(rs.review_count, 0), 50)
    + CASE WHEN trp.available THEN 8 ELSE 0 END + CASE WHEN trp.insurance_verified THEN 8 ELSE 0 END)::numeric AS recommended_score
FROM public.trader_profiles_public p
LEFT JOIN review_stats rs ON rs.trader_profile_id = p.id
LEFT JOIN member_metrics mm ON mm.owner_profile_id = p.id
LEFT JOIN LATERAL (
  SELECT * FROM public.trade_companies c WHERE c.owner_profile_id = p.id ORDER BY c.created_at LIMIT 1
) tc ON true
LEFT JOIN LATERAL (
  SELECT * FROM public.trade_repair_profiles r
  WHERE r.trade_company_id = tc.id AND r.trade = p.trade_specialism
  ORDER BY r.updated_at DESC LIMIT 1
) trp ON true
UNION ALL
SELECT
  d.id, NULL::uuid, 'directory'::text, 1::integer,
  d.business_name, d.business_name, d.trade,
  0::numeric, 0::bigint, d.factual_summary, d.service_radius_miles,
  NULL::integer, ARRAY[]::text[], false, NULL::text,
  d.country_code, d.city, d.postcode_district, d.languages,
  false, false, false,
  CASE WHEN d.verification_status = 'verified' THEN d.registration_authority ELSE NULL END,
  false, d.claim_status, d.source_name, d.source_checked_at,
  0::bigint, NULL::integer, 0::numeric
FROM public.marketplace_directory_public d;

REVOKE ALL ON public.marketplace_listings_public FROM PUBLIC;
GRANT SELECT ON public.marketplace_listings_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.marketplace_stats_public
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  count(*) FILTER (WHERE listing_kind = 'member')::bigint AS verified_members,
  count(*) FILTER (WHERE listing_kind = 'directory')::bigint AS directory_profiles,
  COALESCE(sum(completed_jobs) FILTER (WHERE listing_kind = 'member'), 0)::bigint AS completed_jobs,
  COALESCE(round(avg(NULLIF(rating, 0)) FILTER (WHERE listing_kind = 'member'), 1), 0)::numeric AS average_rating,
  COALESCE(round(avg(response_minutes) FILTER (WHERE listing_kind = 'member')), 0)::integer AS average_response_minutes
FROM public.marketplace_listings_public;

REVOKE ALL ON public.marketplace_stats_public FROM PUBLIC;
GRANT SELECT ON public.marketplace_stats_public TO anon, authenticated;

GRANT ALL ON public.trader_directory_profiles, public.trader_directory_contacts, public.trader_profile_claims TO service_role;
GRANT SELECT, INSERT ON public.trader_profile_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trader_directory_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trader_directory_contacts TO authenticated;
GRANT UPDATE ON public.trader_profile_claims TO authenticated;

ALTER TYPE public.trade_type ADD VALUE IF NOT EXISTS 'removals';
ALTER TYPE public.trade_type ADD VALUE IF NOT EXISTS 'rubbish_collection';
ALTER TYPE public.trade_type ADD VALUE IF NOT EXISTS 'cleaner';