-- Repair marketplace hardening and reconciliation.
-- Only verified, available, actively subscribing Craftvaro traders can be
-- matched, invited or submit repair offers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketplace_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_visible_until timestamptz;

UPDATE public.profiles p
SET marketplace_visible = COALESCE(s.subscribed AND s.tier <> 'free', false),
    marketplace_visible_until = s.subscription_end
FROM public.subscribers s
WHERE s.user_id = p.id;

CREATE OR REPLACE FUNCTION public.sync_marketplace_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET marketplace_visible = (
    NEW.subscribed = true
    AND NEW.tier <> 'free'
    AND (NEW.subscription_end IS NULL OR NEW.subscription_end > now())
  ),
  marketplace_visible_until = NEW.subscription_end
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_marketplace_visibility ON public.subscribers;
CREATE TRIGGER sync_marketplace_visibility
  AFTER INSERT OR UPDATE OF subscribed, tier, subscription_end ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.sync_marketplace_visibility();

CREATE OR REPLACE FUNCTION public.protect_marketplace_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.marketplace_visible := CASE WHEN TG_OP = 'UPDATE' THEN OLD.marketplace_visible ELSE false END;
    NEW.marketplace_visible_until := CASE WHEN TG_OP = 'UPDATE' THEN OLD.marketplace_visible_until ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_marketplace_visibility ON public.profiles;
CREATE TRIGGER protect_marketplace_visibility
  BEFORE INSERT OR UPDATE OF marketplace_visible, marketplace_visible_until ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_marketplace_visibility();

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
  p.created_at
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

CREATE TABLE IF NOT EXISTS public.repair_private_locations (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address_line1 text NOT NULL,
  city text NOT NULL,
  postcode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_private_locations TO authenticated;
GRANT ALL ON public.repair_private_locations TO service_role;
ALTER TABLE public.repair_private_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repair owners view private location" ON public.repair_private_locations;
CREATE POLICY "repair owners view private location"
  ON public.repair_private_locations FOR SELECT TO authenticated
  USING (customer_profile_id = auth.uid());

DROP POLICY IF EXISTS "awarded providers view private location" ON public.repair_private_locations;
CREATE POLICY "awarded providers view private location"
  ON public.repair_private_locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs j
      JOIN public.trade_companies tc ON tc.id = j.trade_company_id
      WHERE j.id = repair_private_locations.job_id
        AND j.status IN ('awarded', 'active', 'completed')
        AND j.exact_address_released = true
        AND tc.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins manage private repair locations" ON public.repair_private_locations;
CREATE POLICY "admins manage private repair locations"
  ON public.repair_private_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "repair owners insert private location" ON public.repair_private_locations;
CREATE POLICY "repair owners insert private location"
  ON public.repair_private_locations FOR INSERT TO authenticated
  WITH CHECK (
    customer_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = repair_private_locations.job_id
        AND j.customer_profile_id = auth.uid()
        AND j.job_kind = 'repair'
    )
  );

INSERT INTO public.repair_private_locations (job_id, customer_profile_id, address_line1, city, postcode)
SELECT id, customer_profile_id, address_line1, city, postcode
FROM public.jobs
WHERE job_kind = 'repair'
  AND address_line1 <> 'Address withheld'
ON CONFLICT (job_id) DO NOTHING;

UPDATE public.jobs
SET address_line1 = 'Address withheld',
    postcode = COALESCE(NULLIF(postcode_sector, ''), postcode)
WHERE job_kind = 'repair'
  AND address_line1 <> 'Address withheld';

