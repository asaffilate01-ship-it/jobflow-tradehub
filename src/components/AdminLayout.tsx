import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Users, Shield, BarChart3, UserCheck,
  DollarSign, LogOut, Radio, ScrollText, Store, Wrench,
} from "lucide-react";
import craftvaroLogo from "@/assets/craftvaro-logo.png";
import NotificationBell from "@/components/NotificationBell";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const navGroups = [
  {
    label: "Platform",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/kyc-review", label: "KYC Review", icon: Shield },
      { to: "/admin/repair-providers", label: "Repair Providers", icon: Wrench },
      { to: "/admin/trader-directory", label: "Trader Directory", icon: Store },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
    ],
  },
  {
    label: "Agents & Revenue",
    items: [
      { to: "/admin/agents", label: "Agent Oversight", icon: UserCheck },
      { to: "/admin/commissions", label: "Commissions", icon: DollarSign },
    ],
  },
  {
    label: "Comms",
    items: [
      { to: "/admin/broadcasts", label: "Broadcasts", icon: Radio },
    ],
  },
];

const mobileNavItems = [
  { to: "/admin", label: "Home", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/kyc-review", label: "KYC", icon: Shield },
  { to: "/admin/trader-directory", label: "Directory", icon: Store },
  { to: "/admin/agents", label: "Agents", icon: UserCheck },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="pt-4">
        <div className={`px-4 mb-6 flex items-center ${collapsed ? "justify-center" : ""}`}>
          <img src={craftvaroLogo} alt="Craftvaro" className={`${collapsed ? "h-8" : "h-9"} [filter:brightness(0)_invert(1)]`} />
        </div>

        {!collapsed && (
          <div className="px-4 mb-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-1 rounded-md">
              <Shield className="h-3 w-3" />
              Admin
            </span>
          </div>
        )}

        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className={collapsed ? "sr-only" : "admin-sidebar-text"}>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.to}
                        end={item.to === "/admin"}
                        className="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-secondary/50 transition-colors"
                        activeClassName="bg-primary/10 border-l-2 border-primary"
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
            className={`admin-sidebar-action flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-destructive/10 transition-colors w-full ${collapsed ? "justify-center" : ""}`}
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
          const active = location.pathname === item.to || (item.to !== "/admin" && location.pathname.startsWith(item.to));
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

const AdminLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <div className="md:hidden">
                <img src={craftvaroLogo} alt="Craftvaro" className="h-7" />
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

export default AdminLayout;
