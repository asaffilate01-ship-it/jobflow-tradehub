-- Activity and in-app alerts are written in the same transaction as the work change.
CREATE TABLE public.subcontract_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.subcontract_work_orders(id),
  actor_profile_id uuid REFERENCES public.profiles(id),
  event_type text NOT NULL CHECK (event_type IN ('assigned','progress_updated','submitted_review','completed','cancelled','payment_recorded')),
  status text NOT NULL,
  progress integer NOT NULL CHECK (progress BETWEEN 0 AND 100),
  note text NOT NULL DEFAULT '',
  payment_record_id uuid REFERENCES public.subcontract_payment_records(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subcontract_activity_work_time_idx ON public.subcontract_activity(work_order_id,created_at DESC,id DESC);
ALTER TABLE public.subcontract_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work participants read activity" ON public.subcontract_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subcontract_work_orders w WHERE w.id=work_order_id));
REVOKE ALL ON public.subcontract_activity FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.subcontract_activity TO authenticated;

CREATE FUNCTION public.capture_subcontract_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  w public.subcontract_work_orders;
  v_kind text;
  v_owner uuid;
  v_recipient uuid;
  v_event uuid;
  v_title text;
  v_note text;
  v_payment uuid;
BEGIN
  IF TG_TABLE_NAME='subcontract_payment_records' THEN
    SELECT * INTO STRICT w FROM public.subcontract_work_orders WHERE id=NEW.work_order_id;
    v_kind:='payment_recorded'; v_title:='Subcontract payment recorded';
    v_note:='Payment recorded by the main contractor. View the work package for details.';
    v_payment:=NEW.id;
  ELSE
    w:=NEW;
    IF TG_OP='UPDATE' THEN
      -- Retrying an identical progress save must not create duplicate activity or alerts.
      IF (NEW.status,NEW.progress,NEW.progress_note) IS NOT DISTINCT FROM (OLD.status,OLD.progress,OLD.progress_note) THEN RETURN NEW; END IF;
      v_kind:=CASE WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('submitted_review','completed','cancelled') THEN NEW.status ELSE 'progress_updated' END;
      v_title:=CASE v_kind WHEN 'submitted_review' THEN 'Subcontract work ready for review' WHEN 'completed' THEN 'Subcontract work signed off' WHEN 'cancelled' THEN 'Subcontract work cancelled' ELSE 'Subcontract progress updated' END;
      v_note:=NEW.progress_note;
    ELSE
      v_kind:='assigned'; v_title:='New subcontract work assigned';
      v_note:='Work package created.';
    END IF;
  END IF;
  INSERT INTO public.subcontract_activity(work_order_id,actor_profile_id,event_type,status,progress,note,payment_record_id)
  VALUES(w.id,auth.uid(),v_kind,w.status,w.progress,v_note,v_payment) RETURNING id INTO v_event;
  SELECT owner_profile_id INTO STRICT v_owner FROM public.trade_companies WHERE id=w.trade_company_id;
  v_recipient:=CASE WHEN auth.uid()=v_owner THEN w.assignee_profile_id ELSE v_owner END;
  IF v_recipient IS NOT NULL AND v_recipient IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications(recipient_id,type,title,body,link,metadata)
    VALUES(v_recipient,'info',v_title,'Open your subcontractor dashboard to view the update.',
      '/subcontractors',jsonb_build_object('work_order_id',w.id,'activity_id',v_event));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_subcontract_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_subcontract_work_activity AFTER INSERT OR UPDATE ON public.subcontract_work_orders FOR EACH ROW EXECUTE FUNCTION public.capture_subcontract_activity();
CREATE TRIGGER capture_subcontract_payment_activity AFTER INSERT ON public.subcontract_payment_records FOR EACH ROW EXECUTE FUNCTION public.capture_subcontract_activity();
COMMENT ON TABLE public.subcontract_activity IS 'Append-only history from migration date; visible only to work package participants and administrators. In-app alerts only, not email/SMS delivery.';
