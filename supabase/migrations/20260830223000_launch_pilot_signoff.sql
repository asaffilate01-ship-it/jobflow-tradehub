-- Forward-only controlled-launch pilot records and sign-off controls.
-- Lovable-managed environment/auth files and Storage buckets are intentionally untouched.

CREATE TABLE IF NOT EXISTS public.launch_pilot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 120),
  postcode_area text NOT NULL CHECK (char_length(postcode_area) BETWEEN 2 AND 40),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'failed', 'passed')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  signed_off_at timestamptz,
  signed_off_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.launch_pilot_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.launch_pilot_runs(id) ON DELETE CASCADE,
  check_key text NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_run'
    CHECK (status IN ('not_run', 'pass', 'fail', 'blocked')),
  notes text,
  evidence_reference text,
  tested_at timestamptz,
  tested_by uuid REFERENCES auth.users(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, check_key)
);

CREATE INDEX IF NOT EXISTS idx_launch_pilot_runs_status
  ON public.launch_pilot_runs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_launch_pilot_checks_run
  ON public.launch_pilot_checks(run_id, sort_order);

ALTER TABLE public.launch_pilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_pilot_checks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.launch_pilot_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.launch_pilot_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.launch_pilot_runs TO authenticated;
GRANT SELECT, UPDATE ON public.launch_pilot_checks TO authenticated;
GRANT ALL ON public.launch_pilot_runs, public.launch_pilot_checks TO service_role;

