-- Craftvaro Repair Assist + Dokuvera integration
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_kind text NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS repair_priority text,
  ADD COLUMN IF NOT EXISTS postcode_sector text,
  ADD COLUMN IF NOT EXISTS exact_address_released boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_product text NOT NULL DEFAULT 'craftvaro',
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS property_reference text,
  ADD COLUMN IF NOT EXISTS tenancy_reference text;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_job_kind_check,
  ADD CONSTRAINT jobs_job_kind_check CHECK (job_kind IN ('project', 'repair')),
  DROP CONSTRAINT IF EXISTS jobs_source_product_check,
  ADD CONSTRAINT jobs_source_product_check CHECK (source_product IN ('craftvaro', 'gabley', 'immoviq')),
  DROP CONSTRAINT IF EXISTS jobs_repair_priority_check,
  ADD CONSTRAINT jobs_repair_priority_check CHECK (repair_priority IS NULL OR repair_priority IN ('normal', 'high', 'emergency'));

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS offer_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS eta_minutes integer,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty_days integer;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_offer_type_check,
  ADD CONSTRAINT quotes_offer_type_check CHECK (offer_type IN ('fixed', 'estimate', 'diagnostic_callout')),
  DROP CONSTRAINT IF EXISTS quotes_eta_minutes_check,
  ADD CONSTRAINT quotes_eta_minutes_check CHECK (eta_minutes IS NULL OR eta_minutes > 0),
  DROP CONSTRAINT IF EXISTS quotes_duration_minutes_check,
  ADD CONSTRAINT quotes_duration_minutes_check CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  DROP CONSTRAINT IF EXISTS quotes_warranty_days_check,
  ADD CONSTRAINT quotes_warranty_days_check CHECK (warranty_days IS NULL OR warranty_days >= 0);

CREATE TABLE public.repair_intake_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  captured_at timestamptz,
  redaction_status text NOT NULL DEFAULT 'pending' CHECK (redaction_status IN ('pending', 'processing', 'safe', 'blocked', 'failed')),
  redacted_storage_path text,
  dokuvera_evidence_id text,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_intake_media TO authenticated;
GRANT ALL ON public.repair_intake_media TO service_role;

CREATE TABLE public.repair_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'safety_stop', 'needs_more_information')),
  emergency_stop boolean NOT NULL DEFAULT false,
  risk_level text NOT NULL DEFAULT 'normal' CHECK (risk_level IN ('normal', 'high', 'emergency')),
  hazards jsonb NOT NULL DEFAULT '[]'::jsonb,
  probable_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  likely_remedies jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric(5,4) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  suggested_trade public.trade_type NOT NULL,
  safety_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  prohibited_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_cost jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.repair_diagnoses TO authenticated;
GRANT ALL ON public.repair_diagnoses TO service_role;

CREATE TABLE public.trade_repair_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_company_id uuid NOT NULL REFERENCES public.trade_companies(id) ON DELETE CASCADE,
  trade public.trade_type NOT NULL,
  service_postcode_prefixes text[] NOT NULL DEFAULT '{}',
  capability_verified boolean NOT NULL DEFAULT false,
  insurance_verified boolean NOT NULL DEFAULT false,
  insurance_expires_at date,
  credential_type text,
  credential_number text,
  credential_verified boolean NOT NULL DEFAULT false,
  credential_expires_at date,
  available boolean NOT NULL DEFAULT true,
  emergency_work boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_company_id, trade)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_repair_profiles TO authenticated;
GRANT ALL ON public.trade_repair_profiles TO service_role;

CREATE TABLE public.repair_dispatch_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'compare' CHECK (mode IN ('compare', 'rapid')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'unmatched', 'accepted', 'expired', 'cancelled')),
  max_providers integer NOT NULL DEFAULT 4 CHECK (max_providers BETWEEN 1 AND 4),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.repair_dispatch_rounds TO authenticated;
GRANT ALL ON public.repair_dispatch_rounds TO service_role;

CREATE TABLE public.repair_dispatch_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_round_id uuid NOT NULL REFERENCES public.repair_dispatch_rounds(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  trade_company_id uuid NOT NULL REFERENCES public.trade_companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'viewed', 'responded', 'accepted', 'declined', 'expired', 'not_selected')),
  ranking_score numeric(8,4) NOT NULL DEFAULT 0,
  scoped_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dispatch_round_id, trade_company_id)
);
GRANT SELECT ON public.repair_dispatch_invites TO authenticated;
GRANT ALL ON public.repair_dispatch_invites TO service_role;

