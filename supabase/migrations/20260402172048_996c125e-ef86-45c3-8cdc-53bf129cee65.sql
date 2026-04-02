
-- Add agent to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';

-- Agents table
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  commission_rate numeric NOT NULL DEFAULT 10,
  commission_type text NOT NULL DEFAULT 'percentage',
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  total_earned numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents view own data" ON public.agents
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "agents update own data" ON public.agents
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "admins manage agents" ON public.agents
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Agent referrals table
CREATE TABLE public.agent_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL,
  referral_type text NOT NULL DEFAULT 'trader',
  status text NOT NULL DEFAULT 'pending',
  commission_earned numeric NOT NULL DEFAULT 0,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents view own referrals" ON public.agent_referrals
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.agents a WHERE a.id = agent_referrals.agent_id AND a.profile_id = auth.uid()
  ));

CREATE POLICY "admins manage referrals" ON public.agent_referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Agent commissions table
CREATE TABLE public.agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.agent_referrals(id),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  period_start date,
  period_end date,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents view own commissions" ON public.agent_commissions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.agents a WHERE a.id = agent_commissions.agent_id AND a.profile_id = auth.uid()
  ));

CREATE POLICY "admins manage commissions" ON public.agent_commissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
