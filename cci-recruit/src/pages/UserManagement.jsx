import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { can, ROLE_LABELS, ASSIGNABLE_ROLE_LIST, getRoleLevel, USER_STATUS_LABELS, assignableRoles } from "@/lib/roles";
import { Users, UserPlus, Shield, Search, Pencil, Mail, Loader2, CheckCircle2, Ban, Clock, RefreshCw, Trash2, Key, Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ROLE_COLORS = {
  ceo: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  admin: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  team_lead: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  recruiter: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  employee: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  viewer: "bg-gray-500/15 text-gray-300 border-gray-500/30",
};

const STATUS_COLORS = {
  active: "bg-green-500/15 text-green-300 border-green-500/30",
  pending_approval: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  suspended: "bg-red-500/15 text-red-300 border-red-500/30",
};

async function logAudit({
  actor,
  targetEmail,
  action,
  oldRole,
  newRole,
  notes,
}) {
  try {
    await supabase.from("login_activity").insert([
      {
        user_email: targetEmail,
        user_name: actor?.full_name || actor?.email || "",
        user_role: newRole || oldRole || "",
        action: action || "role_change",
        status: "success",
        device_info: notes || "",
      },
    ]);
  } catch {}
}

export default function UserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.company_id || "default";
  const isMaster = true;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editUser, setEditUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [invitePassword, setInvitePassword] = useState("CCI@Recruit2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateStrongPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*";
    let pwd = "CCI@";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd + "!";
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiters")
        .select("*")
        .order("full_name");

      if (error) {
        console.error("Error fetching recruiters:", error);
        throw error;
      }

      return data || [];
    },
  });

  const updateUser = useMutation({
  mutationFn: async ({ id, data }) => {
    const { error } = await supabase
      .from("recruiters")
      .update(data)
      .eq("id", id);

    if (error) throw error;

    return true;
  },

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["all-users"],
    });

    toast.success("User updated");
    setEditUser(null);
  },

  onError: (error) => {
    toast.error(error.message || "Failed to update user");
  },
});
const deleteUser = useMutation({
  mutationFn: async (target) => {
    const targetId = typeof target === "object" ? target.id : target;
    const targetEmail = typeof target === "object" ? target.email : null;

    let query = supabase.from("recruiters").delete();
    if (targetId) {
      query = query.eq("id", targetId);
    } else if (targetEmail) {
      query = query.ilike("email", targetEmail);
    }

    const { error } = await query;
    if (error) throw error;
    return target;
  },

  onMutate: async (target) => {
    await queryClient.cancelQueries({ queryKey: ["all-users"] });
    const previousUsers = queryClient.getQueryData(["all-users"]) || [];

    const targetId = typeof target === "object" ? target.id : target;
    const targetEmail = typeof target === "object" ? target.email : null;

    queryClient.setQueryData(["all-users"], (old = []) =>
      old.filter((u) => u.id !== targetId && (!targetEmail || u.email?.toLowerCase() !== targetEmail.toLowerCase()))
    );

    return { previousUsers };
  },

  onSuccess: (target) => {
    queryClient.invalidateQueries({
      queryKey: ["all-users"],
    });

    const targetEmail = typeof target === "object" ? target.email : "";
    logAudit({
      actor: user,
      targetEmail: targetEmail,
      action: "delete_user",
      notes: `${user?.full_name || user?.email} deleted user ${targetEmail}`,
    });

    toast.success("User deleted successfully");
  },

  onError: (error, target, context) => {
    if (context?.previousUsers) {
      queryClient.setQueryData(["all-users"], context.previousUsers);
    }
    toast.error(error.message || "Failed to delete user");
  },
});

  const handleSaveUser = async () => {
    const original = users.find(u => u.id === editUser.id);
    const roleChanged = original?.role !== editUser.role;

    const dataPayload = {
      role: editUser.role,
      phone: editUser.phone || null,
      full_name: editUser.full_name || null,
    };

    await updateUser.mutateAsync({
      id: editUser.id,
      data: dataPayload,
    });

    if (roleChanged) {
      logAudit({
        actor: user,
        targetEmail: editUser.email,
        oldRole: original?.role,
        newRole: editUser.role,
        companyId: companyId,
      });
    }
  };

  const handleApprove = (u) => {
    updateUser.mutate({ id: u.id, data: { role: u.role || "recruiter" } });
    logAudit({ actor: user, targetEmail: u.email, newRole: u.role || "recruiter", companyId, notes: `${user?.full_name || user?.email} approved account for ${u.email}` });
    toast.success(`${u.full_name || u.email} approved`);
  };

  const handleSuspend = (u) => {
    updateUser.mutate({ id: u.id, data: { role: "viewer" } });
    logAudit({ actor: user, targetEmail: u.email, oldRole: u.role, newRole: "viewer", companyId, notes: `${user?.full_name || user?.email} suspended ${u.email}` });
    toast.success(`${u.full_name || u.email} suspended`);
  };

  const handleReactivate = (u) => {
    updateUser.mutate({ id: u.id, data: { role: "recruiter" } });
    logAudit({ actor: user, targetEmail: u.email, oldRole: u.role, newRole: "recruiter", companyId, notes: `${user?.full_name || user?.email} reactivated ${u.email}` });
    toast.success(`${u.full_name || u.email} reactivated`);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    const cleanEmail = inviteEmail.trim().toLowerCase();
    const cleanPassword = invitePassword.trim() || generateStrongPassword();
    const cleanName = inviteName.trim() || cleanEmail.split("@")[0];
    let targetCompanyId = user?.company_id && user?.company_id !== "default" ? user.company_id : null;
    if (!targetCompanyId) {
      try {
        const { data: anyRec } = await supabase
          .from("recruiters")
          .select("company_id")
          .not("company_id", "is", null)
          .limit(1)
          .maybeSingle();

        if (anyRec?.company_id) {
          targetCompanyId = anyRec.company_id;
        }
      } catch {}
    }

    try {
      let success = false;
      let lastErrorMsg = "";

      // 1. Attempt Vercel serverless function first (to create/update auth credentials)
      try {
        const apiRes = await fetch("/api/admin-create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            role: inviteRole,
            full_name: cleanName,
            company_id: targetCompanyId,
          }),
        });

        const apiData = await apiRes.json().catch(() => null);
        if (apiRes.ok && apiData?.success) {
          success = true;
        } else if (apiData?.error) {
          lastErrorMsg = apiData.error;
          if (!apiData.needs_config) {
            console.warn("API returned error:", apiData.error);
          }
        }
      } catch (apiErr) {
        console.warn("API route not available, falling back:", apiErr);
      }

      // 2. Fall back to Supabase Edge Function 'quick-handler'
      if (!success) {
        try {
          const { data, error } = await supabase.functions.invoke("quick-handler", {
            body: {
              email: cleanEmail,
              password: cleanPassword,
              role: inviteRole,
              full_name: cleanName,
              company_id: targetCompanyId,
            },
          });

          if (!error && data?.success) {
            success = true;
          } else if (data?.error || error) {
            lastErrorMsg = data?.error || error?.message || lastErrorMsg;
          }
        } catch (edgeErr) {
          console.warn("Edge function invoke error:", edgeErr);
        }
      }

      // 3. GUARANTEE DIRECT DATABASE ENTRY: Upsert directly into public.recruiters
      // Ensures the user is immediately in the recruiters table and visible in the app
      try {
        const { data: existingRec } = await supabase
          .from("recruiters")
          .select("id")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (existingRec) {
          const { error: updErr } = await supabase
            .from("recruiters")
            .update({
              role: inviteRole,
              full_name: cleanName,
              company_id: targetCompanyId,
              account_status: "active",
            })
            .eq("id", existingRec.id);

          if (!updErr) success = true;
        } else {
          const { error: insErr } = await supabase
            .from("recruiters")
            .insert({
              email: cleanEmail,
              full_name: cleanName,
              role: inviteRole,
              company_id: targetCompanyId,
              account_status: "active",
            });

          if (!insErr) {
            success = true;
          } else {
            // Fallback without account_status column in case not migrated
            const { error: fallbackErr } = await supabase
              .from("recruiters")
              .insert({
                email: cleanEmail,
                full_name: cleanName,
                role: inviteRole,
                company_id: targetCompanyId,
              });

            if (!fallbackErr) {
              success = true;
            } else {
              console.error("Direct recruiter insert failed:", fallbackErr);
            }
          }
        }
      } catch (directDbErr) {
        console.error("Direct DB upsert error:", directDbErr);
      }

      if (!success && lastErrorMsg) {
        throw new Error(lastErrorMsg);
      }

      await logAudit({
        actor: user,
        targetEmail: cleanEmail,
        newRole: inviteRole,
        notes: `Created/updated user account with credentials by ${user?.full_name || user?.email}`,
      });

      toast.success("User account saved and activated!");

      queryClient.invalidateQueries({
        queryKey: ["all-users"],
      });

      // Save credentials and present credential dialog to admin
      setCreatedCredentials({
        email: cleanEmail,
        password: cleanPassword,
        role: inviteRole,
        full_name: cleanName,
      });

      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword(generateStrongPassword());
      setCredentialsOpen(true);
    } catch (err) {
      console.error("FULL ERROR", err);
      let message = err.message || "Failed to create user account";
      if (message.includes("rate limit") || message.includes("429")) {
        message = "Supabase email rate limit exceeded. Please configure custom SMTP in Supabase settings or use direct credentials.";
      }
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  if (!can.manageUsers(user)) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold text-foreground">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">Only Company Admins can manage users.</p>
      </div>
    );
  }

  const myAssignableRoles = assignableRoles(user?.role);
  const canAssign = ASSIGNABLE_ROLE_LIST.filter(r => myAssignableRoles.includes(r) || user?.role === "ceo" || user?.role === "ceo")

  const pendingCount = users.filter(u => u.account_status === "pending_approval").length;

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || (u.account_status || "active") === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users & Permissions</h1>
          <p className="text-muted-foreground text-sm">Manage roles, approval workflow and access control</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add / Invite User
        </Button>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
          <Clock className="h-5 w-5 shrink-0" />
          <span className="font-semibold">{pendingCount} user{pendingCount > 1 ? "s" : ""} awaiting approval</span>
          <Button
  onClick={() => {
    setStatusFilter("pending_approval");
  }}
