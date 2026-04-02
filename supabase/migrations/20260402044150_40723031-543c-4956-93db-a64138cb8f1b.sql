-- Add new columns to merchants table
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'national',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS average_price_band text NOT NULL DEFAULT 'mid-range';

-- Update existing merchants with new field values
UPDATE public.merchants SET type = 'national', category = 'general', average_price_band = 'mid-range', postcode = 'SO15 1BA', website_url = 'https://www.tradepoint.co.uk' WHERE slug = 'tradepoint';
UPDATE public.merchants SET type = 'national', category = 'general', average_price_band = 'mid-range', postcode = 'WD6 1SA', website_url = 'https://www.wickes.co.uk' WHERE slug = 'wickes';
UPDATE public.merchants SET type = 'national', category = 'general', average_price_band = 'mid-range', postcode = 'B90 4LA', website_url = 'https://www.selcobw.com' WHERE slug = 'selco';
UPDATE public.merchants SET type = 'national', category = 'general', average_price_band = 'mid-range', postcode = 'SN15 1JN', website_url = 'https://www.jewson.co.uk' WHERE slug = 'jewson';
UPDATE public.merchants SET type = 'local', category = 'general', average_price_band = 'mid-range' WHERE slug = 'butterfields';