import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Truck, DollarSign, User, LogOut, Package,
  TruckIcon, Navigation, Settings, Radio,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import traderosLogo from "@/assets/traderos-logo.png";

const driverNavItems = [
  { to: "/driver", label: "Dashboard", icon: LayoutDashboard },
  { to: "/deliveries", label: "Deliveries", icon: Package },
  { to: "/driver/broadcasts", label: "Broadcasts", icon: Radio },
];

const mobileNavItems = [
  { to: "/driver", label: "Dashboard", icon: LayoutDashboard },
  { to: "/deliveries", label: "Deliveries", icon: Package },
  { to: "/driver/broadcasts", label: "Alerts", icon: Radio },
];

function DriverSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="pt-4">
        <div className={`px-4 mb-6 flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
            <TruckIcon className="h-5 w-5 text-accent-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">
              Driver<span className="text-accent">Hub</span>
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {driverNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      activeClassName="bg-accent/10 text-accent border-l-2 border-accent"
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
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

const DriverLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <DriverSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <div className="md:hidden flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <TruckIcon className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-base font-bold tracking-tight text-foreground">
                  Driver<span className="text-accent">Hub</span>
                </span>
              </div>
            </div>
            <NotificationBell />
          </header>

          <main className="flex-1 container py-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>

        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
};

export default DriverLayout;
