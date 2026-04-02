import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Briefcase, Package, Camera, FileCheck,
  Building2, Truck, CreditCard, MessageCircle, LogOut, ChevronLeft,
  Menu, Wrench, Radio, Shield,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const traderNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/materials", label: "Materials", icon: Package },
  { to: "/site-evidence", label: "Site Evidence", icon: Camera },
  { to: "/compliance", label: "Certificates", icon: FileCheck },
  { to: "/trade-accounts", label: "Trade Accounts", icon: Building2 },
  { to: "/deliveries", label: "Deliveries", icon: Truck },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/broadcasts", label: "Broadcasts", icon: Radio },
  { to: "/subscription", label: "Subscription", icon: CreditCard },
];

// Mobile bottom nav - only show the most important items
const mobileNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/materials", label: "Materials", icon: Package },
  { to: "/site-evidence", label: "Evidence", icon: Camera },
  { to: "/messages", label: "Messages", icon: MessageCircle },
];

function TraderSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="pt-4">
        {/* Logo */}
        <div className={`px-4 mb-6 flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">
              Trade<span className="text-primary">Flow</span>
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {traderNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary border-l-2 border-primary"
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sign out at bottom */}
        <div className="mt-auto p-4">
          <button
            onClick={() => signOut()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {mobileNavItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-0 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

const TraderLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <TraderSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <div className="md:hidden flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Wrench className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-base font-bold tracking-tight text-foreground">
                  Trade<span className="text-primary">Flow</span>
                </span>
              </div>
            </div>
            <NotificationBell />
          </header>

          {/* Main content */}
          <main className="flex-1 container py-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom nav */}
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
};

export default TraderLayout;
