import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, User, Wrench, TruckIcon, Phone, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type RoleOption = "customer" | "trade" | "driver";

const roleCards: { value: RoleOption; label: string; desc: string; icon: typeof User }[] = [
  { value: "customer", label: "Customer", desc: "Post jobs & hire trades", icon: User },
  { value: "trade", label: "Tradesperson", desc: "Find work & manage jobs", icon: Wrench },
  { value: "driver", label: "Driver", desc: "Deliver materials to sites", icon: TruckIcon },
];

type Step = "details" | "verify-email" | "verify-phone";

const SignupPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleOption>("customer");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Assign role
    if (data.user) {
      setUserId(data.user.id);
      await supabase.from("user_roles").insert({ user_id: data.user.id, role });
    }

    setLoading(false);

    if (role === "customer") {
      // Customers need email verification + phone 2FA
      toast.success("Account created! Check your email to verify, then add your phone number.");
      setStep("verify-phone");
    } else {
      // Traders/drivers verify email, then go to profile setup
      toast.success("Check your email to confirm your account!");
      navigate("/login");
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    // Format UK phone: ensure it starts with +44
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("07")) {
      formattedPhone = "+44" + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+44" + formattedPhone;
    }

    setLoading(true);

    // Use Supabase phone OTP (signInWithOtp sends an SMS code)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Verification code sent to your phone!");
    setPhone(formattedPhone);
    setStep("verify-phone");
    setLoading(false);
  };

  const handleVerifyPhone = async () => {
    if (!otp.trim() || otp.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Mark phone as verified in profile
    if (userId) {
      await supabase.from("profiles").update({ phone_verified: true, phone }).eq("id", userId);
    }

    toast.success("Phone verified! You're all set.");
    setLoading(false);
    navigate("/login");
  };

  if (step === "verify-phone") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass-card p-8 w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Phone className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Verify your phone
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              We'll send a 6-digit code to verify your mobile number.<br />
              This adds an extra layer of security to your account.
            </p>
          </div>

          <div className="space-y-4">
            {!otp && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    UK mobile number
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07xxx xxxxxx"
                    required
                  />
                </div>
                <Button
                  onClick={handleSendPhoneOtp}
                  className="w-full font-semibold gap-2"
                  disabled={loading}
                >
                  {loading ? "Sending…" : "Send verification code"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {phone.startsWith("+") && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Enter 6-digit code sent to {phone}
                  </label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>
                <Button
                  onClick={handleVerifyPhone}
                  className="w-full font-semibold gap-2"
                  disabled={loading || otp.length < 6}
                >
                  {loading ? "Verifying…" : "Verify & continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            <button
              onClick={() => navigate("/login")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now — verify later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card p-8 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Join Trade<span className="text-primary">Flow</span>
          </h1>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">I am a…</label>
            <div className="grid grid-cols-3 gap-2">
              {roleCards.map((r) => {
                const Icon = r.icon;
                const active = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role-specific info banner */}
          {role === "trade" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <strong>Note:</strong> Trader accounts require KYC verification before full access is granted. You'll be able to upload documents after email verification.
            </div>
          )}
          {role === "driver" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <strong>Note:</strong> Driver accounts require KYC verification including a valid driving licence and vehicle insurance before you can accept deliveries.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Full name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
