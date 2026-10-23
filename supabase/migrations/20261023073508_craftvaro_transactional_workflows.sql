-- Atomic local workflows. Merchant fulfilment and payment remain external.
BEGIN;
ALTER TABLE public.material_orders ADD COLUMN request_key uuid;
CREATE UNIQUE INDEX material_order_request_key ON public.material_orders(created_by,request_key) WHERE request_key IS NOT NULL;

CREATE FUNCTION public.accept_project_quote(p_quote uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.quotes; j public.jobs; existing public.job_awards;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO q FROM public.quotes WHERE id=p_quote;
 IF NOT FOUND THEN RAISE EXCEPTION 'Quote unavailable'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=q.job_id FOR UPDATE;
 IF j.customer_profile_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Job owner required'; END IF;
 IF j.job_kind='repair' THEN RAISE EXCEPTION 'Use repair offer acceptance'; END IF;
 SELECT * INTO existing FROM public.job_awards WHERE job_id=j.id;
 IF FOUND THEN
  IF existing.accepted_quote_id=p_quote THEN RETURN existing.id; END IF;
  RAISE EXCEPTION 'Job already awarded';
 END IF;
 SELECT * INTO q FROM public.quotes WHERE id=p_quote FOR UPDATE;
 IF q.status<>'submitted' OR j.status NOT IN ('posted','quoted') THEN RAISE EXCEPTION 'Job or quote is no longer available'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.trade_companies c JOIN public.profiles p ON p.id=c.owner_profile_id JOIN public.subscribers s ON s.user_id=p.id
 WHERE c.id=q.trade_company_id AND p.verified AND p.is_active AND s.subscribed AND s.tier<>'free' AND (s.subscription_end IS NULL OR s.subscription_end>now()))
 THEN RAISE EXCEPTION 'Trader must be verified with an active subscription'; END IF;
 UPDATE public.quotes SET status='rejected' WHERE job_id=j.id AND id<>q.id AND status='submitted';
 UPDATE public.quotes SET status='accepted' WHERE id=q.id;
 INSERT INTO public.job_awards(job_id,accepted_quote_id,trade_company_id) VALUES(j.id,q.id,q.trade_company_id) RETURNING * INTO existing;
 UPDATE public.jobs SET status='awarded',trade_company_id=q.trade_company_id WHERE id=j.id;
 RETURN existing.id;
