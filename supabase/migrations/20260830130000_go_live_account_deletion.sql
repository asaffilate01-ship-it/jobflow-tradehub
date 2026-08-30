-- Forward-only go-live addition.
-- Marketplace views and Lovable-managed storage are intentionally unchanged.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'completed', 'cancelled')),
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (user_id)
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

DROP POLICY IF EXISTS "users request and view own deletion" ON public.account_deletion_requests;
CREATE POLICY "users request and view own deletion"
ON public.account_deletion_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users create own deletion request" ON public.account_deletion_requests;
CREATE POLICY "users create own deletion request"
ON public.account_deletion_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'requested');

DROP POLICY IF EXISTS "admins manage deletion requests" ON public.account_deletion_requests;
CREATE POLICY "admins manage deletion requests"
ON public.account_deletion_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.account_deletion_requests IS
  'Auditable user requests for account and personal-data deletion. Admin completion remains a controlled operation.';
