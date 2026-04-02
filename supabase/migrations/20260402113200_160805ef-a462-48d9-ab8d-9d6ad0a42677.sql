
-- Daily logs table (Buildertrend-style)
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT DEFAULT 'clear',
  temperature_c SMALLINT,
  wind TEXT,
  crew_count SMALLINT DEFAULT 0,
  crew_names TEXT[] DEFAULT '{}',
  hours_on_site NUMERIC(4,1) DEFAULT 0,
  work_summary TEXT NOT NULL DEFAULT '',
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  safety_incidents TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, log_date)
);

-- Enable RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Awarded trade manages daily logs
CREATE POLICY "awarded_trade_manages_daily_logs" ON public.daily_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_awards a
      JOIN trade_companies tc ON tc.id = a.trade_company_id
      WHERE a.job_id = daily_logs.job_id AND tc.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = author_id AND EXISTS (
      SELECT 1 FROM job_awards a
      JOIN trade_companies tc ON tc.id = a.trade_company_id
      WHERE a.job_id = daily_logs.job_id AND tc.owner_profile_id = auth.uid()
    )
  );

-- Customers view daily logs on their jobs
CREATE POLICY "customers_view_daily_logs" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j WHERE j.id = daily_logs.job_id AND j.customer_profile_id = auth.uid()
    )
  );

-- Admins read all
CREATE POLICY "admins_read_daily_logs" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for daily logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