CREATE OR REPLACE FUNCTION public.create_repair_job(
  p_title text,
  p_description text,
  p_address_line1 text,
  p_city text,
  p_postcode text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
  v_postcode text := upper(trim(p_postcode));
  v_compact text := regexp_replace(upper(trim(p_postcode)), '[[:space:]]+', '', 'g');
  v_sector text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(p_title)) < 2 OR length(trim(p_description)) < 12 THEN
    RAISE EXCEPTION 'A title and detailed description are required';
  END IF;
  IF length(trim(p_address_line1)) < 3 OR length(trim(p_city)) < 2 OR length(v_compact) < 5 THEN
    RAISE EXCEPTION 'A complete property address is required';
  END IF;

  v_sector := substring(v_compact from 1 for length(v_compact) - 2);
  v_sector := substring(v_sector from 1 for length(v_sector) - 1) || ' ' || right(v_sector, 1);

  INSERT INTO public.jobs (
    customer_profile_id, requested_trade, title, description,
    address_line1, city, postcode, postcode_sector, job_kind, status,
    exact_address_released
  ) VALUES (
    auth.uid(), 'other'::public.trade_type, trim(p_title), trim(p_description),
    'Address withheld', trim(p_city), v_sector, v_sector, 'repair', 'posted', false
  ) RETURNING id INTO v_job_id;

  INSERT INTO public.repair_private_locations (
    job_id, customer_profile_id, address_line1, city, postcode
  ) VALUES (
    v_job_id, auth.uid(), trim(p_address_line1), trim(p_city), v_postcode
  );

  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_repair_job(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_repair_job(text, text, text, text, text) TO authenticated;

-- Storage bucket `repair-intake` is managed via the storage tooling (private, 50MB limit).

ALTER TABLE public.repair_integration_outbox
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_repair_outbox_ready
  ON public.repair_integration_outbox(status, next_attempt_at, destination, created_at);

CREATE OR REPLACE FUNCTION public.ensure_trade_repair_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade public.trade_type;
BEGIN
  IF TG_TABLE_NAME = 'trade_companies' THEN
    SELECT trade_specialism INTO v_trade FROM public.profiles WHERE id = NEW.owner_profile_id;
    IF v_trade IS NOT NULL THEN
      INSERT INTO public.trade_repair_profiles (trade_company_id, trade)
      VALUES (NEW.id, v_trade)
      ON CONFLICT (trade_company_id, trade) DO NOTHING;
    END IF;
  ELSE
    IF NEW.trade_specialism IS NOT NULL THEN
      INSERT INTO public.trade_repair_profiles (trade_company_id, trade)
      SELECT id, NEW.trade_specialism
      FROM public.trade_companies
      WHERE owner_profile_id = NEW.id
      ON CONFLICT (trade_company_id, trade) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_trade_repair_profile_for_company ON public.trade_companies;
CREATE TRIGGER ensure_trade_repair_profile_for_company
  AFTER INSERT ON public.trade_companies
  FOR EACH ROW EXECUTE FUNCTION public.ensure_trade_repair_profile();

DROP TRIGGER IF EXISTS ensure_trade_repair_profile_for_specialism ON public.profiles;
CREATE TRIGGER ensure_trade_repair_profile_for_specialism
  AFTER INSERT OR UPDATE OF trade_specialism ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_trade_repair_profile();

DROP POLICY IF EXISTS "trades view ordinary project jobs" ON public.jobs;
CREATE POLICY "subscribed trades view ordinary project jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (
    job_kind = 'project'
    AND status IN ('posted', 'quoted', 'awarded', 'active', 'completed')
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
      OR (
        public.has_role(auth.uid(), 'trade')
        AND EXISTS (
          SELECT 1 FROM public.subscribers s
          WHERE s.user_id = auth.uid()
            AND s.subscribed = true
            AND s.tier <> 'free'
            AND (s.subscription_end IS NULL OR s.subscription_end > now())
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.match_repair_providers(
  p_trade public.trade_type,
  p_postcode_sector text,
  p_rapid boolean DEFAULT false,
  p_limit integer DEFAULT 4
) RETURNS TABLE (trade_company_id uuid, ranking_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rp.trade_company_id,
    (50 + COALESCE(pr.rating, 0) * 8
      + CASE WHEN cardinality(rp.service_postcode_prefixes) > 0 THEN 10 ELSE 0 END
      + CASE WHEN rp.emergency_work THEN 5 ELSE 0 END)::numeric AS ranking_score
  FROM public.trade_repair_profiles rp
  JOIN public.trade_companies tc ON tc.id = rp.trade_company_id
  JOIN public.profiles pr ON pr.id = tc.owner_profile_id AND pr.is_active = true
  JOIN public.subscribers s ON s.user_id = tc.owner_profile_id
  WHERE rp.trade = p_trade
    AND rp.available = true
    AND rp.capability_verified = true
    AND rp.insurance_verified = true
    AND (rp.insurance_expires_at IS NULL OR rp.insurance_expires_at >= current_date)
    AND s.subscribed = true
    AND s.tier <> 'free'
    AND (s.subscription_end IS NULL OR s.subscription_end > now())
    AND (NOT p_rapid OR rp.emergency_work = true)
    AND cardinality(rp.service_postcode_prefixes) > 0
    AND EXISTS (
      SELECT 1
      FROM unnest(rp.service_postcode_prefixes) prefix
      WHERE replace(upper(p_postcode_sector), ' ', '')
        LIKE replace(upper(prefix), ' ', '') || '%'
    )
    AND (
      p_trade <> 'gas_engineer'::public.trade_type
      OR (
        rp.credential_verified = true
        AND rp.credential_type ~* 'gas[[:space:]-]*safe'
        AND (rp.credential_expires_at IS NULL OR rp.credential_expires_at >= current_date)
      )
    )
    AND (
      p_trade <> 'electrician'::public.trade_type
      OR (
        rp.credential_verified = true
        AND rp.credential_type IS NOT NULL
        AND (rp.credential_expires_at IS NULL OR rp.credential_expires_at >= current_date)
      )
    )
  ORDER BY ranking_score DESC, rp.trade_company_id
  LIMIT LEAST(GREATEST(p_limit, 1), 4);
$$;

REVOKE ALL ON FUNCTION public.match_repair_providers(public.trade_type, text, boolean, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_repair_providers(public.trade_type, text, boolean, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_subscribed_repair_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
  AND NOT public.has_role(auth.uid(), 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM public.trade_companies tc
    JOIN public.subscribers s ON s.user_id = tc.owner_profile_id
    WHERE tc.id = NEW.trade_company_id
      AND s.subscribed = true
      AND s.tier <> 'free'
      AND (s.subscription_end IS NULL OR s.subscription_end > now())
  ) THEN
    RAISE EXCEPTION 'An active trader subscription is required to submit marketplace quotes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_subscribed_repair_provider ON public.quotes;
CREATE TRIGGER enforce_subscribed_repair_provider
  BEFORE INSERT OR UPDATE OF trade_company_id, job_id ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_subscribed_repair_provider();

CREATE OR REPLACE FUNCTION public.queue_source_product_award()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.job_kind = 'repair'
     AND NEW.source_product IN ('gabley', 'immoviq')
     AND NEW.status = 'awarded'
     AND NEW.exact_address_released = true
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.exact_address_released IS DISTINCT FROM NEW.exact_address_released)
  THEN
    INSERT INTO public.repair_integration_outbox (
      event_type, aggregate_type, aggregate_id, destination, payload, idempotency_key
    ) VALUES (
      'offer.accepted',
      'job',
      NEW.id,
      NEW.source_product,
      jsonb_build_object(
        'job_id', NEW.id,
        'trade_company_id', NEW.trade_company_id,
        'source_reference', NEW.source_reference,
        'property_reference', NEW.property_reference,
        'tenancy_reference', NEW.tenancy_reference,
        'status', NEW.status
      ),
      'offer.accepted:' || NEW.id::text || ':' || NEW.source_product
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_source_product_award ON public.jobs;
CREATE TRIGGER queue_source_product_award
  AFTER UPDATE OF status, exact_address_released ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.queue_source_product_award();
