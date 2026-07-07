import { supabase } from "@/lib/supabase";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Database,
  Building2,
  Handshake,
  UsersRound,
  Target,
  IndianRupee,
  HelpCircle,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Settings,
  Shield,
  UserCog,
  CalendarCheck,
  MessageSquare,
  ClipboardList,
  CalendarClock,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, ROLE_LABELS } from "@/lib/roles";
import { useQuery } from "@tanstack/react-query";

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, user }) {
  const location = useLocation();
  const { data: notifications = [] } = useQuery({
  queryKey: ["sidebar-notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("read", false);

    if (error) throw error;

    return data || [];
  },
  refetchInterval: 30000,
});

const unreadCount = notifications.filter(
    n =>
        n.user_id===user.id &&
        !n.read
).length;


const role = user?.role || "recruiter";
  
  const roleLabel = ROLE_LABELS[role] || "Recruiter";

  const buildNav = () => {
    const items = [];

    items.push({ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard });
    items.push({ path: "/events", label: "Event Center", icon: CalendarCheck });
    items.push({ path: "/chat", label: "Team Chat", icon: MessageSquare });

    if (can.viewRecruitment(user)) items.push({ path: "/candidates", label: "Candidates", icon: Users });
    if (can.viewRecruiterIQ(user))
  items.push({
    path: "/recruiter-iq",
    label: "JD Details",
    icon: FileText
  });
    if (can.viewAnalytics(user)) items.push({ path: "/analytics", label: "Analytics", icon: BarChart3 });
    items.push({ path: "/data-center", label: "Data Center", icon: Database });
    if (can.viewCompanies(user)) items.push({ path: "/companies", label: "Companies", icon: Building2 });
    if (can.viewCRM(user)) items.push({ path: "/crm", label: "CRM & Leads", icon: Handshake });
    if (can.viewTeams(user)) items.push({ path: "/teams", label: "Teams", icon: UsersRound });
    if (can.viewTargets(user)) items.push({ path: "/targets", label: "Targets", icon: Target });
    if (can.viewRevenue(user)) items.push({ path: "/revenue", label: "Revenue", icon: IndianRupee });
    if (can.viewAttendance(user))
  items.push({
    path: "/attendance",
    label: "Attendance",
    icon: Clock,
  });

if (can.viewRecruitment(user)) {
  items.push({
    path: "/interviews",
    label: "Interviews",
    icon: CalendarClock,
  });

  items.push({
    path: "/positions",
    label: "Positions",
    icon: Network,
  });
}

items.push({
  path: "/daily-report",
  label: "Daily Report",
  icon: ClipboardList,
});
    return items;
  };

  const bottomItems = [
    { path: "/notifications", label: "Notifications", icon: Bell },
    { path: "/help", label: "Help Center", icon: HelpCircle },
    ...(can.manageUsers(user) ? [{ path: "/user-management", label: "User Management", icon: UserCog }] : []),
    ...(can.manageSettings(user) ? [{ path: "/security", label: "Security & Audit", icon: Shield }] : []),
    ...(can.viewOrgSettings(user) ? [{ path: "/org-settings", label: "Org Settings", icon: Settings }] : []),
  ];

  const navItems = buildNav();

  const NavLink = ({ item, showBadge }) => {
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <div className="relative shrink-0">
  <item.icon className="h-5 w-5" />

  {showBadge && unreadCount > 0 && (
    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )}
</div>
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  // Role badge color
  const roleBadgeColor = {
  ceo: "bg-amber-500/20 text-amber-300",
  super_admin: "bg-purple-500/20 text-purple-300",
  company_admin: "bg-blue-500/20 text-blue-300",
  admin: "bg-blue-500/20 text-blue-300",
  hr_manager: "bg-cyan-500/20 text-cyan-300",
  team_lead: "bg-cyan-500/20 text-cyan-300",
  recruiter: "bg-emerald-500/20 text-emerald-300",
  team_member: "bg-slate-500/20 text-slate-300",
  employee: "bg-slate-500/20 text-slate-300",
  viewer: "bg-gray-500/20 text-gray-300",
}[role] || "bg-slate-500/20 text-slate-300";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 flex items-center gap-3">
        <img
          src="/ccilogo.jpeg"
          alt="CCI Logo"
          className={cn("w-auto shrink-0 rounded-lg object-contain", collapsed ? "h-9" : "h-12")}
        />
        {!collapsed && (
          <div>
            <h1 className="text-sidebar-foreground font-bold text-lg leading-tight">cciRecruit</h1>
            <p className="text-sidebar-foreground/50 text-xs">Recruitment Platform</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.path} item={item} />)}
        <div className="my-4 border-t border-sidebar-border" />
        {bottomItems.map(item => (
  <NavLink
    key={item.path}
    item={item}
    showBadge={item.path === "/notifications"}
  />
))}
      </nav>

      <div className="px-3 pb-4 space-y-2">
        <button
          onClick={async () => {
  await supabase.auth.signOut();
window.location.replace("/login");
}}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-red-400 hover:bg-sidebar-accent transition-all w-full"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && user && (
          <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors group">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary text-xs font-bold">
              {user.photo_url
                ? <img src={user.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                : (user.full_name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
              }
            </div>
            <div className="min-w-0">
              <p className="text-sidebar-foreground text-sm font-medium truncate">{user.full_name || "User"}</p>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5", roleBadgeColor)}>{roleLabel}</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transition-transform duration-300 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-sidebar-foreground/60 hover:text-sidebar-foreground">
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-[72px]" : "w-64"
      )}>
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 h-6 w-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
          style={{ left: collapsed ? '60px' : '248px' }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  );
}