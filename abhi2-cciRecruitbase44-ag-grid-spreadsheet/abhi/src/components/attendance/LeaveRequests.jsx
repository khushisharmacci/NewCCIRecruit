import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { can } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarDays, Plus, Check, X, Clock, UserCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusConfig = {
  Pending: { color: "bg-amber-500/15 text-amber-300", icon: Clock, label: "Pending" },
  Approved: { color: "bg-emerald-500/15 text-emerald-300", icon: Check, label: "Approved" },
  Rejected: { color: "bg-red-500/15 text-red-300", icon: X, label: "Rejected" },
};

export default function LeaveRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeaves, setSelectedLeaves] = useState([]);
  const [form, setForm] = useState({
  leave_type: "Casual Leave",
  start_date: "",
  end_date: "",
  reason: ""
});

  const isCEO = can.isCEO(user);
  const canManage =
  can.manageUsers(user) ||
  can.isCEO(user);

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
  let query = supabase
    .from("leave_requests")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  

  const { data, error } =
    await query;

  if (error) throw error;

  return data || [];
},
  });

  const myRequests = leaveRequests.filter(
  (r) => r.user_id === user?.id
);
  const pendingRequests = leaveRequests.filter((r) => r.status === "Pending");

  const createMutation = useMutation({
  mutationFn: async (data) => {
    console.log("Submitting data:", data);

    const { data: result, error } = await supabase
      .from("leave_requests")
      .insert([data])
      .select();

    console.log("Supabase result:", result);
    console.log("Supabase error:", error);

    if (error) throw error;

    return result;
  },

  onSuccess: () => {
    console.log("SUCCESS");
    qc.invalidateQueries({
      queryKey: ["leave-requests"],
    });
    setDialogOpen(false);
  },

  onError: (err) => {
    console.error("Mutation Error:", err);
    alert(err.message);
  },
});
  const updateMutation = useMutation({
  mutationFn: async ({ id, status }) => {
    // Update leave request
    const { error } = await supabase
      .from("leave_requests")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    // Get updated leave request
    const { data: leave, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    console.log("Leave:", leave);

    // Create notification
    const { data, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: leave.user_id,
        company_id: leave.company_id,
        title:
          status === "Approved"
            ? "Leave Approved"
            : "Leave Rejected",
        message:
          status === "Approved"
            ? `Your ${leave.leave_type} request has been approved.`
            : `Your ${leave.leave_type} request has been rejected.`,
        type: "General",
        read: false,
        created_at: new Date().toISOString(),
      })
      .select();
    console.log("Notification result:", data);
    console.log("Notification error:", notificationError);
  },   // <-- THIS COMMA WAS MISSING

  onSuccess: () => {
    qc.invalidateQueries({
      queryKey: ["leave-requests"],
    });
  },
});
const deleteMutation = useMutation({
  mutationFn: async (ids) => {
    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .in("id", ids);

    if (error) throw error;
  },

  onSuccess: () => {
    qc.invalidateQueries({
      queryKey: ["leave-requests"],
    });

    setSelectionMode(false);
    setSelectedLeaves([]);
  },

  onError: (err) => {
    alert(err.message);
  },
});

  const handleSubmit = () => {
  console.log(user);
  console.log(form);

  createMutation.mutate({
    user_id: user.id,
    employee_name: user.full_name,
    leave_type: form.leave_type,
    start_date: form.start_date,
    end_date: form.end_date,
    reason: form.reason,
    status: "Pending",
  });
};

const handleDeleteSelected = () => {
  if (selectedLeaves.length === 0) return;

  if (
    window.confirm(
      `Delete ${selectedLeaves.length} leave request(s)?`
    )
  ) {
    deleteMutation.mutate(selectedLeaves);
  }
};

  const openAdd = () => {
    setForm({
  leave_type: "Casual Leave",
  start_date: "",
  end_date: "",
  reason: ""
});
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Employee Leave Request */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Leave Requests
          </h3>
          <div className="flex gap-2">

  {selectionMode && (
    <>
      <Button
        variant="destructive"
        onClick={handleDeleteSelected}
        disabled={selectedLeaves.length === 0}
      >
        Delete Selected ({selectedLeaves.length})
      </Button>

      <Button
        variant="outline"
        onClick={() => {
          setSelectionMode(false);
          setSelectedLeaves([]);
        }}
      >
        Cancel
      </Button>
    </>
  )}

  <Button
    variant="outline"
    size="icon"
    onClick={() => setSelectionMode(true)}
  >
    <Trash2 className="h-4 w-4 text-red-400" />
  </Button>

  <Button
    size="sm"
    onClick={openAdd}
    className="gap-2"
  >
    <Plus className="h-4 w-4" />
    Request Leave
  </Button>

</div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : myRequests.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No leave requests submitted</p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((r) => {
              const cfg = statusConfig[r.status] || statusConfig["Pending"];
              const StatusIcon = cfg.icon;
              return (
                <div
  key={r.id}
  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
>

  {selectionMode && (
    <input
      type="checkbox"
      checked={selectedLeaves.includes(r.id)}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedLeaves(prev => [...prev, r.id]);
        } else {
          setSelectedLeaves(prev =>
            prev.filter(id => id !== r.id)
          );
        }
      }}
    />
  )}
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.leave_type}</p>
                    <p className="text-xs text-muted-foreground">
  {r.leave_type} ·{" "}
  {r.start_date
    ? format(new Date(r.start_date), "MMM d")
    : "—"}{" "}
  →{" "}
  {r.end_date
    ? format(new Date(r.end_date), "MMM d, yyyy")
    : "—"}
</p>
                    {r.reason && <p className="text-xs text-muted-foreground/70 mt-0.5">{r.reason}</p>}
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.color)}>{r.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CEO/Admin Leave Management */}
      {canManage && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Leave Management
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-medium">{pendingRequests.length} pending</span>
            )}
          </h3>

          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No pending leave requests</p>
          ) : (
            <div className="space-y-2">

  {selectionMode && (
    <Button
      variant="outline"
      size="sm"
      className="mb-2"
      onClick={() => {
        if (
          selectedLeaves.length === myRequests.length
        ) {
          setSelectedLeaves([]);
        } else {
          setSelectedLeaves(
            myRequests.map(r => r.id)
          );
        }
      }}
    >
      {selectedLeaves.length === myRequests.length
        ? "Unselect All"
        : "Select All"}
    </Button>
  )}
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {r.employee_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
  {r.start_date
    ? format(new Date(r.start_date), "MMM d")
    : "—"}{" "}
  →{" "}
  {r.end_date
    ? format(new Date(r.end_date), "MMM d, yyyy")
    : "—"}
</p>
                    {r.reason && <p className="text-xs text-muted-foreground/70 mt-0.5">{r.reason}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => updateMutation.mutate({ id: r.id, status: "Approved" })}>
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => updateMutation.mutate({ id: r.id, status: "Rejected" })}>
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Date</Label>
                <Input
  type="date"
  value={form.start_date}
  onChange={(e) =>
    setForm({
      ...form,
      start_date: e.target.value,
    })
  }
/>
              </div>
              <div>
                <Label>To Date</Label>
                <Input
  type="date"
  value={form.end_date}
  onChange={(e) =>
    setForm({
      ...form,
      end_date: e.target.value,
    })
  }
/>
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Reason for leave..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
  <Button
    variant="outline"
    type="button"
    onClick={() => setDialogOpen(false)}
  >
    Cancel
  </Button>

  <Button
    type="button"
    onClick={() => {
      console.log("BUTTON CLICKED");
      handleSubmit();
    }}
  >
    Submit Request
  </Button>
</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}