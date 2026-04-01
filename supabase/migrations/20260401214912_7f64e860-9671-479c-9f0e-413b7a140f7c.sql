
-- Job tasks (kanban)
CREATE TABLE public.job_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assigned_to uuid REFERENCES public.profiles(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job parties view tasks" ON public.job_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_tasks.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = job_tasks.job_id AND tc.owner_profile_id = auth.uid())
);

CREATE POLICY "awarded trade manages tasks" ON public.job_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = job_tasks.job_id AND tc.owner_profile_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = job_tasks.job_id AND tc.owner_profile_id = auth.uid())
);

CREATE TRIGGER update_job_tasks_updated_at BEFORE UPDATE ON public.job_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Job milestones (payment stages)
CREATE TABLE public.job_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  due_date date,
  proof_note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job parties view milestones" ON public.job_milestones FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_milestones.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = job_milestones.job_id AND tc.owner_profile_id = auth.uid())
);

CREATE POLICY "awarded trade manages milestones" ON public.job_milestones FOR ALL USING (
  EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = job_milestones.job_id AND tc.owner_profile_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = job_milestones.job_id AND tc.owner_profile_id = auth.uid())
);

CREATE TRIGGER update_job_milestones_updated_at BEFORE UPDATE ON public.job_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Change orders
CREATE TABLE public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description text NOT NULL,
  cost_delta numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected')),
  proposed_by uuid NOT NULL REFERENCES public.profiles(id),
  signed_by_customer boolean NOT NULL DEFAULT false,
  signed_by_trader boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job parties view change orders" ON public.change_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = change_orders.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = change_orders.job_id AND tc.owner_profile_id = auth.uid())
);

CREATE POLICY "awarded trade proposes change orders" ON public.change_orders FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = proposed_by
    AND EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = change_orders.job_id AND tc.owner_profile_id = auth.uid())
  );

CREATE POLICY "job parties update change orders" ON public.change_orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = change_orders.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = change_orders.job_id AND tc.owner_profile_id = auth.uid())
);

-- Snag items
CREATE TABLE public.snag_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  photo_path text,
  reported_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.snag_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job parties manage snags" ON public.snag_items FOR ALL USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = snag_items.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = snag_items.job_id AND tc.owner_profile_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = snag_items.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_awards a JOIN trade_companies tc ON tc.id = a.trade_company_id WHERE a.job_id = snag_items.job_id AND tc.owner_profile_id = auth.uid())
);

-- Compliance certificates
CREATE TABLE public.compliance_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  trade_company_id uuid NOT NULL REFERENCES public.trade_companies(id),
  cert_type text NOT NULL, -- 'gas_safe_cp12', 'gas_safe_cp42', 'eicr', 'part_p', 'rics_survey', 'building_regs', 'generic'
  cert_number text,
  issued_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'expired')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb, -- type-specific structured fields
  pdf_path text,
  issued_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job parties view certs" ON public.compliance_certificates FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = compliance_certificates.job_id AND j.customer_profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM trade_companies tc WHERE tc.id = compliance_certificates.trade_company_id AND tc.owner_profile_id = auth.uid())
);

CREATE POLICY "trades manage own certs" ON public.compliance_certificates FOR ALL USING (
  EXISTS (SELECT 1 FROM trade_companies tc WHERE tc.id = compliance_certificates.trade_company_id AND tc.owner_profile_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM trade_companies tc WHERE tc.id = compliance_certificates.trade_company_id AND tc.owner_profile_id = auth.uid())
);

CREATE TRIGGER update_compliance_certs_updated_at BEFORE UPDATE ON public.compliance_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for job evidence (photos, videos, PDFs)
INSERT INTO storage.buckets (id, name, public) VALUES ('job-evidence', 'job-evidence', true);

-- Storage policies
CREATE POLICY "Authenticated users upload evidence" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-evidence');

CREATE POLICY "Anyone can view job evidence" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-evidence');

CREATE POLICY "Users can delete own evidence" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'job-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
