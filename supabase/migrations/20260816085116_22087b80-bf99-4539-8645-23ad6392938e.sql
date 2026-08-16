-- Trigger-only functions must not be callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_kyc_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_review_rating() FROM anon, authenticated;

-- Order verification: signed-in users only
REVOKE ALL ON FUNCTION public.verify_order_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_order_status(uuid) TO authenticated;

-- has_role is required by RLS policies for signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
