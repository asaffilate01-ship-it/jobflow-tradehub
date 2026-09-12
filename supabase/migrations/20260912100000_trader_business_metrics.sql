-- Aggregate in Postgres so KPIs do not silently stop at the API row limit.
CREATE FUNCTION public.trader_business_metrics(p_company uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.trade_companies WHERE id=p_company AND owner_profile_id=auth.uid()) AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Company access denied'; END IF;
 SELECT jsonb_build_object(
 'active_jobs',(SELECT count(*) FROM public.jobs j WHERE j.status IN ('awarded','active') AND (j.trade_company_id=p_company OR EXISTS(SELECT 1 FROM public.job_awards a WHERE a.job_id=j.id AND a.trade_company_id=p_company))),
 'completed_jobs',(SELECT count(*) FROM public.jobs j WHERE j.status='completed' AND (j.trade_company_id=p_company OR EXISTS(SELECT 1 FROM public.job_awards a WHERE a.job_id=j.id AND a.trade_company_id=p_company))),
 'quotes_submitted',(SELECT count(*) FROM public.quotes WHERE trade_company_id=p_company AND status IN ('submitted','accepted','rejected')),
 'quotes_accepted',(SELECT count(*) FROM public.quotes WHERE trade_company_id=p_company AND status='accepted'),
 'quote_pipeline',(SELECT coalesce(sum(total_amount),0) FROM public.quotes WHERE trade_company_id=p_company AND status='submitted'),
 'accepted_quote_value',(SELECT coalesce(sum(total_amount),0) FROM public.quotes WHERE trade_company_id=p_company AND status='accepted'),
 'invoiced_ex_vat',(SELECT coalesce(sum(subtotal),0) FROM public.customer_invoices WHERE trade_company_id=p_company AND status IN ('issued','part_paid','paid')),
 'paid_invoice_value',(SELECT coalesce(sum(total_amount),0) FROM public.customer_invoices WHERE trade_company_id=p_company AND status='paid'),
 'open_invoice_face_value',(SELECT coalesce(sum(total_amount),0) FROM public.customer_invoices WHERE trade_company_id=p_company AND status IN ('issued','part_paid')),
 'overdue_invoice_count',(SELECT count(*) FROM public.customer_invoices WHERE trade_company_id=p_company AND status IN ('issued','part_paid') AND due_date<current_date),
 'subcontract_committed',(SELECT coalesce(sum(agreed_amount),0) FROM public.subcontract_work_orders WHERE trade_company_id=p_company AND status<>'cancelled'),
 'subcontract_paid',(SELECT coalesce(sum(p.amount),0) FROM public.subcontract_payment_records p JOIN public.subcontract_work_orders w ON w.id=p.work_order_id WHERE w.trade_company_id=p_company),
 'subcontract_awaiting_review',(SELECT count(*) FROM public.subcontract_work_orders WHERE trade_company_id=p_company AND status='submitted_review'),
 'subcontract_overdue',(SELECT count(*) FROM public.subcontract_work_orders WHERE trade_company_id=p_company AND status NOT IN ('completed','cancelled') AND due_date<current_date)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.trader_business_metrics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.trader_business_metrics(uuid) TO authenticated;
