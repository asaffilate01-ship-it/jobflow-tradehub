import { useState, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, Shield, TruckIcon, Lock, AlertTriangle, Eye, EyeOff, Home, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import traderosLogo from "@/assets/traderos-logo.png";

type AppRole = Database["public"]["Enums"]["app_role"];
type Portal = "trader" | "driver" | "admin" | "customer" | "agent" | null;

const portalToRole: Record<Exclude<Portal, null>, AppRole> = {
  trader: "trade",
  driver: "driver",
  admin: "admin",
  customer: "customer",
  agent: "agent",
};

const portalConfig = {
  trader: {
    icon: Wrench,
    title: "Trader Login",
    subtitle: "Access your jobs, quotes & CRM tools",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    redirect: "/dashboard",
    roleName: "trade",
  },
  driver: {
    icon: TruckIcon,
    title: "Driver Login",
    subtitle: "View deliveries & manage your runs",
    iconBg: "bg-accent/10",
    iconText: "text-accent",
    redirect: "/driver",
    roleName: "driver",
  },
  admin: {
    icon: Shield,
    title: "Admin Login",
    subtitle: "Platform management & oversight",
    iconBg: "bg-destructive/10",
    iconText: "text-destructive",
    redirect: "/dashboard",
    roleName: "admin",
  },
  customer: {
    icon: Lock,
    title: "Customer Login",
    subtitle: "Post jobs & hire tradespeople",
    iconBg: "bg-secondary",
    iconText: "text-secondary-foreground",
    redirect: "/",
    roleName: "customer",
  },
  agent: {
    icon: UserCheck,
    title: "Agent Login",
    subtitle: "Referrals, commission & analytics",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600",
    redirect: "/agent",
    roleName: "agent",
  },
} as const;

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

const TEST_ACCOUNTS = [
  { label: "Trader", email: "trader@traderos.dev", password: "trader123!", portal: "trader" as Portal },
  { label: "Customer", email: "customer@traderos.dev", password: "customer123!", portal: "customer" as Portal },
  { label: "Driver", email: "driver@traderos.dev", password: "driver123!", portal: "driver" as Portal },
  { label: "Admin", email: "admin@traderos.dev", password: "admin123!", portal: "admin" as Portal },
  { label: "Agent", email: "agent@traderos.dev", password: "agent123!", portal: "agent" as Portal },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get("portal") as Portal;

  const [portal, setPortal] = useState<Portal>(portalParam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [devMode, setDevMode] = useState(false);

  // 5-click-in-3-seconds dev mode
  const clickTimesRef = useRef<number[]>([]);
  const handleLogoClick = () => {
    const now = Date.now();
    clickTimesRef.current.push(now);
    // Keep only clicks within last 3 seconds
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 3000);
    if (clickTimesRef.current.length >= 5) {
      setDevMode(prev => !prev);
      clickTimesRef.current = [];
      toast.success(devMode ? "Dev mode disabled" : "🔧 Dev mode enabled");
    }
  };

  const handleQuickLogin = async (account: typeof TEST_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setPortal(account.portal);
  };

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      const remaining = Math.ceil((lockedUntil! - Date.now()) / 1000);
      toast.error(`Account temporarily locked. Try again in ${remaining}s.`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        toast.error("Too many failed attempts. Locked for 5 minutes.");
      } else {
        toast.error(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
      setLoading(false);
      return;
    }

    if (portal && data.user) {
      const requiredRole = portalToRole[portal];
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const userRoles = roleData?.map((r) => r.role) ?? [];
      const hasRequiredRole = userRoles.includes(requiredRole);

      if (!hasRequiredRole) {
        await supabase.auth.signOut();
        toast.error(
          `Access denied. Your account does not have ${portalConfig[portal].roleName} permissions.`,
          {
            icon: <AlertTriangle className="h-4 w-4" />,
            duration: 5000,
          }
        );
        setLoading(false);
        return;
      }
    }

    setAttempts(0);
    setLockedUntil(null);
    toast.success("Signed in successfully");
    const redirect = portal ? portalConfig[portal].redirect : "/";
    setLoading(false);
    navigate(redirect);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email address first, then click forgot password.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent. Check your inbox.");
    }
  };

  // Portal selection screen
  if (!portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-8">
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleLogoClick} className="focus:outline-none select-none">
              <img src={traderosLogo} alt="TraderOS" className="h-12" />
            </button>
            <p className="text-sm text-muted-foreground">Choose your login portal</p>
          </div>

          {devMode && (
            <div className="glass-card p-4 border-2 border-primary/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                DEV MODE — Quick Login
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TEST_ACCOUNTS.map((account) => (
                  <button
                    key={account.label}
                    onClick={() => handleQuickLogin(account)}
                    className="text-left p-3 rounded-lg bg-secondary/50 hover:bg-primary/10 border border-border hover:border-primary/30 transition-all text-xs space-y-1"
                  >
                    <div className="font-semibold text-foreground">{account.label}</div>
                    <div className="text-muted-foreground truncate">{account.email}</div>
                    <div className="text-muted-foreground font-mono">{account.password}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {(["customer", "trader", "driver", "admin"] as const).map((key) => {
              const config = portalConfig[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setPortal(key)}
                  className="glass-card p-5 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
                    <Icon className={`h-6 w-6 ${config.iconText}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {config.title}
                    </div>
                    <div className="text-sm text-muted-foreground">{config.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/signup" className="text-sm text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Login form for selected portal
  const config = portalConfig[portal];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card p-8 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.iconBg}`}>
            <Icon className={`h-6 w-6 ${config.iconText}`} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>

        {isLocked && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Too many failed attempts. Please wait before trying again.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isLocked}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="current-password"
                disabled={isLocked}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={loading || isLocked}>
            {loading ? "Verifying…" : "Sign in securely"}
          </Button>
        </form>

        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Secured login — role verified on sign-in
        </div>

        <div className="space-y-2 text-center">
          <button
            onClick={() => { setPortal(null); setAttempts(0); setLockedUntil(null); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to portal selection
          </button>
          <div className="flex items-center justify-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/signup" className="text-sm text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