DROP POLICY IF EXISTS "admins view launch pilot runs" ON public.launch_pilot_runs;
CREATE POLICY "admins view launch pilot runs"
ON public.launch_pilot_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins view launch pilot checks" ON public.launch_pilot_checks;
CREATE POLICY "admins view launch pilot checks"
ON public.launch_pilot_checks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update launch pilot checks" ON public.launch_pilot_checks;
CREATE POLICY "admins update launch pilot checks"
ON public.launch_pilot_checks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_launch_pilot_run(
  p_name text,
  p_postcode_area text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_run_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF char_length(trim(p_name)) < 3 OR char_length(trim(p_postcode_area)) < 2 THEN
    RAISE EXCEPTION 'Pilot name and postcode area are required';
  END IF;

  INSERT INTO public.launch_pilot_runs (name, postcode_area, notes, created_by)
  VALUES (trim(p_name), upper(trim(p_postcode_area)), nullif(trim(p_notes), ''), auth.uid())
  RETURNING id INTO new_run_id;

  INSERT INTO public.launch_pilot_checks (run_id, check_key, category, label, sort_order) VALUES
    (new_run_id, 'paid_supply_10', 'Supply', 'At least 10 verified paid/trial marketplace traders are lead-eligible', 10),
    (new_run_id, 'repair_supply_4', 'Supply', 'At least four verified and available repair providers cover the pilot area', 20),
    (new_run_id, 'claimable_directory_boundary', 'Supply', 'Claimable listings remain visible but expose no contact or lead actions before claim and subscription', 30),
    (new_run_id, 'customer_auth_persistence', 'Customer journey', 'Customer signup, login and profile persist after reload', 40),
    (new_run_id, 'repair_intake_upload', 'Customer journey', 'Repair photo/video intake writes private media and a repair case', 50),
    (new_run_id, 'safety_stop', 'AI and safety', 'Gas, electrical and immediate-danger scenarios stop normal dispatch and show correct safety guidance', 60),
    (new_run_id, 'ai_guidance', 'AI and safety', 'AI result uses possible causes, confidence and indicative cost rather than a guaranteed diagnosis or price', 70),
    (new_run_id, 'max_four_postcode_only', 'Dispatch', 'No more than four eligible providers receive postcode-sector-only invitations', 80),
    (new_run_id, 'trader_offer', 'Dispatch', 'An invited subscribed trader can submit price, ETA, duration, assumptions and warranty', 90),
    (new_run_id, 'single_award_address_release', 'Dispatch', 'Customer acceptance awards one trader and releases the full address only to that trader', 100),
    (new_run_id, 'five_completed_jobs', 'Completion', 'Five controlled pilot jobs complete end to end in the selected postcode area', 110),
    (new_run_id, 'completion_evidence', 'Completion', 'Before/after evidence, certificates and completion status persist after reload', 120),
    (new_run_id, 'dokuvera_safe_media', 'Evidence and integrations', 'Dokuvera receives only media marked safe with a redacted storage path', 130),
    (new_run_id, 'integration_delivery_recovery', 'Evidence and integrations', 'Gabley/Immoviq delivery succeeds or recovers through the admin retry workflow without duplicate processing', 140),
    (new_run_id, 'subscription_removal', 'Commercial controls', 'Expired, cancelled or unpaid traders disappear from AI search and cannot receive or quote on leads', 150),
    (new_run_id, 'deletion_request', 'Privacy and support', 'Account deletion request, admin processing and audit attribution work end to end', 160);

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'launch.pilot.created', 'launch_pilot_run', new_run_id,
    jsonb_build_object('postcode_area', upper(trim(p_postcode_area))));
  RETURN new_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_off_launch_pilot(p_run_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  incomplete_count integer;
  check_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE required AND status <> 'pass')
  INTO check_count, incomplete_count
  FROM public.launch_pilot_checks
  WHERE run_id = p_run_id;

  IF check_count = 0 THEN RAISE EXCEPTION 'Pilot run has no checks'; END IF;
  IF incomplete_count > 0 THEN
    RAISE EXCEPTION 'Every required pilot check must pass before sign-off';
  END IF;

  UPDATE public.launch_pilot_runs
  SET status = 'passed', completed_at = now(), signed_off_at = now(), signed_off_by = auth.uid(), updated_at = now()
  WHERE id = p_run_id AND signed_off_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pilot run not found or already signed off'; END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'launch.pilot.signed_off', 'launch_pilot_run', p_run_id,
    jsonb_build_object('checks', check_count));
  RETURN p_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_launch_pilot_run(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sign_off_launch_pilot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_launch_pilot_run(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_off_launch_pilot(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_signed_launch_pilot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_signed_at timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'launch_pilot_runs' THEN
    IF OLD.signed_off_at IS NOT NULL AND auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'Signed-off pilot runs are immutable';
    END IF;
  ELSE
    SELECT signed_off_at INTO parent_signed_at
    FROM public.launch_pilot_runs
    WHERE id = OLD.run_id;
    IF parent_signed_at IS NOT NULL AND auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'Checks on a signed-off pilot run are immutable';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS guard_signed_launch_pilot_run ON public.launch_pilot_runs;
CREATE TRIGGER guard_signed_launch_pilot_run
BEFORE UPDATE OR DELETE ON public.launch_pilot_runs
FOR EACH ROW EXECUTE FUNCTION public.guard_signed_launch_pilot();

DROP TRIGGER IF EXISTS guard_signed_launch_pilot_check ON public.launch_pilot_checks;
CREATE TRIGGER guard_signed_launch_pilot_check
BEFORE UPDATE OR DELETE ON public.launch_pilot_checks
FOR EACH ROW EXECUTE FUNCTION public.guard_signed_launch_pilot();

CREATE OR REPLACE FUNCTION public.track_launch_pilot_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.tested_at := now();
    NEW.tested_by := auth.uid();
  END IF;

  UPDATE public.launch_pilot_runs
  SET status = CASE
      WHEN NEW.status = 'fail' OR EXISTS (
        SELECT 1 FROM public.launch_pilot_checks
        WHERE run_id = NEW.run_id AND id <> NEW.id AND status = 'fail'
      ) THEN 'failed'
      ELSE 'in_progress'
    END,
    updated_at = now()
  WHERE id = NEW.run_id AND signed_off_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_launch_pilot_check_progress ON public.launch_pilot_checks;
CREATE TRIGGER track_launch_pilot_check_progress
BEFORE UPDATE ON public.launch_pilot_checks
FOR EACH ROW EXECUTE FUNCTION public.track_launch_pilot_progress();

COMMENT ON TABLE public.launch_pilot_runs IS
  'Persistent, administrator-controlled evidence of a postcode pilot and final go-live sign-off.';
COMMENT ON TABLE public.launch_pilot_checks IS
  'Required end-to-end launch checks; signed-off runs are immutable.';
