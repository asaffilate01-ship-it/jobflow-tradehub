-- Submit a project quote, itemised lines and job status as one atomic operation.
-- This protects against partial quotes and prevents a client from writing a
-- GENERATED ALWAYS total_amount column. All writes roll back on any error.
BEGIN;

ALTER TABLE public.quote_lines
  DROP CONSTRAINT IF EXISTS quote_lines_line_type_check;
ALTER TABLE public.quote_lines
  ADD CONSTRAINT quote_lines_line_type_check
  CHECK (line_type IN ('labour', 'materials', 'delivery', 'plant', 'other'));

CREATE OR REPLACE FUNCTION public.submit_project_quote_atomic(
  p_job_id uuid,
  p_trade_company_id uuid,
  p_summary jsonb,
  p_lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_quote_id uuid;
  v_item jsonb;
  v_description text;
  v_kind text;
  v_qty numeric;
  v_price numeric;
  v_labour numeric;
  v_materials numeric;
  v_delivery numeric;
  v_note text;
  v_total numeric;
  v_lines_total numeric := 0;
  v_lines_labour numeric := 0;
  v_lines_materials numeric := 0;
  v_lines_delivery numeric := 0;
BEGIN
  IF auth.uid() IS NULL OR p_job_id IS NULL OR p_trade_company_id IS NULL THEN
    RAISE EXCEPTION 'Sign in and select a job and trade company to submit a quote';
  END IF;
  IF pg_catalog.jsonb_typeof(p_summary) IS DISTINCT FROM 'object'
    OR pg_catalog.jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
    OR pg_catalog.jsonb_array_length(p_lines) > 50 THEN
    RAISE EXCEPTION 'Invalid quote summary or itemised breakdown';
  END IF;

  -- Lock the job first: competing submissions and stale status transitions
  -- cannot succeed after an award, cancellation or completion.
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;
  IF NOT FOUND OR v_job.status NOT IN ('posted', 'quoted') OR v_job.job_kind = 'repair' THEN
    RAISE EXCEPTION 'This project is no longer accepting quotes';
  END IF;

  -- SECURITY DEFINER requires explicit authorisation, independent of client
  -- payload or RLS visibility. The server-owned subscription is authoritative.
  IF NOT EXISTS (
    SELECT 1
    FROM public.trade_companies tc
    JOIN public.profiles pr ON pr.id = tc.owner_profile_id
    JOIN public.user_roles ur ON ur.user_id = tc.owner_profile_id AND ur.role = 'trade'
    JOIN public.subscribers sub ON sub.user_id = tc.owner_profile_id
    WHERE tc.id = p_trade_company_id
      AND tc.owner_profile_id = auth.uid()
      AND pr.is_active = true
      AND pr.verified = true
      AND sub.subscribed = true
      AND sub.tier <> 'free'
      AND (sub.subscription_end IS NULL OR sub.subscription_end > now())
  ) THEN
    RAISE EXCEPTION 'A verified trader with an active subscription is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.quotes
    WHERE job_id = p_job_id AND trade_company_id = p_trade_company_id
  ) THEN
    RAISE EXCEPTION 'A quote from your company has already been submitted for this job';
  END IF;

  v_labour := COALESCE((p_summary ->> 'labour_amount')::numeric, 0);
  v_materials := COALESCE((p_summary ->> 'materials_estimate')::numeric, 0);
  v_delivery := COALESCE((p_summary ->> 'delivery_estimate')::numeric, 0);
  v_note := NULLIF(pg_catalog.btrim(COALESCE(p_summary ->> 'notes', '')), '');

  -- Numeric(12,2) storage rounds on INSERT. Reject sub-penny values
  -- rather than accepting a payload whose recorded total then differs.
  IF v_labour < 0 OR v_labour > 9999999999
    OR v_materials < 0 OR v_materials > 9999999999
    OR v_delivery < 0 OR v_delivery > 9999999999
    OR v_labour::text = 'NaN' OR v_materials::text = 'NaN'
    OR v_delivery::text = 'NaN'
    OR v_labour IS DISTINCT FROM pg_catalog.round(v_labour, 2)
    OR v_materials IS DISTINCT FROM pg_catalog.round(v_materials, 2)
    OR v_delivery IS DISTINCT FROM pg_catalog.round(v_delivery, 2)
    OR pg_catalog.length(COALESCE(v_note, '')) > 3000 THEN
    RAISE EXCEPTION 'Quote amounts and notes must be valid and non-negative';
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_lines)
  LOOP
    IF pg_catalog.jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid quote line';
    END IF;
    v_description := pg_catalog.btrim(COALESCE(v_item ->> 'description', ''));
    v_kind := v_item ->> 'line_type';
    v_qty := (v_item ->> 'quantity')::numeric;
    v_price := (v_item ->> 'unit_price')::numeric;
    IF pg_catalog.length(v_description) = 0
      OR pg_catalog.length(v_description) > 500
      OR v_kind NOT IN ('labour', 'materials', 'delivery', 'plant', 'other')
      OR v_kind IS NULL
      OR v_qty IS NULL OR v_qty <= 0 OR v_qty > 100000
      OR v_price IS NULL OR v_price < 0 OR v_price > 999999999
      OR v_qty::text = 'NaN' OR v_price::text = 'NaN'
      OR v_qty IS DISTINCT FROM pg_catalog.round(v_qty, 2)
      OR v_price IS DISTINCT FROM pg_catalog.round(v_price, 2) THEN
      RAISE EXCEPTION 'Every quote line needs a description, valid type, quantity and price';
    END IF;

    v_lines_total := v_lines_total + pg_catalog.round(v_qty * v_price, 2);
    CASE v_kind
      WHEN 'labour' THEN v_lines_labour := v_lines_labour + pg_catalog.round(v_qty * v_price, 2);
      WHEN 'delivery' THEN v_lines_delivery := v_lines_delivery + pg_catalog.round(v_qty * v_price, 2);
      ELSE v_lines_materials := v_lines_materials + pg_catalog.round(v_qty * v_price, 2);
    END CASE;
  END LOOP;

  -- Summary-only and itemised-only quotes both work. When both are entered,
  -- refuse contradictory totals rather than making up a customer-facing sum.
  v_total := v_labour + v_materials + v_delivery;
  IF v_total = 0 AND v_lines_total > 0 THEN
    v_labour := v_lines_labour;
    v_materials := v_lines_materials;
    v_delivery := v_lines_delivery;
    v_total := v_lines_total;
  ELSIF v_lines_total > 0 AND pg_catalog.abs(v_total - v_lines_total) > 0.01 THEN
    RAISE EXCEPTION 'Itemised lines must match the quote summary total';
  END IF;

  IF v_total <= 0 OR v_total > 9999999999 THEN
    RAISE EXCEPTION 'Enter a positive quote total';
  END IF;

  INSERT INTO public.quotes (
    job_id, trade_company_id, labour_amount, materials_estimate,
    delivery_estimate, notes
  )
  VALUES (
    p_job_id, p_trade_company_id, v_labour, v_materials, v_delivery, v_note
  )
  RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO public.quote_lines (
      quote_id, description, line_type, quantity, unit_price
    ) VALUES (
      v_quote_id,
      pg_catalog.btrim(v_item ->> 'description'),
      v_item ->> 'line_type',
      (v_item ->> 'quantity')::numeric,
      (v_item ->> 'unit_price')::numeric
    );
  END LOOP;

  UPDATE public.jobs SET status = 'quoted'
  WHERE id = p_job_id AND status = 'posted';

  RETURN v_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_project_quote_atomic(uuid, uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_quote_atomic(uuid, uuid, jsonb, jsonb)
  TO authenticated;


-- Retire the legacy directly writable quotes API: it permitted an eligible
-- trader to insert an unvalidated quote or change a submitted price/status.
-- Repair offers and project quote/acceptance remain available through their
-- independently authorised SECURITY DEFINER transactions.
DROP POLICY IF EXISTS "trades manage own quotes" ON public.quotes;
CREATE POLICY "trades read own quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trade_companies tc
    WHERE tc.id = quotes.trade_company_id
      AND tc.owner_profile_id = (SELECT auth.uid())
  ));

ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quote participants read lines" ON public.quote_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_lines.quote_id
  ));

