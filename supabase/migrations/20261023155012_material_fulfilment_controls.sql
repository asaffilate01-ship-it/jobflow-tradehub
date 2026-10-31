BEGIN;
CREATE TABLE public.material_fulfilment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 material_order_id uuid NOT NULL REFERENCES public.material_orders(id),
 actor_id uuid NOT NULL REFERENCES public.profiles(id),
 request_key uuid NOT NULL,
 request_fingerprint text NOT NULL,
 action text NOT NULL,
 evidence text NOT NULL CHECK(length(evidence) BETWEEN 5 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(material_order_id,request_key)
);
ALTER TABLE public.material_fulfilment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read fulfilment evidence" ON public.material_fulfilment_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.material_fulfilment_events TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.material_fulfilment_events FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.material_fulfilment_board() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT coalesce(jsonb_agg(x.row),'[]'::jsonb) INTO result FROM (
 SELECT jsonb_build_object('id',m.id,'status',m.order_status,'mode',m.delivery_mode,'goods_total',m.goods_total,
 'delivery_fee',m.platform_delivery_fee,'reference',m.merchant_order_reference,'pickup_address',m.pickup_address,
 'delivery_address',m.delivery_address,'merchant',mer.name,'company',tc.legal_name,'created_at',m.created_at,
 'delivery_status',d.status,'distance_miles',d.estimated_distance_miles,
 'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.item_name,'quantity',i.quantity,'unit',i.unit,'unit_price',i.unit_price)),'[]'::jsonb) FROM public.order_items i WHERE i.material_order_id=m.id),
 'events',(SELECT coalesce(jsonb_agg(jsonb_build_object('action',e.action,'evidence',e.evidence,'created_at',e.created_at) ORDER BY e.created_at DESC),'[]'::jsonb) FROM public.material_fulfilment_events e WHERE e.material_order_id=m.id)) AS row
 FROM public.material_orders m JOIN public.merchants mer ON mer.id=m.merchant_id JOIN public.trade_companies tc ON tc.id=m.trade_company_id
 LEFT JOIN public.deliveries d ON d.material_order_id=m.id
 ORDER BY CASE WHEN m.order_status IN ('delivered','cancelled','collected') THEN 1 ELSE 0 END,m.created_at DESC LIMIT 200) x;
 RETURN result;
END $$;

