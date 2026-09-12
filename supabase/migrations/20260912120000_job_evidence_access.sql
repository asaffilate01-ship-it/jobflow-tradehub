-- Camera uploads use jobId/phase/file, not userId/file. Scope storage to actual job parties.
CREATE FUNCTION public.can_access_project_evidence(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.jobs j WHERE (
   j.id::text=split_part(p_path,'/',1)
   OR EXISTS(SELECT 1 FROM public.job_media m WHERE m.job_id=j.id AND m.storage_path=p_path)
  ) AND (
   j.customer_profile_id=auth.uid() OR public.has_role(auth.uid(),'admin')
   OR EXISTS(SELECT 1 FROM public.trade_companies c WHERE c.id=j.trade_company_id AND c.owner_profile_id=auth.uid())
   OR EXISTS(SELECT 1 FROM public.job_awards a JOIN public.trade_companies c ON c.id=a.trade_company_id WHERE a.job_id=j.id AND c.owner_profile_id=auth.uid())
  )
 );
$$;
REVOKE ALL ON FUNCTION public.can_access_project_evidence(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_access_project_evidence(text) TO authenticated;
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own job evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users view own job evidence" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view job evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own evidence" ON storage.objects;
CREATE POLICY "project parties upload evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='job-evidence' AND public.can_access_project_evidence(name));
CREATE POLICY "project parties read evidence" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='job-evidence' AND public.can_access_project_evidence(name));
CREATE POLICY "uploaders remove project evidence" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='job-evidence' AND public.can_access_project_evidence(name) AND EXISTS(SELECT 1 FROM public.job_media m WHERE m.storage_path=name AND m.uploaded_by=auth.uid()));