END $$;
REVOKE ALL ON FUNCTION public.accept_project_quote(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accept_project_quote(uuid) TO authenticated;

CREATE FUNCTION public.create_material_request(p_request_key uuid,p_order jsonb,p_items jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid; v_job uuid; v_merchant uuid; v_branch uuid; v_account uuid; v_order uuid;
 v_item jsonb; v_total numeric:=0; v_mode public.merchant_delivery_mode; v_vehicle public.vehicle_type;
 v_urgency public.urgency_level; v_miles numeric; v_manpower integer; v_rate public.delivery_rate_card_rows;
 v_payout numeric:=0; v_fee numeric:=0;
BEGIN
 IF auth.uid() IS NULL OR p_request_key IS NULL THEN RAISE EXCEPTION 'Authenticated request key required'; END IF;
 -- Serialise retries before checking the unique key, including concurrent retries.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_key::text,0));
 SELECT id INTO v_order FROM public.material_orders WHERE created_by=auth.uid() AND request_key=p_request_key;
 IF FOUND THEN RETURN v_order; END IF;
 v_company:=(p_order->>'trade_company_id')::uuid; v_job:=(p_order->>'job_id')::uuid; v_merchant:=(p_order->>'merchant_id')::uuid;
 v_branch:=nullif(p_order->>'merchant_branch_id','')::uuid; v_account:=nullif(p_order->>'trade_account_id','')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.trade_companies WHERE id=v_company AND owner_profile_id=auth.uid()) THEN RAISE EXCEPTION 'Company owner required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND kyc_status='approved' AND is_active) THEN RAISE EXCEPTION 'Approved verification required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.subscribers WHERE user_id=auth.uid() AND subscribed AND tier='premium' AND (subscription_end IS NULL OR subscription_end>now())) THEN RAISE EXCEPTION 'Active Premium subscription required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND trade_company_id=v_company AND status IN ('awarded','active')) THEN RAISE EXCEPTION 'Active awarded job required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.merchants WHERE id=v_merchant) THEN RAISE EXCEPTION 'Merchant unavailable'; END IF;
 IF v_branch IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.merchant_branches WHERE id=v_branch AND merchant_id=v_merchant) THEN RAISE EXCEPTION 'Branch does not belong to merchant'; END IF;
 IF v_account IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.trade_accounts WHERE id=v_account AND merchant_id=v_merchant AND trade_company_id=v_company) THEN RAISE EXCEPTION 'Invalid trade account'; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 items'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(length(trim(v_item->>'item_name')),0) NOT BETWEEN 1 AND 300 OR
    coalesce((v_item->>'quantity')::numeric,0) NOT BETWEEN 0.01 AND 100000 OR
    coalesce((v_item->>'unit_price')::numeric,-1) NOT BETWEEN 0 AND 1000000 THEN RAISE EXCEPTION 'Invalid item'; END IF;
  v_total:=v_total+round((v_item->>'quantity')::numeric*(v_item->>'unit_price')::numeric,2);
 END LOOP;
 v_mode:=(p_order->>'delivery_mode')::public.merchant_delivery_mode;
 IF v_mode IS NULL OR coalesce(length(trim(p_order->>'delivery_address')),0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Delivery mode and address required'; END IF;
 v_urgency:=coalesce(nullif(p_order->>'urgency',''),'standard')::public.urgency_level;
 v_vehicle:=nullif(p_order->>'required_vehicle','')::public.vehicle_type;
 v_manpower:=coalesce((p_order->>'manpower_required')::integer,1);
 IF v_manpower NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'Invalid manpower'; END IF;
 IF v_mode='platform_driver' THEN
  v_miles:=(p_order->>'estimated_distance_miles')::numeric;
  IF v_miles IS NULL OR v_miles NOT BETWEEN 0 AND 1000 OR v_vehicle IS NULL THEN RAISE EXCEPTION 'Vehicle and estimated distance required'; END IF;
  SELECT r.* INTO v_rate FROM public.delivery_rate_card_rows r JOIN public.delivery_rate_cards c ON c.id=r.rate_card_id
   WHERE c.active AND r.vehicle_type=v_vehicle AND r.urgency=v_urgency AND v_miles>=r.min_miles AND (r.max_miles IS NULL OR v_miles<=r.max_miles)
   ORDER BY c.created_at DESC,r.min_miles DESC,r.id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No delivery rate configured for this request'; END IF;
  v_payout:=round(v_rate.base_fee+v_miles*v_rate.per_mile_fee+greatest(v_manpower-1,0)*v_rate.manpower_fee,2);
  v_fee:=round(v_payout*(1+v_rate.percentage_markup/100),2);
 END IF;
 -- This is a saved request, not evidence the merchant accepted or was paid.
 INSERT INTO public.material_orders(job_id,trade_company_id,merchant_id,merchant_branch_id,trade_account_id,delivery_mode,order_status,
 goods_total,platform_delivery_fee,pickup_address,delivery_address,required_vehicle,urgency,manpower_required,notes,created_by,request_key)
 VALUES(v_job,v_company,v_merchant,v_branch,v_account,v_mode,'submitted',v_total,v_fee,
 (SELECT address_line1 FROM public.merchant_branches WHERE id=v_branch),p_order->>'delivery_address',v_vehicle,v_urgency,v_manpower,
 left(coalesce(p_order->>'notes',''),4000),auth.uid(),p_request_key) RETURNING id INTO v_order;
 INSERT INTO public.order_items(material_order_id,item_name,quantity,unit,unit_price,category,sku)
 SELECT v_order,x->>'item_name',(x->>'quantity')::numeric,left(x->>'unit',30),(x->>'unit_price')::numeric,left(x->>'category',100),left(x->>'sku',100) FROM jsonb_array_elements(p_items) x;
 IF v_mode='platform_driver' THEN
  INSERT INTO public.deliveries(material_order_id,price_charged,driver_payout,platform_margin,estimated_distance_miles,status)
  VALUES(v_order,v_fee,v_payout,v_fee-v_payout,v_miles,'unassigned');
 END IF;
 RETURN v_order;
END $$;
REVOKE ALL ON FUNCTION public.create_material_request(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_material_request(uuid,jsonb,jsonb) TO authenticated;
ALTER TABLE public.price_quotes ADD COLUMN converted_order_ids uuid[];
CREATE FUNCTION public.save_material_comparison(p_quote uuid,p_job uuid) RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.price_quotes; m record; v_items jsonb; ids uuid[]:='{}'; v_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO q FROM public.price_quotes WHERE id=p_quote FOR UPDATE;
 IF NOT FOUND OR q.requested_by IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.trade_companies WHERE id=q.trade_company_id AND owner_profile_id=auth.uid()) THEN RAISE EXCEPTION 'Comparison owner required'; END IF;
 IF q.converted_order_ids IS NOT NULL THEN RETURN q.converted_order_ids; END IF;
 IF q.created_at<now()-interval '30 minutes' THEN RAISE EXCEPTION 'Comparison expired; compare again'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.price_quote_items WHERE price_quote_id=p_quote) OR EXISTS(SELECT 1 FROM public.price_quote_items WHERE price_quote_id=p_quote AND (best_merchant_id IS NULL OR best_price<=0)) THEN RAISE EXCEPTION 'Resolve unmatched or unpriced items first'; END IF;
 FOR m IN SELECT DISTINCT best_merchant_id FROM public.price_quote_items WHERE price_quote_id=p_quote LOOP
  SELECT jsonb_agg(jsonb_build_object('item_name',item_name,'quantity',quantity,'unit',unit,'unit_price',best_price)) INTO v_items FROM public.price_quote_items WHERE price_quote_id=p_quote AND best_merchant_id=m.best_merchant_id;
  v_id:=public.create_material_request(gen_random_uuid(),jsonb_build_object('trade_company_id',q.trade_company_id,'job_id',p_job,'merchant_id',m.best_merchant_id,'delivery_mode','trade_collect','delivery_address',q.delivery_address,'notes','Comparison request: merchant price and collection require confirmation.'),v_items);
  ids:=array_append(ids,v_id);
 END LOOP;
 UPDATE public.price_quotes SET converted_order_ids=ids WHERE id=p_quote;
 RETURN ids;
END $$;
REVOKE ALL ON FUNCTION public.save_material_comparison(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_material_comparison(uuid,uuid) TO authenticated;
COMMIT;
