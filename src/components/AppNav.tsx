import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Briefcase, Home, Menu, X, Users, LogIn, LogOut, Search, FolderOpen, Sun, Moon
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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

  const navItems = [
    { to: "/", label: "Home", icon: Home, show: true },
    { to: "/marketplace", label: "Find Trades", icon: Search, show: true },
    { to: "/jobs", label: "Jobs", icon: Briefcase, show: true },
    { to: "/my-projects", label: "My Projects", icon: FolderOpen, show: isCustomer },
  ];

  const filteredItems = navItems.filter((item) => item.show);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={craftvaroLogo} alt="Craftvaro" className="h-9 group-hover:opacity-90 transition-opacity dark:[filter:brightness(0)_invert(1)]" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {filteredItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-[calc(0.5rem+1px)] left-2 right-2 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setDark(!dark)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {isTrade && (
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 text-xs font-semibold">
                  Trader Portal
                </Button>
              )}
              {isDriver && (
                <Button variant="outline" size="sm" onClick={() => navigate("/driver")} className="gap-2 text-xs font-semibold">
                  Driver Hub
                </Button>
              )}
              {isCustomer && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-success/10 text-success font-semibold">Customer</span>
              )}
              {isAdmin && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">Admin</span>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="gap-2 text-muted-foreground font-medium">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate("/signup")} className="font-semibold shadow-sm">
                Join free
              </Button>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setDark(!dark)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button className="p-2 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border bg-background px-4 pb-4 overflow-hidden"
          >
            {filteredItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            {user && (isTrade || isDriver) && (
              <div className="pt-2 border-t border-border mt-2 space-y-1">
                {isTrade && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary"
                  >
                    Go to Trader Portal →
                  </Link>
                )}
                {isDriver && (
                  <Link
                    to="/driver"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-accent"
                  >
                    Go to Driver Hub →
                  </Link>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-border mt-2">
              {user ? (
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary"
                  >
                    <Users className="h-4 w-4" />
                    Join free
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default AppNav;
