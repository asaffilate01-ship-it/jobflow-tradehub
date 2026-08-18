import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/craftvaro-logo.png";

const STORAGE_KEY = "craftvaro_preview_access";
/** Promo-phase soft gate only — not a security boundary (real data is protected by auth + RLS). */
const ACCESS_PASSWORD = "craftvaro2026";

export const hasPreviewAccess = () =>
  typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "granted";

export const grantPreviewAccess = () => localStorage.setItem(STORAGE_KEY, "granted");

export const UnlockScreen = ({ onUnlocked }: { onUnlocked?: () => void }) => {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === ACCESS_PASSWORD) {
      grantPreviewAccess();
      setError("");
      if (onUnlocked) onUnlocked();
      else navigate("/home", { replace: true });
    } else {
      setError("That password isn't right. Check your invite email.");
    }
  };

  return (
    <div className="auth-shell">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <img src={logo} alt="Craftvaro" className="h-10 w-auto" width={200} height={40} />
        </Link>

        <form onSubmit={submit} className="glass-card-premium space-y-5 p-7">
          <div className="text-center">
            <div className="icon-container icon-container-xl mx-auto mb-4 bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Private preview</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The Craftvaro platform is invite-only during launch. Enter your access password to
              continue.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access">Access password</Label>
            <div className="relative">
              <Input
                id="access"
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            Unlock platform
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
            <a
              href="mailto:hello@craftvaro.co.uk?subject=Craftvaro%20access%20request"
              className="text-accent hover:underline"
            >
              Request access
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

const PromoGate = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(hasPreviewAccess);
  if (!unlocked) return <UnlockScreen onUnlocked={() => setUnlocked(true)} />;
  return <>{children}</>;
};

export default PromoGate;
