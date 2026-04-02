import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Wrench, Shield, TruckIcon } from "lucide-react";
import { toast } from "sonner";

type Portal = "trader" | "driver" | "admin" | null;

const portalConfig = {
  trader: {
    icon: Wrench,
    title: "Trader Login",
    subtitle: "Access your jobs, quotes & CRM tools",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    redirect: "/dashboard",
  },
  driver: {
    icon: TruckIcon,
    title: "Driver Login",
    subtitle: "View deliveries & manage your runs",
    iconBg: "bg-accent/10",
    iconText: "text-accent",
    redirect: "/driver",
  },
  admin: {
    icon: Shield,
    title: "Admin Login",
    subtitle: "Platform management & oversight",
    iconBg: "bg-destructive/10",
    iconText: "text-destructive",
    redirect: "/dashboard",
  },
} as const;

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get("portal") as Portal;

  const [portal, setPortal] = useState<Portal>(portalParam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      const redirect = portal ? portalConfig[portal].redirect : "/";
      navigate(redirect);
    }
  };

  // Portal selection screen
  if (!portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Trade<span className="text-primary">Flow</span>
            </h1>
            <p className="text-sm text-muted-foreground">Choose your login portal</p>
          </div>

          <div className="grid gap-3">
            {(Object.entries(portalConfig) as [Portal & string, typeof portalConfig.trader][]).map(
              ([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setPortal(key as Portal)}
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
              }
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Looking to hire a tradesperson?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up as a customer
              </Link>
            </p>
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

        <form onSubmit={handleLogin} className="space-y-4">
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
              required
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="space-y-2 text-center">
          <button
            onClick={() => setPortal(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to portal selection
          </button>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
