-- Allow public read access to material_orders for order verification (e.g. QR code scan by merchant)
CREATE POLICY "public verify order by id"
ON public.material_orders
FOR SELECT
TO anon, authenticated
USING (true);
