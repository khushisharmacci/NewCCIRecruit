import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, LogIn, LogOut, AlertCircle, KeyRound, UserCog, Loader2, CheckCircle, XCircle } from "lucide-react";
import { can } from "@/lib/roles";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ACTION_ICONS = {
  login: LogIn,
  logout: LogOut,
  failed_login: AlertCircle,
  password_reset: KeyRound,
  role_change: UserCog,
};

const ACTION_COLORS = {
  login: "text-emerald-400 bg-emerald-500/15",
  logout: "text-slate-400 bg-slate-500/15",
  failed_login: "text-red-400 bg-red-500/15",
  password_reset: "text-amber-400 bg-amber-500/15",
  role_change: "text-blue-400 bg-blue-500/15",
};

const ACTION_LABELS = {
  login: "Login",
  logout: "Logout",
  failed_login: "Failed Login",
  password_reset: "Password Reset",
  role_change: "Role Change",
};

export default function SecurityAudit() {
  const { user } = useAuth();
  const companyId = "default";
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
  queryKey: ["login-activity"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("login_activity")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },
  refetchInterval: 30000,
});

  if (!can.manageSettings(user)) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold text-foreground">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">Only Super Admins and CEOs can view security audit logs.</p>
      </div>
    );
  }

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.user_email?.toLowerCase().includes(search.toLowerCase()) || l.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchAction && matchStatus;
  });

  const failedCount = logs.filter(l => l.status === "failed").length;
  const successCount = logs.filter(l => l.status === "success").length;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Security & Audit Logs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Track all login activity and security events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Events</p>
          <p className="text-2xl font-bold text-foreground mt-1">{logs.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Successful Logins</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{successCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Failed Attempts</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{failedCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Role Changes</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{logs.filter(l => l.action === "role_change").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email or name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.keys(ACTION_LABELS).map(a => <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Device</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(log => {
                const Icon = ACTION_ICONS[log.action] || LogIn;
                const colorClass = ACTION_COLORS[log.action] || ACTION_COLORS.login;
                return (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className={cn("inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium", colorClass)}>
                        <Icon className="h-3.5 w-3.5" />
                        {ACTION_LABELS[log.action] || log.action}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs">{log.user_name || "—"}</p>
                      <p className="text-muted-foreground text-xs">{log.user_email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">{log.user_role || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.status === "success" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Success</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3.5 w-3.5" /> Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground truncate max-w-[180px] block" title={log.device_info}>
                        {log.device_info ? log.device_info.substring(0, 40) + "..." : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {log.created_at ? format(new Date(log.created_at), "MMM d, h:mm a") : "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No activity logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Security Policies Info */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Active Security Measures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: "JWT Authentication", desc: "All sessions secured with JSON Web Tokens", active: true },
            { label: "Login Activity Tracking", desc: "Every login attempt is logged with device info", active: true },
            { label: "Role-Based Access Control", desc: "Granular permissions based on user role", active: true },
            { label: "Audit Logs", desc: "Full audit trail of user actions and role changes", active: true },
            { label: "Multi-Factor Authentication", desc: "Email OTP on registration — extend for logins", active: false },
            { label: "IP Restriction", desc: "Restrict logins to specific IP ranges", active: false },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", item.active ? "bg-emerald-500" : "bg-slate-300")} />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <span className={cn("ml-auto text-xs px-2 py-0.5 rounded-full shrink-0", item.active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400")}>
                {item.active ? "Active" : "Planned"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}