CREATE TABLE public.dokuvera_case_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  dokuvera_case_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'partial', 'failed', 'closed')),
  evidence_pack_url text,
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dokuvera_case_links TO authenticated;
GRANT ALL ON public.dokuvera_case_links TO service_role;

CREATE TABLE public.repair_integration_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  destination text NOT NULL CHECK (destination IN ('dokuvera', 'gabley', 'immoviq', 'craftvaro')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'retry', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
GRANT SELECT ON public.repair_integration_outbox TO authenticated;
GRANT ALL ON public.repair_integration_outbox TO service_role;

CREATE INDEX idx_repair_media_job ON public.repair_intake_media(job_id, created_at);
CREATE INDEX idx_repair_profile_match ON public.trade_repair_profiles(trade, available, capability_verified, insurance_verified);
CREATE INDEX idx_repair_invites_company ON public.repair_dispatch_invites(trade_company_id, status, created_at DESC);
CREATE INDEX idx_repair_invites_job ON public.repair_dispatch_invites(job_id, status);
CREATE INDEX idx_repair_outbox_delivery ON public.repair_integration_outbox(status, destination, created_at);

ALTER TABLE public.repair_intake_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_repair_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_dispatch_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_dispatch_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokuvera_case_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_integration_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repair customers manage intake media" ON public.repair_intake_media
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.customer_profile_id = auth.uid()))
WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.customer_profile_id = auth.uid()));

CREATE POLICY "awarded trades view safe repair media metadata" ON public.repair_intake_media
FOR SELECT TO authenticated
USING (
  redaction_status = 'safe' AND EXISTS (
    SELECT 1 FROM public.job_awards a JOIN public.trade_companies tc ON tc.id = a.trade_company_id
    WHERE a.job_id = job_id AND tc.owner_profile_id = auth.uid()
  )
);

CREATE POLICY "repair parties view diagnoses" ON public.repair_diagnoses
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.repair_dispatch_invites i JOIN public.trade_companies tc ON tc.id = i.trade_company_id
    WHERE i.job_id = job_id AND tc.owner_profile_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "trade companies manage own repair capability" ON public.trade_repair_profiles
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.trade_companies tc WHERE tc.id = trade_company_id AND tc.owner_profile_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.trade_companies tc WHERE tc.id = trade_company_id AND tc.owner_profile_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "repair customers view dispatch rounds" ON public.repair_dispatch_rounds
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.customer_profile_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "repair parties view invites" ON public.repair_dispatch_invites
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.trade_companies tc WHERE tc.id = trade_company_id AND tc.owner_profile_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "repair parties view dokuvera link" ON public.dokuvera_case_links
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.job_awards a JOIN public.trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = job_id AND tc.owner_profile_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "admins view repair outbox" ON public.repair_integration_outbox
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Repair jobs are never disclosed through the broad project-job policy.
DROP POLICY IF EXISTS "trades view posted jobs" ON public.jobs;
DROP POLICY IF EXISTS "trades view posted jobs scoped" ON public.jobs;

