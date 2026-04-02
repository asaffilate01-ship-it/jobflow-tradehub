
-- Change default kyc_status to pending
ALTER TABLE public.profiles ALTER COLUMN kyc_status SET DEFAULT 'pending';

-- Add kyc_documents jsonb column to track uploaded files
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_documents jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for KYC documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users upload own kyc docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own docs
CREATE POLICY "Users view own kyc docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all kyc docs
CREATE POLICY "Admins view all kyc docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND has_role(auth.uid(), 'admin'));

-- Admins can read profiles for KYC review
CREATE POLICY "admins read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update kyc_status on profiles
CREATE POLICY "admins update kyc status"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
