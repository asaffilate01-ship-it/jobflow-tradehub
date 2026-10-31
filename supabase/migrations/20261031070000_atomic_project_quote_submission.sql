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

  IF v_labour < 0 OR v_labour > 9999999999
    OR v_materials < 0 OR v_materials > 9999999999
    OR v_delivery < 0 OR v_delivery > 9999999999
    OR v_labour::text = 'NaN' OR v_materials::text = 'NaN'
    OR v_delivery::text = 'NaN' OR pg_catalog.length(COALESCE(v_note, '')) > 3000 THEN
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
      OR v_qty::text = 'NaN' OR v_price::text = 'NaN' THEN
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
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_project_quote_atomic(uuid, uuid, jsonb, jsonb)
  TO authenticated;

COMMIT;