REVOKE INSERT, UPDATE, DELETE ON public.quotes, public.quote_lines
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quotes, public.quote_lines TO authenticated;

-- The customer rejection button must not attempt an unauthorised direct
-- UPDATE (the old UI ignored that error and could notify a false rejection).
-- Lock job before quote, consistent with accept_project_quote.
CREATE OR REPLACE FUNCTION public.reject_project_quote(p_quote uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $reject$
DECLARE
  v_job_id uuid;
  v_job public.jobs%ROWTYPE;
  v_quote public.quotes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_quote IS NULL THEN
    RAISE EXCEPTION 'Sign in and select a quote';
  END IF;
  SELECT q.job_id INTO v_job_id FROM public.quotes q WHERE q.id = p_quote;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote unavailable'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = v_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.customer_profile_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Job owner required';
  END IF;
  IF v_job.job_kind = 'repair' THEN
    RAISE EXCEPTION 'Use the repair offer decline workflow';
  END IF;
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote FOR UPDATE;
  IF NOT FOUND OR v_quote.job_id IS DISTINCT FROM v_job.id THEN
    RAISE EXCEPTION 'Quote unavailable';
  END IF;
  IF v_quote.status = 'rejected' THEN RETURN v_quote.id; END IF;
  IF v_job.status NOT IN ('posted','quoted') OR v_quote.status <> 'submitted' THEN
    RAISE EXCEPTION 'Job or quote is no longer available';
  END IF;
  UPDATE public.quotes SET status = 'rejected' WHERE id = p_quote;
  RETURN p_quote;
END;
$reject$;

REVOKE ALL ON FUNCTION public.reject_project_quote(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_project_quote(uuid)
  TO authenticated;

COMMIT;
