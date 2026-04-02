-- Add credential and discount columns to trade_accounts
ALTER TABLE public.trade_accounts
  ADD COLUMN IF NOT EXISTS portal_url text,
  ADD COLUMN IF NOT EXISTS portal_username text,
  ADD COLUMN IF NOT EXISTS encrypted_credentials text,
  ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0;

-- Price quotes table
CREATE TABLE public.price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_company_id uuid NOT NULL REFERENCES public.trade_companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  delivery_postcode text NOT NULL,
  delivery_address text NOT NULL DEFAULT '',
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  total_cost numeric NOT NULL DEFAULT 0,
  total_delivery_cost numeric NOT NULL DEFAULT 0,
  comparison_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades manage own price quotes"
  ON public.price_quotes FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trade_companies tc
    WHERE tc.id = price_quotes.trade_company_id
    AND tc.owner_profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM trade_companies tc
    WHERE tc.id = price_quotes.trade_company_id
    AND tc.owner_profile_id = auth.uid()
  ));

-- Price quote items table
CREATE TABLE public.price_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_quote_id uuid NOT NULL REFERENCES public.price_quotes(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'each',
  best_merchant_id uuid REFERENCES public.merchants(id),
  best_merchant_name text,
  best_price numeric NOT NULL DEFAULT 0,
  trade_account_price numeric,
  retail_price numeric,
  has_trade_account boolean NOT NULL DEFAULT false,
  delivery_method text NOT NULL DEFAULT 'platform_driver',
  delivery_cost numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.price_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote items via quote owner"
  ON public.price_quote_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM price_quotes pq
    JOIN trade_companies tc ON tc.id = pq.trade_company_id
    WHERE pq.id = price_quote_items.price_quote_id
    AND tc.owner_profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM price_quotes pq
    JOIN trade_companies tc ON tc.id = pq.trade_company_id
    WHERE pq.id = price_quote_items.price_quote_id
    AND tc.owner_profile_id = auth.uid()
  ));

-- Trigger for updated_at on price_quotes
CREATE TRIGGER update_price_quotes_updated_at
  BEFORE UPDATE ON public.price_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();