import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Briefcase, Truck, Home, Menu, X, Users, LogIn, LogOut, Search, FolderOpen
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const AppNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isTrade = roles.includes("trade");
  const isDriver = roles.includes("driver");
  const isCustomer = roles.includes("customer");
  const isAdmin = roles.includes("admin");

  // Public / customer nav items only — trader/driver have their own layouts
  const navItems = [
    { to: "/", label: "Home", icon: Home, show: true },
    { to: "/marketplace", label: "Find Trades", icon: Search, show: true },
    { to: "/jobs", label: "Jobs", icon: Briefcase, show: true },
  ];

  const filteredItems = navItems.filter((item) => item.show);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Trade<span className="text-primary">Flow</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {filteredItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {isTrade && (
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 text-xs">
                  Trader Portal
                </Button>
              )}
              {isDriver && (
                <Button variant="outline" size="sm" onClick={() => navigate("/driver")} className="gap-2 text-xs">
                  Driver Hub
                </Button>
              )}
              {isCustomer && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Customer</span>
              )}
              {isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Admin</span>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="gap-2 text-muted-foreground">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate("/signup")} className="font-semibold">
                Join free
              </Button>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4">
          {filteredItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-secondary text-foreground"
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
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-primary"
                >
                  Go to Trader Portal →
                </Link>
              )}
              {isDriver && (
                <Link
                  to="/driver"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-accent"
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
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground w-full"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : (
              <div className="space-y-1">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-primary"
                >
                  <Users className="h-4 w-4" />
                  Join free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AppNav;
