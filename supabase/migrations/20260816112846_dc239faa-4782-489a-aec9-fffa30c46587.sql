CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  product_id text,
  tier text NOT NULL DEFAULT 'free',
  subscribed boolean NOT NULL DEFAULT false,
  subscription_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscribers TO authenticated;
GRANT ALL ON public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;
CREATE POLICY "Users can view own subscription" ON public.subscribers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscribers;
CREATE POLICY "Admins can view all subscriptions" ON public.subscribers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_subscribers_updated ON public.subscribers;
CREATE TRIGGER trg_subscribers_updated BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_tier()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN subscribed AND (subscription_end IS NULL OR subscription_end > now())
                 THEN tier ELSE 'free' END
       FROM public.subscribers WHERE user_id = auth.uid() LIMIT 1),
    'free')
$$;

REVOKE ALL ON FUNCTION public.current_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tier() TO authenticated, service_role;