>
  View
</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{users.filter(u => (u.account_status || "active") === "active").length}</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl border border-amber-500/25 p-4">
          <p className="text-xs text-amber-400">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-300 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Suspended</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{users.filter(u => u.account_status === "suspended").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ASSIGNABLE_ROLE_LIST.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => {
                const status = u.account_status || "active";
                return (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">{(u.full_name || u.email || "?")[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", ROLE_COLORS[u.role] || ROLE_COLORS.viewer)}>
                        {ROLE_LABELS[u.role] || u.role || "Viewer"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", STATUS_COLORS[status] || STATUS_COLORS.active)}>
                        {USER_STATUS_LABELS[status] || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {u.created_date ? format(new Date(u.created_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.id !== user?.id && u.role !== "ceo" && (
                          <>
                            {status === "pending_approval" && can.approveUsers(user) && (
                              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/15" onClick={() => handleApprove(u)}>
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </Button>
                            )}
                            {status === "active" && can.suspendUsers(user) && (
                              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/15" onClick={() => handleSuspend(u)}>
                                <Ban className="h-3 w-3" /> Suspend
                              </Button>
                            )}
                            {status === "suspended" && can.suspendUsers(user) && (
                              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/15" onClick={() => handleReactivate(u)}>
                                <RefreshCw className="h-3 w-3" /> Reactivate
                              </Button>
                            )}
                          </>
                        )}
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setEditUser({ ...u })}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        {u.id !== user?.id && (
  <Button
  size="icon"
  variant="ghost"
  className="h-7 w-7 text-red-400 hover:bg-red-500/15"
  onClick={() => {
    if (
      window.confirm(
        `Delete ${u.full_name || u.email}? This action cannot be undone.`
      )
    ) {
      deleteUser.mutate(u);
    }
  }}
>
  <Trash2 className="h-3 w-3" />
</Button>
)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md bg-[#0F172A] border border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.full_name || editUser?.email}</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Role changes are logged in the audit trail.
              </div>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={editUser.full_name || ""}
                  onChange={e => setEditUser(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editUser.role || "viewer"} onValueChange={v => setEditUser(prev => ({ ...prev, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {canAssign.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editUser.phone || ""} onChange={e => setEditUser(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSaveUser} disabled={updateUser.isPending}>
                  {updateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add or Invite New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Users added here are <strong>immediately activated</strong> with their assigned password so they can log in at <code>/login</code> without waiting for email verification.
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-200">Full Name</Label>
              <Input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Niharika Sharma"
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-200">Email Address <span className="text-red-400">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-200">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {canAssign.map((r) => (
                    <SelectItem key={r} value={r} className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-slate-200">Login Password <span className="text-red-400">*</span></Label>
                <button
                  type="button"
                  onClick={() => setInvitePassword(generateStrongPassword())}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Auto-generate
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Enter login password"
                  className="pl-9 pr-10 bg-slate-900 border-slate-700 text-white font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You will be able to copy these credentials and share them directly with the user.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-primary text-primary-foreground font-semibold"
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
              >
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Adding User...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Create & Activate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Confirmation Dialog */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Account Created Successfully!
            </DialogTitle>
          </DialogHeader>

          {createdCredentials && (() => {
            const loginUrl = window.location.origin.includes("localhost")
              ? "https://cci-recruit.vercel.app/login"
              : `${window.location.origin}/login`;

            return (
              <div className="space-y-4 text-sm mt-1">
                <p className="text-center text-slate-300 text-xs">
                  This user account is now <strong className="text-emerald-400">Active</strong>. The user can log in immediately with the credentials below:
                </p>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-sans">Login URL</span>
                      <a
                        href={loginUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {loginUrl}
                      </a>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-slate-400 hover:text-white"
                      onClick={() => {
                        navigator.clipboard.writeText(loginUrl);
                        toast.success("Login URL copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-sans">Full Name</span>
                    <span className="text-slate-200">{createdCredentials.full_name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-sans">Email Address</span>
                      <span className="text-slate-200 font-semibold">{createdCredentials.email}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-slate-400 hover:text-white"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.email);
                        toast.success("Email copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-sans">Password</span>
                      <span className="text-amber-300 font-semibold">{createdCredentials.password}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-slate-400 hover:text-white"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.password);
                        toast.success("Password copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-sans">Role</span>
                      <span className="text-emerald-300 font-sans font-medium uppercase text-xs">
                        {ROLE_LABELS[createdCredentials.role] || createdCredentials.role}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-slate-400 hover:text-white"
                      onClick={() => {
                        navigator.clipboard.writeText(ROLE_LABELS[createdCredentials.role] || createdCredentials.role);
                        toast.success("Role copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    onClick={() => {
                      const message = `Welcome to cciRecruit!\n\nHere are your login credentials:\nLogin URL: ${loginUrl}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${ROLE_LABELS[createdCredentials.role] || createdCredentials.role}`;
                      navigator.clipboard.writeText(message);
                      setCopied(true);
                      toast.success("All credentials copied to clipboard!");
                      setTimeout(() => setCopied(false), 3000);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied to Clipboard!" : "Copy All Credentials"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => setCredentialsOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