CREATE POLICY "trades view ordinary project jobs" ON public.jobs
FOR SELECT TO authenticated
USING (
  job_kind = 'project'
  AND status IN ('posted', 'quoted', 'awarded', 'active', 'completed')
  AND (public.has_role(auth.uid(), 'trade') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "admins manage all jobs" ON public.jobs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "awarded trades view repair job address" ON public.jobs
FOR SELECT TO authenticated
USING (
  job_kind = 'repair' AND exact_address_released = true AND EXISTS (
    SELECT 1 FROM public.job_awards a JOIN public.trade_companies tc ON tc.id = a.trade_company_id
    WHERE a.job_id = jobs.id AND tc.owner_profile_id = auth.uid()
  )
);

CREATE POLICY "customers upload own repair intake" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'repair-intake' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "customers view own repair intake" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'repair-intake' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "customers delete own repair intake" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'repair-intake' AND auth.uid()::text = (storage.foldername(name))[1]);

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
  JOIN public.profiles pr ON pr.id = tc.owner_profile_id
  WHERE rp.trade = p_trade
    AND rp.available = true
    AND rp.capability_verified = true
    AND rp.insurance_verified = true
    AND (rp.insurance_expires_at IS NULL OR rp.insurance_expires_at >= current_date)
    AND (NOT p_rapid OR rp.emergency_work = true)
    AND (
      cardinality(rp.service_postcode_prefixes) = 0
      OR EXISTS (SELECT 1 FROM unnest(rp.service_postcode_prefixes) prefix WHERE replace(upper(p_postcode_sector), ' ', '') LIKE replace(upper(prefix), ' ', '') || '%')
    )
    AND (
      p_trade NOT IN ('gas_engineer'::public.trade_type, 'electrician'::public.trade_type)
      OR (rp.credential_verified = true AND (rp.credential_expires_at IS NULL OR rp.credential_expires_at >= current_date))
    )
  ORDER BY ranking_score DESC, rp.trade_company_id
  LIMIT LEAST(GREATEST(p_limit, 1), 4);
$$;

REVOKE ALL ON FUNCTION public.match_repair_providers(public.trade_type, text, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_repair_providers(public.trade_type, text, boolean, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_repair_offer(
  p_invite_id uuid,
  p_offer_type text,
  p_labour numeric,
  p_materials numeric,
  p_eta_minutes integer,
  p_duration_minutes integer,
  p_assumptions jsonb,
  p_exclusions jsonb,
  p_warranty_days integer,
  p_notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.repair_dispatch_invites%ROWTYPE;
  v_quote_id uuid;
BEGIN
  SELECT i.* INTO v_invite
  FROM public.repair_dispatch_invites i
  JOIN public.trade_companies tc ON tc.id = i.trade_company_id
  JOIN public.repair_dispatch_rounds dr ON dr.id = i.dispatch_round_id
  WHERE i.id = p_invite_id AND tc.owner_profile_id = auth.uid() AND i.status IN ('invited','viewed') AND dr.status = 'open' AND (dr.expires_at IS NULL OR dr.expires_at > now())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation is not available'; END IF;

  INSERT INTO public.quotes (job_id, trade_company_id, labour_amount, materials_estimate, delivery_estimate, notes, offer_type, eta_minutes, duration_minutes, assumptions, exclusions, warranty_days)
  VALUES (v_invite.job_id, v_invite.trade_company_id, GREATEST(p_labour,0), GREATEST(p_materials,0), 0, p_notes, p_offer_type, p_eta_minutes, p_duration_minutes, COALESCE(p_assumptions,'[]'::jsonb), COALESCE(p_exclusions,'[]'::jsonb), p_warranty_days)
  RETURNING id INTO v_quote_id;

  UPDATE public.repair_dispatch_invites SET status = 'responded', responded_at = now() WHERE id = p_invite_id;
  UPDATE public.jobs SET status = 'quoted' WHERE id = v_invite.job_id AND status = 'posted';
  INSERT INTO public.notifications (recipient_id, title, body, link, type)
  SELECT j.customer_profile_id, 'New repair offer received',
    'A verified provider has responded with a price and arrival time.',
    '/jobs/' || j.id::text, 'repair_offer'
  FROM public.jobs j WHERE j.id = v_invite.job_id;
  INSERT INTO public.repair_integration_outbox (event_type, aggregate_type, aggregate_id, destination, payload, idempotency_key)
  SELECT 'offer.received', 'job', j.id, j.source_product,
    jsonb_build_object('job_id', j.id, 'quote_id', v_quote_id, 'source_reference', j.source_reference),
    'offer.received:' || v_quote_id::text || ':' || j.source_product
  FROM public.jobs j
  WHERE j.id = v_invite.job_id AND j.source_product IN ('gabley','immoviq')
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN v_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_repair_offer(uuid,text,numeric,numeric,integer,integer,jsonb,jsonb,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_repair_offer(uuid,text,numeric,numeric,integer,integer,jsonb,jsonb,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_repair_invite(p_invite_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  UPDATE public.repair_dispatch_invites i
    SET status = 'declined', responded_at = now()
  FROM public.trade_companies tc
  WHERE i.id = p_invite_id
    AND tc.id = i.trade_company_id
    AND tc.owner_profile_id = auth.uid()
    AND i.status IN ('invited','viewed')
  RETURNING i.job_id INTO v_job_id;
  IF v_job_id IS NULL THEN RAISE EXCEPTION 'Invitation is not available'; END IF;
  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_repair_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_repair_invite(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_repair_offer(p_quote_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_round_id uuid;
BEGIN
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = v_quote.job_id AND customer_profile_id = auth.uid() AND job_kind = 'repair' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair job not found or not owned by caller'; END IF;
  IF v_quote.status <> 'submitted' THEN RAISE EXCEPTION 'Quote is no longer available'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.repair_dispatch_invites WHERE job_id = v_job.id AND trade_company_id = v_quote.trade_company_id AND status = 'responded') THEN
    RAISE EXCEPTION 'Quote is not from an invited provider';
  END IF;

  UPDATE public.quotes SET status = CASE WHEN id = p_quote_id THEN 'accepted'::public.quote_status ELSE 'rejected'::public.quote_status END WHERE job_id = v_job.id AND status = 'submitted';
  INSERT INTO public.job_awards (job_id, accepted_quote_id, trade_company_id) VALUES (v_job.id, p_quote_id, v_quote.trade_company_id);
  UPDATE public.jobs SET status = 'awarded', trade_company_id = v_quote.trade_company_id, exact_address_released = true WHERE id = v_job.id;
  SELECT dispatch_round_id INTO v_round_id FROM public.repair_dispatch_invites WHERE job_id = v_job.id AND trade_company_id = v_quote.trade_company_id ORDER BY created_at DESC LIMIT 1;
  UPDATE public.repair_dispatch_rounds SET status = 'accepted' WHERE id = v_round_id;
  UPDATE public.repair_dispatch_invites SET status = 'accepted' WHERE job_id = v_job.id AND trade_company_id = v_quote.trade_company_id;
  UPDATE public.repair_dispatch_invites SET status = 'not_selected' WHERE job_id = v_job.id AND trade_company_id <> v_quote.trade_company_id AND status IN ('invited','viewed','responded');

  INSERT INTO public.notifications (recipient_id, title, body, link, type)
  SELECT tc.owner_profile_id, 'Repair job awarded to you',
    'Your offer was accepted. The exact address is now available.',
    '/jobs/' || v_job.id::text, 'repair_awarded'
  FROM public.trade_companies tc WHERE tc.id = v_quote.trade_company_id;

  INSERT INTO public.repair_integration_outbox (event_type, aggregate_type, aggregate_id, destination, payload, idempotency_key)
  VALUES ('offer.accepted', 'job', v_job.id, 'dokuvera',
    jsonb_build_object('job_id', v_job.id, 'quote_id', p_quote_id, 'trade_company_id', v_quote.trade_company_id),
    'offer.accepted:' || p_quote_id::text || ':dokuvera')
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN v_job.id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_repair_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_repair_offer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_repair_offer(p_quote_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
BEGIN
  SELECT q.* INTO v_quote
  FROM public.quotes q
  JOIN public.jobs j ON j.id = q.job_id
  WHERE q.id = p_quote_id
    AND q.status = 'submitted'
    AND j.job_kind = 'repair'
    AND j.customer_profile_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair offer not found or not owned by caller'; END IF;

  UPDATE public.quotes SET status = 'rejected' WHERE id = p_quote_id;
  UPDATE public.repair_dispatch_invites
    SET status = 'not_selected'
    WHERE job_id = v_quote.job_id AND trade_company_id = v_quote.trade_company_id AND status = 'responded';
  RETURN v_quote.job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_repair_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_repair_offer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_repair_profile_verification()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  v_privileged boolean := public.has_role(auth.uid(), 'admin')
    OR auth.role() = 'service_role'
    OR current_user IN ('postgres', 'service_role', 'supabase_admin');
BEGIN
  IF v_privileged THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.capability_verified := false;
    NEW.insurance_verified := false;
    NEW.credential_verified := false;
    RETURN NEW;
  END IF;
  NEW.capability_verified := OLD.capability_verified;
  NEW.insurance_verified := CASE WHEN NEW.insurance_expires_at IS DISTINCT FROM OLD.insurance_expires_at THEN false ELSE OLD.insurance_verified END;
  NEW.credential_verified := CASE
    WHEN NEW.credential_type IS DISTINCT FROM OLD.credential_type
      OR NEW.credential_number IS DISTINCT FROM OLD.credential_number
      OR NEW.credential_expires_at IS DISTINCT FROM OLD.credential_expires_at
    THEN false ELSE OLD.credential_verified END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_repair_profile_verification
BEFORE INSERT OR UPDATE ON public.trade_repair_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_repair_profile_verification();

INSERT INTO public.trade_repair_profiles (trade_company_id, trade)
SELECT tc.id, p.trade_specialism
FROM public.trade_companies tc
JOIN public.profiles p ON p.id = tc.owner_profile_id
WHERE p.trade_specialism IS NOT NULL
ON CONFLICT (trade_company_id, trade) DO NOTHING;

CREATE TRIGGER update_repair_diagnoses_updated_at BEFORE UPDATE ON public.repair_diagnoses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trade_repair_profiles_updated_at BEFORE UPDATE ON public.trade_repair_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dokuvera_case_links_updated_at BEFORE UPDATE ON public.dokuvera_case_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.repair_dispatch_invites IS 'Maximum-four provider invitations containing approximate postcode and redacted information only.';
COMMENT ON TABLE public.dokuvera_case_links IS 'Stable link between a Craftvaro repair job and its Dokuvera evidence case.';