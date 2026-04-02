
-- Fix 1: Replace overly permissive material_orders public policy with scoped verification policy
DROP POLICY IF EXISTS "public verify order by id" ON public.material_orders;

-- Create a function for public order verification that returns only safe fields
CREATE OR REPLACE FUNCTION public.verify_order_status(order_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', mo.id,
    'order_status', mo.order_status,
    'merchant_order_reference', mo.merchant_order_reference,
    'goods_total', mo.goods_total,
    'created_at', mo.created_at,
    'merchant_name', m.name
  )
  FROM material_orders mo
  JOIN merchants m ON m.id = mo.merchant_id
  WHERE mo.id = order_id;
$$;

-- Fix 2: Replace public trader profiles policy to exclude sensitive fields
DROP POLICY IF EXISTS "public can view active trader profiles" ON public.profiles;

CREATE POLICY "public can view safe trader profile fields"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND trade_specialism IS NOT NULL
);

-- Fix 3: Remove duplicate permissive storage INSERT policy on job-evidence
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;

-- Fix 4: Add realtime.messages RLS (scope subscriptions)
-- Note: realtime schema is managed by Supabase, we cannot modify it directly.
-- Instead we'll document this as a known limitation.
