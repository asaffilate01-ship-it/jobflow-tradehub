BEGIN;
-- Narrow RPC avoids granting drivers access to other customers' jobs/orders.
CREATE FUNCTION public.driver_delivery_board() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'driver') OR NOT EXISTS(SELECT 1 FROM public.driver_profiles WHERE profile_id=auth.uid() AND verified) THEN RAISE EXCEPTION 'Verified driver required'; END IF;
 SELECT coalesce(jsonb_agg(x.row),'[]'::jsonb) INTO result FROM (
 SELECT jsonb_build_object('id',d.id,'status',d.status,'price_charged',d.price_charged,'driver_payout',d.driver_payout,'platform_margin',d.platform_margin,
 'estimated_distance_miles',d.estimated_distance_miles,'driver_profile_id',d.driver_profile_id,'assigned_at',d.assigned_at,'delivered_at',d.delivered_at,'created_at',d.created_at,
 'material_order',jsonb_build_object('id',m.id,'delivery_address',CASE WHEN d.driver_profile_id=auth.uid() THEN m.delivery_address ELSE '' END,
 'pickup_address',CASE WHEN d.driver_profile_id=auth.uid() THEN m.pickup_address ELSE NULL END,'urgency',m.urgency,'required_vehicle',m.required_vehicle,'delivery_mode',m.delivery_mode,
 'notes',CASE WHEN d.driver_profile_id=auth.uid() THEN m.notes ELSE 'Exact addresses released after acceptance.' END,
 'merchant',jsonb_build_object('name',mer.name),'job',NULL),'driver_profile',NULL) AS row
 FROM public.deliveries d JOIN public.material_orders m ON m.id=d.material_order_id JOIN public.merchants mer ON mer.id=m.merchant_id
 WHERE d.driver_profile_id=auth.uid() OR (d.driver_profile_id IS NULL AND d.status='broadcast' AND m.order_status IN ('confirmed','ready_for_pickup')
 AND EXISTS(SELECT 1 FROM public.driver_profiles dp WHERE dp.profile_id=auth.uid() AND dp.available AND (m.required_vehicle IS NULL OR dp.vehicle_type=m.required_vehicle)))
 ORDER BY d.created_at DESC LIMIT 50) x;
 RETURN result;
END $$;
CREATE FUNCTION public.driver_delivery_action(p_delivery uuid,p_status public.delivery_status) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deliveries; m public.material_orders; dp public.driver_profiles; next_status public.delivery_status;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'driver') THEN RAISE EXCEPTION 'Driver required'; END IF;
 SELECT * INTO dp FROM public.driver_profiles WHERE profile_id=auth.uid() AND verified;
 IF NOT FOUND THEN RAISE EXCEPTION 'Verified driver required'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=p_delivery FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery unavailable'; END IF;
 SELECT * INTO m FROM public.material_orders WHERE id=d.material_order_id;
 IF d.driver_profile_id=auth.uid() AND d.status=p_status THEN RETURN d.id; END IF;
 IF p_status='assigned' THEN
  IF d.driver_profile_id IS NOT NULL OR d.status<>'broadcast' OR m.order_status NOT IN ('confirmed','ready_for_pickup') OR NOT dp.available OR (m.required_vehicle IS NOT NULL AND m.required_vehicle<>dp.vehicle_type) THEN RAISE EXCEPTION 'Delivery no longer available for this driver'; END IF;
  UPDATE public.deliveries SET driver_profile_id=auth.uid(),status='assigned',assigned_at=now() WHERE id=d.id;
 ELSE
  IF d.driver_profile_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Assigned driver required'; END IF;
  next_status:=CASE d.status WHEN 'assigned' THEN 'arrived_at_pickup'::public.delivery_status WHEN 'arrived_at_pickup' THEN 'collected'::public.delivery_status WHEN 'collected' THEN 'en_route'::public.delivery_status WHEN 'en_route' THEN 'delivered'::public.delivery_status ELSE NULL END;
  IF next_status IS NULL OR p_status IS DISTINCT FROM next_status THEN RAISE EXCEPTION 'Invalid delivery transition'; END IF;
  UPDATE public.deliveries SET status=p_status,delivered_at=CASE WHEN p_status='delivered' THEN now() ELSE delivered_at END WHERE id=d.id;
 END IF;
 RETURN d.id;
END $$;
REVOKE ALL ON FUNCTION public.driver_delivery_board(),public.driver_delivery_action(uuid,public.delivery_status) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.driver_delivery_board(),public.driver_delivery_action(uuid,public.delivery_status) TO authenticated;
-- State and payout mutation goes through controlled server functions.
REVOKE UPDATE ON public.deliveries FROM authenticated,anon;
COMMIT;
