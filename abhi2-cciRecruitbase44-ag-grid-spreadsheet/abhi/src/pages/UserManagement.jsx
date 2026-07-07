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
import { Users, UserPlus, Shield, Search, Pencil, Mail, Loader2, CheckCircle2, Ban, Clock, RefreshCw, Trash2 } from "lucide-react";
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
  const companyId = "default";
const isMaster = true;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editUser, setEditUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [inviting, setInviting] = useState(false);

  const { data: users = [], isLoading } = useQuery({
  queryKey: ["all-users"],
  queryFn: async () => {
    const { data, error } = await supabase
  .from("recruiters")
  .select("*")
  .order("full_name")
  .order("created_at", { ascending: false });

    if (error) throw error;

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
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("recruiters")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["all-users"],
    });

    toast.success("User deleted");
  },

  onError: (error) => {
    toast.error(error.message || "Failed to delete user");
  },
});

  const handleSaveUser = async () => {
    const original = users.find(u => u.id === editUser.id);
    const roleChanged = original?.role !== editUser.role;

    await updateUser.mutateAsync({
      id: editUser.id,
      data: {
        role: editUser.role,
        account_status: editUser.account_status,
        department: editUser.department,
        designation: editUser.designation,
        phone: editUser.phone,
      }
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
    updateUser.mutate({ id: u.id, data: { account_status: "active", role: u.role || "viewer" } });
    logAudit({ actor: user, targetEmail: u.email, newRole: u.role || "viewer", companyId, notes: `${user?.full_name || user?.email} approved account for ${u.email}` });
    toast.success(`${u.full_name || u.email} approved`);
  };

  const handleSuspend = (u) => {
    updateUser.mutate({ id: u.id, data: { account_status: "suspended" } });
    logAudit({ actor: user, targetEmail: u.email, oldRole: u.role, newRole: u.role, companyId, notes: `${user?.full_name || user?.email} suspended ${u.email}` });
    toast.success(`${u.full_name || u.email} suspended`);
  };

  const handleReactivate = (u) => {
    updateUser.mutate({ id: u.id, data: { account_status: "active" } });
    logAudit({ actor: user, targetEmail: u.email, oldRole: u.role, newRole: u.role, companyId, notes: `${user?.full_name || user?.email} reactivated ${u.email}` });
    toast.success(`${u.full_name || u.email} reactivated`);
  };

  const handleInvite = async () => {
  if (!inviteEmail.trim()) return;

  setInviting(true);

  try {
    const { data, error } = await supabase.functions.invoke(
      "quick-handler",
      {
        body: {
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      }
    );

    console.log("INVITE DATA", data);
    console.log("INVITE ERROR", error);

    if (error) throw error;

    await logAudit({
      actor: user,
      targetEmail: inviteEmail,
      newRole: inviteRole,
      notes: `Invited by ${user?.full_name || user?.email}`,
    });

    toast.success("Invitation sent successfully");

    queryClient.invalidateQueries({
      queryKey: ["all-users"],
    });

    setInviteEmail("");
    setInviteRole("recruiter");
    setInviteOpen(false);

  } catch (err) {
    console.error("FULL ERROR", err);
    toast.error(err.message || "Failed to send invite");
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
          <UserPlus className="h-4 w-4" /> Invite User
        </Button>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
          <Clock className="h-5 w-5 shrink-0" />
          <span className="font-semibold">{pendingCount} user{pendingCount > 1 ? "s" : ""} awaiting approval</span>
          <Button
  onClick={() => {
    setStatusFilter("Pending Approval");
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
        `Delete ${u.full_name || u.email}?`
      )
    ) {
      deleteUser.mutate(u.id);
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
                <Label>Account Status</Label>
                <Select value={editUser.account_status || "active"} onValueChange={v => setEditUser(prev => ({ ...prev, account_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={editUser.department || ""} onChange={e => setEditUser(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={editUser.designation || ""} onChange={e => setEditUser(p => ({ ...p, designation: e.target.value }))} placeholder="e.g. Senior Recruiter" />
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

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              The invited user will be set to <strong>Pending Approval</strong> until you assign and activate their account.
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pre-assign Role (optional)</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {canAssign.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
