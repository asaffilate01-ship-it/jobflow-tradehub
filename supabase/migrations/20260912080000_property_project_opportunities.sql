-- Extend existing jobs: quotes, evidence, milestones and variations keep their existing relationships/RLS.
ALTER TABLE public.jobs
  ADD COLUMN project_category text NOT NULL DEFAULT 'maintenance' CHECK (project_category IN ('maintenance','renovation','retrofit','empty_homes','adaptations','commercial','public_sector')),
  ADD COLUMN funding_stage text NOT NULL DEFAULT 'self_funded' CHECK (funding_stage IN ('self_funded','exploring','applied','approved')),
  ADD COLUMN planning_stage text NOT NULL DEFAULT 'unknown' CHECK (planning_stage IN ('unknown','not_required','preparing','submitted','approved')),
  ADD COLUMN planning_reference text,
  ADD COLUMN council_name text,
  ADD COLUMN required_credentials text,
  ADD COLUMN scope_notes text,
  ADD COLUMN site_visit_required boolean NOT NULL DEFAULT false;
CREATE INDEX jobs_project_category_idx ON public.jobs(project_category, created_at DESC);

-- Curated source records only. Never store applicant phone/email, health details or private grant files here.
CREATE TABLE public.project_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL CHECK (length(trim(source_name)) BETWEEN 1 AND 200),
  source_reference text NOT NULL CHECK (length(trim(source_reference)) BETWEEN 1 AND 200),
  source_url text NOT NULL CHECK (source_url ~ '^https://[^[:space:]]+$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  summary text NOT NULL DEFAULT '' CHECK (length(summary) <= 10000),
  opportunity_kind text NOT NULL CHECK (opportunity_kind IN ('planning','tender','funding')),
  project_category text NOT NULL CHECK (project_category IN ('maintenance','renovation','retrofit','empty_homes','adaptations','commercial','public_sector')),
  nation text NOT NULL CHECK (nation IN ('England','Scotland','Wales','Northern Ireland')),
  council_name text NOT NULL DEFAULT '',
  postcode_area text NOT NULL DEFAULT '',
  decision_status text NOT NULL DEFAULT '',
  decision_date date,
  deadline date,
  eligibility text NOT NULL DEFAULT '',
  required_credentials text NOT NULL DEFAULT '',
  reuse_basis text NOT NULL CHECK (length(trim(reuse_basis)) > 0),
  published boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_name, source_reference)
);
ALTER TABLE public.project_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage source opportunities" ON public.project_opportunities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members read published opportunities" ON public.project_opportunities FOR SELECT TO authenticated
  USING (published AND (opportunity_kind = 'funding' OR (
    public.has_role(auth.uid(), 'trade') AND EXISTS (
      SELECT 1 FROM public.subscribers s WHERE s.user_id = auth.uid() AND s.subscribed = true
      AND s.tier <> 'free' AND (s.subscription_end IS NULL OR s.subscription_end > now())
    )
  )));
CREATE INDEX project_opportunities_filter_idx ON public.project_opportunities(opportunity_kind, project_category, nation) WHERE published;
CREATE TABLE public.project_opportunity_saves (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.project_opportunities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(profile_id, opportunity_id)
);
ALTER TABLE public.project_opportunity_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own saves" ON public.project_opportunity_saves FOR SELECT TO authenticated USING(profile_id = auth.uid());
CREATE POLICY "members remove own saves" ON public.project_opportunity_saves FOR DELETE TO authenticated USING(profile_id = auth.uid());
CREATE POLICY "members save accessible opportunities" ON public.project_opportunity_saves FOR INSERT TO authenticated
  WITH CHECK(profile_id = auth.uid() AND EXISTS (SELECT 1 FROM public.project_opportunities o WHERE o.id = opportunity_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_opportunities TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.project_opportunity_saves TO authenticated;
COMMENT ON TABLE public.project_opportunities IS 'Source intelligence, not homeowner enquiries or guaranteed work. Publication requires source reuse review. Funding eligibility remains a decision of the administering body.';
