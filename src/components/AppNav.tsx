import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase, Home, Menu, X, LogIn, LogOut, Search, FolderOpen, Sun, Moon,
  Plus, LayoutDashboard, Truck, Shield, User as UserIcon, ChevronRight, Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import craftvaroLogo from "@/assets/craftvaro-logo.png";

const AppNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const isTrade = roles.includes("trade");
  const isDriver = roles.includes("driver");
  const isCustomer = roles.includes("customer");
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navItems = [
    { to: "/", label: "Home", icon: Home, show: true },
    { to: "/marketplace", label: "Find Trades", icon: Search, show: true },
    { to: "/jobs", label: "Jobs", icon: Briefcase, show: true },
    { to: "/my-projects", label: "My Projects", icon: FolderOpen, show: isCustomer },
  ].filter((item) => item.show);

  const portals = [
    { to: "/dashboard", label: "Trader Portal", icon: LayoutDashboard, show: isTrade },
    { to: "/driver", label: "Driver Hub", icon: Truck, show: isDriver },
    { to: "/admin", label: "Admin Console", icon: Shield, show: isAdmin },
  ].filter((p) => p.show);

  const roleLabel = isAdmin ? "Admin" : isTrade ? "Tradesperson" : isDriver ? "Driver" : isCustomer ? "Customer" : "Member";
  const email = user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase() || "CV";
  const isActive = (to: string) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 group" aria-label="Craftvaro home">
          <img
            src={craftvaroLogo}
            alt="Craftvaro"
            className="h-9 transition-opacity group-hover:opacity-90 dark:[filter:brightness(0)_invert(1)]"
          />
        </Link>

        {/* Desktop nav — segmented pill */}
        <div className="hidden md:flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 p-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-primary shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="ml-auto hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/post-job")}
            className="gap-1.5 font-semibold text-accent hover:text-accent hover:bg-accent/10"
          >
            <Plus className="h-4 w-4" />
            Post a job
          </Button>

          <button
            onClick={() => setDark(!dark)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border/60 bg-card py-1 pl-1 pr-3 text-sm transition-colors hover:border-primary/40">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {initials}
                  </span>
                  <span className="max-w-[9rem] truncate font-medium text-foreground">{email}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{email}</span>
                    <span className="text-xs font-normal text-muted-foreground">{roleLabel}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {portals.map(({ to, label, icon: Icon }) => (
                    <DropdownMenuItem key={to} onClick={() => navigate(to)} className="gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => navigate("/profile-setup")} className="gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    Profile & settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/subscription")} className="gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Plans & billing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="gap-2 text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="gap-2 font-medium text-muted-foreground">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate("/signup")} className="font-semibold shadow-sm">
                Join free
              </Button>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <button
            onClick={() => setDark(!dark)}
            className="tap-target flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            className="tap-target flex items-center justify-center rounded-lg p-2 text-foreground transition-colors hover:bg-secondary/60"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 top-16 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
            />
            <motion.div
              id="mobile-nav"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="fixed right-0 top-16 z-50 flex h-[calc(100dvh-4rem)] w-[85%] max-w-sm flex-col overflow-y-auto border-l border-border bg-card px-4 pb-8 pt-4 shadow-2xl safe-bottom md:hidden"
            >
              {user && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{email}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  </div>
                </div>
              )}

              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Browse</p>
              <div className="space-y-1">
                {navItems.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50" />
                    </Link>
                  );
                })}
              </div>

              {portals.length > 0 && (
                <>
                  <p className="px-1 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your portals</p>
                  <div className="space-y-1">
                    {portals.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-3 text-sm font-semibold text-foreground hover:border-primary/40"
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        {label}
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50" />
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {user && (
                <>
                  <p className="px-1 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
                  <div className="space-y-1">
                    <Link to="/profile-setup" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-secondary/50">
                      <UserIcon className="h-4 w-4" />
                      Profile & settings
                    </Link>
                    <Link to="/subscription" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-secondary/50">
                      <Sparkles className="h-4 w-4" />
                      Plans & billing
                    </Link>
                  </div>
                </>
              )}

              <div className="mt-auto space-y-2 pt-6">
                <Link
                  to="/post-job"
                  className="flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-accent-foreground shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Post a job
                </Link>
                {user ? (
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
                    >
                      Join free
                    </Link>
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default AppNav;
