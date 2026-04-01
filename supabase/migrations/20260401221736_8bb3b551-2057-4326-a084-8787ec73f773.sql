
-- Allow trades to insert deliveries for their own material orders
CREATE POLICY "trades create deliveries for own orders"
ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM material_orders mo
    JOIN trade_companies tc ON tc.id = mo.trade_company_id
    WHERE mo.id = deliveries.material_order_id
    AND tc.owner_profile_id = auth.uid()
  )
);

-- Allow assigned drivers to update their deliveries
CREATE POLICY "drivers update assigned deliveries"
ON public.deliveries FOR UPDATE TO authenticated
USING (driver_profile_id = auth.uid())
WITH CHECK (driver_profile_id = auth.uid());

-- Allow drivers to accept broadcast deliveries (update unassigned)
CREATE POLICY "drivers accept broadcast deliveries"
ON public.deliveries FOR UPDATE TO authenticated
USING (status IN ('unassigned', 'broadcast') AND driver_profile_id IS NULL);

-- Allow drivers to insert delivery events
CREATE POLICY "drivers insert delivery events"
ON public.delivery_events FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_events.delivery_id
    AND d.driver_profile_id = auth.uid()
  )
);

-- Allow trades to insert delivery events for their orders
CREATE POLICY "trades insert delivery events"
ON public.delivery_events FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM deliveries d
    JOIN material_orders mo ON mo.id = d.material_order_id
    JOIN trade_companies tc ON tc.id = mo.trade_company_id
    WHERE d.id = delivery_events.delivery_id
    AND tc.owner_profile_id = auth.uid()
  )
);

-- Enable realtime for deliveries
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
