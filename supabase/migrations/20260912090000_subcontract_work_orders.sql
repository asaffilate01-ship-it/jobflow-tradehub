CREATE TABLE public.subcontract_work_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 trade_company_id uuid NOT NULL REFERENCES public.trade_companies(id),
 subcontractor_id uuid NOT NULL REFERENCES public.subcontractors(id),
 job_id uuid NOT NULL REFERENCES public.jobs(id),
 assignee_profile_id uuid REFERENCES public.profiles(id),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
 scope text NOT NULL CHECK(length(trim(scope)) BETWEEN 1 AND 10000),
 due_date date,
 agreed_amount numeric(12,2) NOT NULL CHECK(agreed_amount >= 0),
 status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','in_progress','submitted_review','completed','cancelled')),
 progress integer NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
 progress_note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.subcontract_payment_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 work_order_id uuid NOT NULL REFERENCES public.subcontract_work_orders(id),
 amount numeric(12,2) NOT NULL CHECK(amount > 0),
 paid_on date NOT NULL,
 reference text NOT NULL CHECK(length(trim(reference)) BETWEEN 1 AND 200),
 recorded_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(work_order_id,reference)
);
ALTER TABLE public.subcontract_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontract_payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work order participants read scope" ON public.subcontract_work_orders FOR SELECT TO authenticated USING (
 assignee_profile_id=auth.uid() OR EXISTS(SELECT 1 FROM public.trade_companies c WHERE c.id=trade_company_id AND c.owner_profile_id=auth.uid()) OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "work order participants read payment records" ON public.subcontract_payment_records FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.subcontract_work_orders w WHERE w.id=work_order_id)
);
GRANT SELECT ON public.subcontract_work_orders,public.subcontract_payment_records TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.subcontract_work_orders,public.subcontract_payment_records FROM authenticated,anon;
CREATE INDEX subcontract_work_orders_company_idx ON public.subcontract_work_orders(trade_company_id);
CREATE INDEX subcontract_work_orders_assignee_idx ON public.subcontract_work_orders(assignee_profile_id);

CREATE FUNCTION public.create_subcontract_work_order(p_company uuid,p_subcontractor uuid,p_job uuid,p_title text,p_scope text,p_due date,p_amount numeric,p_assignee_email text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_assignee uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.trade_companies WHERE id=p_company AND owner_profile_id=auth.uid()) THEN RAISE EXCEPTION 'Company access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.subcontractors WHERE id=p_subcontractor AND trade_company_id=p_company) THEN RAISE EXCEPTION 'Subcontractor does not belong to this company'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=p_job AND j.status IN ('awarded','active') AND (j.trade_company_id=p_company OR EXISTS(SELECT 1 FROM public.job_awards a WHERE a.job_id=j.id AND a.trade_company_id=p_company))) THEN RAISE EXCEPTION 'Only your awarded or active jobs can be subcontracted'; END IF;
 IF nullif(trim(p_assignee_email),'') IS NOT NULL THEN
   SELECT u.id INTO v_assignee FROM auth.users u JOIN public.profiles p ON p.id=u.id WHERE lower(u.email)=lower(trim(p_assignee_email)) AND public.has_role(u.id,'trade') AND u.id<>auth.uid();
   IF v_assignee IS NULL THEN RAISE EXCEPTION 'Recipient must have an existing Craftvaro trader account'; END IF;
 END IF;
 INSERT INTO public.subcontract_work_orders(trade_company_id,subcontractor_id,job_id,assignee_profile_id,title,scope,due_date,agreed_amount)
 VALUES(p_company,p_subcontractor,p_job,v_assignee,trim(p_title),trim(p_scope),p_due,p_amount) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.update_subcontract_progress(p_id uuid,p_status text,p_progress integer,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.subcontract_work_orders; v_owner boolean;
BEGIN
 SELECT * INTO w FROM public.subcontract_work_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Work order unavailable'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.trade_companies c WHERE c.id=w.trade_company_id AND c.owner_profile_id=auth.uid()) INTO v_owner;
 IF NOT v_owner AND w.assignee_profile_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Work order access denied'; END IF;
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF NOT v_owner AND (p_status NOT IN ('in_progress','submitted_review') OR w.status IN ('completed','cancelled')) THEN RAISE EXCEPTION 'Only the main contractor can sign off or cancel work'; END IF;
 IF length(p_note)>10000 THEN RAISE EXCEPTION 'Progress note too long'; END IF;
 UPDATE public.subcontract_work_orders SET status=p_status,progress=CASE WHEN p_status='completed' THEN 100 ELSE p_progress END,progress_note=p_note,updated_at=now() WHERE id=p_id;
END $$;

CREATE FUNCTION public.record_subcontract_payment(p_id uuid,p_amount numeric,p_paid_on date,p_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.subcontract_work_orders; v_paid numeric; v_id uuid;
BEGIN
 SELECT * INTO w FROM public.subcontract_work_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.trade_companies c WHERE c.id=w.trade_company_id AND c.owner_profile_id=auth.uid()) THEN RAISE EXCEPTION 'Payment access denied'; END IF;
 IF w.status='cancelled' THEN RAISE EXCEPTION 'Cannot record payment on a cancelled work order'; END IF;
 SELECT coalesce(sum(amount),0) INTO v_paid FROM public.subcontract_payment_records WHERE work_order_id=p_id;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) OR v_paid+p_amount>w.agreed_amount THEN RAISE EXCEPTION 'Payment must be positive, use two decimal places and not exceed the remaining agreement'; END IF;
 IF p_paid_on IS NULL OR p_paid_on>current_date THEN RAISE EXCEPTION 'Use the actual payment date, not a future date'; END IF;
 INSERT INTO public.subcontract_payment_records(work_order_id,amount,paid_on,reference,recorded_by) VALUES(p_id,p_amount,p_paid_on,trim(p_reference),auth.uid()) RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_subcontract_work_order(uuid,uuid,uuid,text,text,date,numeric,text),public.update_subcontract_progress(uuid,text,integer,text),public.record_subcontract_payment(uuid,numeric,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_subcontract_work_order(uuid,uuid,uuid,text,text,date,numeric,text),public.update_subcontract_progress(uuid,text,integer,text),public.record_subcontract_payment(uuid,numeric,date,text) TO authenticated;

-- Prevent a company linking its own subcontractor invoice to somebody else's project.
CREATE FUNCTION public.check_subcontract_invoice_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid;
BEGIN
 SELECT trade_company_id INTO v_company FROM public.subcontractors WHERE id=NEW.subcontractor_id;
 IF NEW.job_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=NEW.job_id AND (j.trade_company_id=v_company OR EXISTS(SELECT 1 FROM public.job_awards a WHERE a.job_id=j.id AND a.trade_company_id=v_company))) THEN RAISE EXCEPTION 'Invoice job does not belong to the subcontractor company'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_subcontract_invoice_job BEFORE INSERT OR UPDATE OF job_id,subcontractor_id ON public.subcontractor_invoices FOR EACH ROW EXECUTE FUNCTION public.check_subcontract_invoice_job();
