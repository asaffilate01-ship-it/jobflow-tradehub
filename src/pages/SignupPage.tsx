import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Wrench, TruckIcon, Eye, EyeOff, Info, Home } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/use-page-meta";

type RoleOption = "customer" | "trade" | "driver";

const roleCards: { value: RoleOption; label: string; desc: string; icon: typeof User }[] = [
  { value: "customer", label: "Customer", desc: "Post jobs & hire trades — always free", icon: User },
  { value: "trade", label: "Tradesperson", desc: "Free to join — subscribe to win work", icon: Wrench },
  { value: "driver", label: "Driver", desc: "Deliver materials to sites", icon: TruckIcon },
];

const SignupPage = () => {
  usePageMeta("Create your free account", "Join Craftvaro free to post jobs, win work and manage deliveries. Find. Hire. Done.");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleOption>("customer");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      // The auth.users trigger creates the initial *unverified* role in the
      // same transaction. Never write user_roles from a browser: signUp may
      // return no session until the person confirms their email.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), role },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      if (data.session) {
        toast.success("Account created. Complete your profile and any required verification.");
        navigate("/profile-setup", { replace: true });
        return;
      }
      // Supabase can deliberately return an obfuscated user for an address
      // that already exists. Do not disclose whether an account exists.
      toast.success("If this is a new account, check your email to confirm it, then sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account registration could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="glass-card-elevated p-8 w-full max-w-md space-y-6 page-enter">
        <div className="flex flex-col items-center gap-3 text-center">
          <Link to="/" className="inline-flex">
            <Logo variant="full" height={42} priority />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground">Free to join, no card required. Customers never pay — trade businesses subscribe to receive work.</p>
            <p className="text-xs text-muted-foreground">Confirm your email before signing in. Driver and trade permissions remain restricted until identity checks are approved.</p>
          </div>
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
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/40"
                    }`}
                    aria-pressed={active}
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
            <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground/80">
              <Info className="h-4 w-4 shrink-0 text-warning" />
              <span><strong className="text-foreground">Note:</strong> Trader accounts require KYC verification before full access is granted. You'll be able to upload documents after email verification.</span>
            </div>
          )}
          {role === "driver" && (
            <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground/80">
              <Info className="h-4 w-4 shrink-0 text-warning" />
              <span><strong className="text-foreground">Note:</strong> Driver accounts require KYC verification including a valid driving licence and vehicle insurance before you can accept deliveries.</span>
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                autoComplete="new-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </p>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
