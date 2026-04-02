
-- Add staff to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- Staff assignments: links staff users to trade companies
CREATE TABLE public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_company_id uuid NOT NULL REFERENCES public.trade_companies(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{"view_jobs": true, "view_orders": true, "view_schedule": true, "manage_jobs": false, "manage_orders": false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, trade_company_id)
);

ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

-- Staff can view their own assignments
CREATE POLICY "staff view own assignments"
  ON public.staff_assignments FOR SELECT
  USING (user_id = auth.uid());

-- Trade company owners manage their staff
CREATE POLICY "owners manage staff"
  ON public.staff_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.trade_companies tc
    WHERE tc.id = staff_assignments.trade_company_id
    AND tc.owner_profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trade_companies tc
    WHERE tc.id = staff_assignments.trade_company_id
    AND tc.owner_profile_id = auth.uid()
  ));

-- Admins can view all
CREATE POLICY "admins view all staff"
  ON public.staff_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_staff_assignments_updated_at
  BEFORE UPDATE ON public.staff_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