CREATE FUNCTION public.material_fulfilment_action(p_order uuid,p_request_key uuid,p_action text,p_evidence text,p_reference text DEFAULT NULL,p_pickup text DEFAULT NULL,p_goods_total numeric DEFAULT NULL,p_distance numeric DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.material_orders; d public.deliveries; previous public.material_fulfilment_events; v_fingerprint text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_request_key IS NULL OR coalesce(length(trim(p_evidence)),0) NOT BETWEEN 5 AND 2000 THEN RAISE EXCEPTION 'Request key and confirmation evidence required'; END IF;
 -- Idempotency must bind every material argument, not just actor and action.
 -- Replaying a key with changed totals/evidence must be an error, not "success".
 v_fingerprint := pg_catalog.md5(pg_catalog.jsonb_build_object(
  'order',p_order,'action',p_action,'evidence',pg_catalog.btrim(p_evidence),
  'reference',pg_catalog.btrim(p_reference),'pickup',pg_catalog.btrim(p_pickup),
  'goods_total',p_goods_total,'distance',p_distance
 )::text);
 -- Match the driver's delivery-before-order lock order to avoid a dispatch/accept deadlock.
 SELECT * INTO d FROM public.deliveries WHERE material_order_id=p_order FOR UPDATE;
 SELECT * INTO m FROM public.material_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order unavailable'; END IF;
 SELECT * INTO previous FROM public.material_fulfilment_events WHERE material_order_id=p_order AND request_key=p_request_key;
 IF FOUND THEN
  IF previous.actor_id<>auth.uid() OR previous.action<>p_action OR previous.request_fingerprint IS DISTINCT FROM v_fingerprint THEN RAISE EXCEPTION 'Request key already used with different details'; END IF;
  RETURN m.id;
 END IF;
 IF p_action='confirm' THEN
  IF m.order_status<>'submitted' THEN RAISE EXCEPTION 'Only submitted requests can be confirmed'; END IF;
  IF coalesce(length(trim(p_reference)),0) NOT BETWEEN 1 AND 200 OR p_goods_total IS DISTINCT FROM m.goods_total THEN RAISE EXCEPTION 'Merchant reference and matching goods total required; changed prices need a new agreement'; END IF;
  IF m.delivery_mode='platform_driver' AND coalesce(length(trim(p_pickup)),0) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Confirmed pickup address required'; END IF;
  UPDATE public.material_orders SET order_status='confirmed',merchant_order_reference=trim(p_reference),pickup_address=coalesce(nullif(trim(p_pickup),''),pickup_address) WHERE id=m.id;
 ELSIF p_action='ready' THEN
  IF m.order_status<>'confirmed' THEN RAISE EXCEPTION 'Confirm merchant acceptance first'; END IF;
  UPDATE public.material_orders SET order_status='ready_for_pickup' WHERE id=m.id;
 ELSIF p_action='dispatch' THEN
  IF m.delivery_mode<>'platform_driver' OR m.order_status<>'ready_for_pickup' OR d.id IS NULL OR d.status<>'unassigned' OR d.driver_profile_id IS NOT NULL THEN RAISE EXCEPTION 'Ready, unassigned platform delivery required'; END IF;
  IF coalesce(length(trim(m.pickup_address)),0)<5 OR p_distance IS NULL OR p_distance IS DISTINCT FROM d.estimated_distance_miles OR p_distance NOT BETWEEN 0 AND 1000 THEN RAISE EXCEPTION 'Verify pickup and quoted route distance before dispatch; changed distance needs a new quote'; END IF;
  IF d.price_charged IS DISTINCT FROM m.platform_delivery_fee OR d.driver_payout<0 THEN RAISE EXCEPTION 'Delivery quote mismatch'; END IF;
  UPDATE public.deliveries SET status='broadcast' WHERE id=d.id;
 ELSIF p_action='cancel' THEN
  IF m.order_status NOT IN ('submitted','confirmed','ready_for_pickup') OR (d.id IS NOT NULL AND (d.driver_profile_id IS NOT NULL OR d.status NOT IN ('unassigned','broadcast'))) THEN RAISE EXCEPTION 'Cannot cancel after driver assignment or fulfilment'; END IF;
  UPDATE public.material_orders SET order_status='cancelled' WHERE id=m.id;
  IF d.id IS NOT NULL THEN UPDATE public.deliveries SET status='cancelled' WHERE id=d.id; END IF;
 ELSIF p_action='collected' THEN
  IF m.delivery_mode<>'trade_collect' OR m.order_status<>'ready_for_pickup' THEN RAISE EXCEPTION 'Ready collection request required'; END IF;
  UPDATE public.material_orders SET order_status='collected' WHERE id=m.id;
 ELSIF p_action='delivered' THEN
  IF m.delivery_mode<>'merchant_delivery' OR m.order_status NOT IN ('confirmed','ready_for_pickup') THEN RAISE EXCEPTION 'Confirmed merchant delivery required'; END IF;
  UPDATE public.material_orders SET order_status='delivered' WHERE id=m.id;
 ELSE RAISE EXCEPTION 'Unsupported fulfilment action';
 END IF;
 INSERT INTO public.material_fulfilment_events(material_order_id,actor_id,request_key,request_fingerprint,action,evidence) VALUES(m.id,auth.uid(),p_request_key,v_fingerprint,p_action,trim(p_evidence));
 RETURN m.id;
END $$;
REVOKE ALL ON FUNCTION public.material_fulfilment_board(),public.material_fulfilment_action(uuid,uuid,text,text,text,text,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.material_fulfilment_board(),public.material_fulfilment_action(uuid,uuid,text,text,text,text,numeric,numeric) TO authenticated;

-- Audit and order progression commit in the same transaction as driver state.
CREATE FUNCTION public.record_delivery_transition() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  INSERT INTO public.delivery_events(delivery_id,event_type,created_by,notes) VALUES(NEW.id,NEW.status::text,auth.uid(),'Server-recorded delivery transition');
  IF NEW.status IN ('collected','delivered') THEN
   UPDATE public.material_orders SET order_status=CASE NEW.status WHEN 'collected' THEN 'collected'::public.order_status ELSE 'delivered'::public.order_status END WHERE id=NEW.material_order_id;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_delivery_transition() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER delivery_transition_audit AFTER UPDATE OF status ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.record_delivery_transition();
-- Existing transactional RPCs remain the supported write boundary.
REVOKE INSERT,UPDATE,DELETE ON public.material_orders,public.order_items,public.deliveries,public.delivery_events FROM anon,authenticated;
COMMIT;
