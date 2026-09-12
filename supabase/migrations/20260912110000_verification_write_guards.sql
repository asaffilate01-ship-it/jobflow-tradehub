-- Row ownership alone must not allow self-approval of trust fields.
ALTER TABLE public.profiles ALTER COLUMN kyc_status SET DEFAULT 'pending';
CREATE FUNCTION public.guard_profile_trust_fields() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role()='service_role' OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  NEW.verified:=false; NEW.phone_verified:=false; NEW.kyc_status:='pending';
 ELSE
  NEW.verified:=OLD.verified;
  NEW.phone_verified:=OLD.phone_verified;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
   IF NEW.kyc_status='submitted' THEN NEW.verified:=false;
   ELSE NEW.kyc_status:=OLD.kyc_status;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_profile_trust_fields BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_trust_fields();
CREATE FUNCTION public.guard_driver_verification() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role()='service_role' OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
 NEW.verified:=CASE WHEN TG_OP='INSERT' THEN false ELSE OLD.verified END;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_driver_verification BEFORE INSERT OR UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_driver_verification();
