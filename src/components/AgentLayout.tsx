import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Users, Wallet, UserCircle, LogOut,
  TrendingUp, Link as LinkIcon,
} from "lucide-react";
import traderosLogo from "@/assets/traderos-logo.png";
import NotificationBell from "@/components/NotificationBell";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/agent", label: "Dashboard", icon: LayoutDashboard },
      { to: "/agent/referrals", label: "Referrals", icon: Users },
      { to: "/agent/commissions", label: "Commissions", icon: Wallet },
      { to: "/agent/analytics", label: "Analytics", icon: TrendingUp },
      { to: "/agent/referral-link", label: "Referral Link", icon: LinkIcon },
    ],
  },
];

const mobileNavItems = [
  { to: "/agent", label: "Home", icon: LayoutDashboard },
  { to: "/agent/referrals", label: "Referrals", icon: Users },
  { to: "/agent/commissions", label: "Earnings", icon: Wallet },
  { to: "/agent/analytics", label: "Stats", icon: TrendingUp },
];

function AgentSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="pt-4">
        <div className={`px-4 mb-6 flex items-center ${collapsed ? "justify-center" : ""}`}>
          <img src={traderosLogo} alt="TraderOS" className={collapsed ? "h-8" : "h-9"} />
          {!collapsed && <span className="ml-2 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Agent</span>}
        </div>

        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.to}
                        end={item.to === "/agent"}
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
        ))}

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {mobileNavItems.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/agent" && location.pathname.startsWith(item.to));
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

const AgentLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AgentSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <div className="md:hidden">
                <img src={traderosLogo} alt="TraderOS" className="h-7" />
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

export default AgentLayout;
