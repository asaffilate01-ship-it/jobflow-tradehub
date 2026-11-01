-- Crafted as a forward-only release candidate; never apply to production
-- before the matching lead-board + quote-route frontend has been tested.
-- Existing project lead RLS returned the *entire* jobs row (street + postcode)
-- to any paid trader. A React mask did not protect PostgREST queries.
BEGIN;

-- Preserve owner and admin access and the already-scoped repair award policy.
-- Remove only the broad ordinary-project SELECT grants that disclose job rows
-- including the customer's street, exact postcode and private scope.
DROP POLICY IF EXISTS "trades view posted jobs" ON public.jobs;
DROP POLICY IF EXISTS "trades view posted jobs scoped" ON public.jobs;
DROP POLICY IF EXISTS "trades view ordinary project jobs" ON public.jobs;
DROP POLICY IF EXISTS "subscribed trades view ordinary project jobs" ON public.jobs;
DROP POLICY IF EXISTS "awarded contractors read accepted project jobs" ON public.jobs;

-- An accepted/awarded contractor sees private project details only when a
-- trusted job_awards record points to their company. A customer-controlled
-- jobs.trade_company_id value alone cannot unlock private addresses.
CREATE POLICY "awarded contractors read accepted project jobs"
ON public.jobs FOR SELECT TO authenticated
USING (
  job_kind = 'project'
  AND EXISTS (
    SELECT 1
    FROM public.job_awards a
    JOIN public.trade_companies tc ON tc.id = a.trade_company_id
    WHERE a.job_id = jobs.id
      AND tc.owner_profile_id = (SELECT auth.uid())
  )
);

-- job_awards is the source of truth for the above access decision. A table
-- without RLS/direct-write restrictions would let a client mint its own award.
ALTER TABLE public.job_awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authorised parties read job awards" ON public.job_awards;
CREATE POLICY "authorised parties read job awards"
ON public.job_awards FOR SELECT TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.trade_companies tc
    WHERE tc.id = job_awards.trade_company_id
      AND tc.owner_profile_id = (SELECT auth.uid())
  )
);
REVOKE ALL ON TABLE public.job_awards FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.job_awards TO authenticated;
-- The accept_project_quote / accept_repair_offer server functions still write
-- awards as their function owner, after checking job and quote permissions.

-- This RPC deliberately uses a SECURITY DEFINER execution context, because
-- unselected traders no longer have jobs.SELECT. It is a narrowly scoped
-- exception that returns only explicitly permitted columns (not SELECT *).
-- Never include the customer's street, full postcode, name, private fields,
-- stored description, attachment paths or free-form title here. Customer text
-- may itself contain personally identifying details and needs future review.
CREATE OR REPLACE FUNCTION public.list_project_job_previews(p_job_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  title text,
  requested_trade public.trade_type,
  city text,
  postcode_district text,
  status public.job_status,
  created_at timestamptz,
  project_category text,
  budget_min numeric,
  budget_max numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Explicit authorisation is required even though the definer can read jobs.
  -- Neither client-supplied role metadata nor a claimed subscription is trusted.
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'trade')
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active IS TRUE
        AND p.verified IS TRUE
        AND p.kyc_status = 'approved'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.subscribers s
      WHERE s.user_id = auth.uid()
        AND s.subscribed IS TRUE
        AND s.tier <> 'free'
        AND (s.subscription_end IS NULL OR s.subscription_end > now())
    )
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    j.id,
    pg_catalog.initcap(pg_catalog.replace(j.requested_trade::text, '_', ' ')) || ' project',
    j.requested_trade,
    j.city,
    CASE
      -- UK outward district only. Never return the full inward code, even if
      -- the stored postcode was entered without a space.
      WHEN pg_catalog.upper(pg_catalog.btrim(j.postcode)) ~
        '^[A-Z]{1,2}[0-9][A-Z0-9]?[[:space:]]*[0-9][A-Z]{2}$'
      THEN pg_catalog.regexp_replace(
        pg_catalog.upper(pg_catalog.btrim(j.postcode)),
        '[[:space:]]*[0-9][A-Z]{2}$',
        ''
      )
      ELSE NULL
    END,
    j.status,
    j.created_at,
    j.project_category,
    j.budget_min,
    j.budget_max
  FROM public.jobs j
  WHERE j.job_kind = 'project'
    AND j.status IN ('posted','quoted')
    AND (p_job_id IS NULL OR j.id = p_job_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.job_awards a WHERE a.job_id = j.id
    )
  ORDER BY j.created_at DESC
  LIMIT CASE WHEN p_job_id IS NULL THEN 100 ELSE 1 END;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_project_job_previews(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_job_previews(uuid)
  TO authenticated;

COMMIT;
