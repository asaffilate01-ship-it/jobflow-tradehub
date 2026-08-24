-- Fair-usage controls and privacy-preserving analytics for AI trade search.

CREATE TABLE public.ai_agent_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  agent text NOT NULL CHECK (agent IN ('trade_search')),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date, agent)
);

CREATE TABLE public.ai_trade_search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_fingerprint text NOT NULL,
  parsed_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_count integer NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_trade_search_events_user_created
  ON public.ai_trade_search_events(user_id, created_at DESC);

ALTER TABLE public.ai_agent_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trade_search_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_agent_daily_usage, public.ai_trade_search_events FROM anon, authenticated;
GRANT SELECT ON public.ai_agent_daily_usage, public.ai_trade_search_events TO authenticated;
GRANT ALL ON public.ai_agent_daily_usage, public.ai_trade_search_events TO service_role;

CREATE POLICY "users view own ai usage" ON public.ai_agent_daily_usage
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "users view own trade searches" ON public.ai_trade_search_events
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins view ai usage" ON public.ai_agent_daily_usage
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins view trade search events" ON public.ai_trade_search_events
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.consume_ai_agent_quota(
  p_user_id uuid,
  p_agent text DEFAULT 'trade_search'
) RETURNS TABLE (allowed boolean, used integer, daily_limit integer, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_used integer;
  v_tier text;
BEGIN
  IF p_agent <> 'trade_search' THEN RAISE EXCEPTION 'Unsupported AI agent'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'User not found'; END IF;

  SELECT CASE
    WHEN s.subscribed AND (s.subscription_end IS NULL OR s.subscription_end > now()) THEN s.tier
    ELSE 'free'
  END INTO v_tier
  FROM public.subscribers s
  WHERE s.user_id = p_user_id
  LIMIT 1;

  v_tier := COALESCE(v_tier, 'free');
  v_limit := CASE
    WHEN public.has_role(p_user_id, 'admin') THEN 500
    WHEN v_tier = 'premium' THEN 100
    WHEN v_tier = 'basic' THEN 30
    ELSE 5
  END;

  INSERT INTO public.ai_agent_daily_usage (user_id, usage_date, agent, request_count)
  VALUES (p_user_id, (timezone('utc', now()))::date, p_agent, 1)
  ON CONFLICT (user_id, usage_date, agent) DO UPDATE
    SET request_count = ai_agent_daily_usage.request_count + 1,
        updated_at = now()
    WHERE ai_agent_daily_usage.request_count < v_limit
  RETURNING request_count INTO v_used;

  IF v_used IS NULL THEN
    SELECT request_count INTO v_used
    FROM public.ai_agent_daily_usage
    WHERE user_id = p_user_id
      AND usage_date = (timezone('utc', now()))::date
      AND agent = p_agent;
    RETURN QUERY SELECT false, COALESCE(v_used, v_limit), v_limit, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_used, v_limit, GREATEST(v_limit - v_used, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_agent_quota(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_agent_quota(uuid,text) TO service_role;

COMMENT ON TABLE public.ai_trade_search_events IS
  'Stores a one-way query fingerprint and parsed filters only; raw user search text is not retained.';