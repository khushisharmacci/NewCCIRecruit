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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarRange, Plus, Check, X, Clock, UserCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusConfig = {
  Pending: { color: "bg-amber-500/15 text-amber-300", icon: Clock, label: "Pending" },
  Approved: { color: "bg-emerald-500/15 text-emerald-300", icon: Check, label: "Approved" },
  Rejected: { color: "bg-red-500/15 text-red-300", icon: X, label: "Rejected" },
};

export default function RegularizationRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [form, setForm] = useState({
    date: "",
    check_in: "",
    check_out: "",
    work_mode: "WFO",
    reason: "",
  });

  const canManage = can.manageUsers(user) || can.isCEO(user);

  // Fetch all regularization requests
  const { data: regularizations = [], isLoading } = useQuery({
    queryKey: ["attendance-regularizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_regularizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const myRequests = regularizations.filter((r) => r.user_id === user?.id);
  const pendingRequests = regularizations.filter((r) => r.status === "Pending");

  // Create Request Mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from("attendance_regularizations")
        .insert([data])
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-regularizations"] });
      setDialogOpen(false);
    },
    onError: (err) => {
      alert("Failed to submit request: " + err.message);
    },
  });

  // Approve / Reject Request Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      // 1. Update regularization request status
      const { error: updateRequestError } = await supabase
        .from("attendance_regularizations")
        .update({ status })
        .eq("id", id);

      if (updateRequestError) throw updateRequestError;

      // 2. Fetch the request details
      const { data: request, error: fetchError } = await supabase
        .from("attendance_regularizations")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // 3. If approved, update/create corresponding attendance record
      if (status === "Approved") {
        // Calculate total hours
        let totalHours = 0;
        if (request.check_in && request.check_out) {
          const [h1, m1] = request.check_in.split(":").map(Number);
          const [h2, m2] = request.check_out.split(":").map(Number);
          totalHours = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
          totalHours = parseFloat(Math.max(0, totalHours).toFixed(2));
        }

        // Check if attendance record already exists for this date and user
        const { data: existingRecord } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("user_id", request.user_id)
          .eq("attendance_date", request.date)
          .maybeSingle();

        const attendancePayload = {
          user_id: request.user_id,
          company_id: request.company_id,
          employee_name: request.employee_name,
          attendance_date: request.date,
          check_in: request.check_in,
          check_out: request.check_out,
          work_mode: request.work_mode,
          total_hours: totalHours,
          status: "Present",
        };

        if (existingRecord) {
          const { error: recordError } = await supabase
            .from("attendance_records")
            .update(attendancePayload)
            .eq("id", existingRecord.id);
          if (recordError) throw recordError;
        } else {
          const { error: recordError } = await supabase
            .from("attendance_records")
            .insert([attendancePayload]);
          if (recordError) throw recordError;
        }
      }

      // 4. Create notification for the user
      await supabase
        .from("notifications")
        .insert({
          user_id: request.user_id,
          company_id: request.company_id,
          title: status === "Approved" ? "Attendance Regularized" : "Regularization Rejected",
          message: status === "Approved" 
            ? `Your regularization request for ${request.date} has been approved.`
            : `Your regularization request for ${request.date} has been rejected.`,
          type: "General",
          read: false,
          created_at: new Date().toISOString(),
        });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-regularizations"] });
      qc.invalidateQueries({ queryKey: ["attendance_records"] });
    },
    onError: (err) => {
      alert("Error updating request: " + err.message);
    },
  });

  // Delete Request Mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      const { error } = await supabase
        .from("attendance_regularizations")
        .delete()
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-regularizations"] });
      setSelectionMode(false);
      setSelectedRequests([]);
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const handleSubmit = () => {
    if (!form.date || !form.check_in || !form.check_out || !form.reason.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    createMutation.mutate({
      user_id: user.id,
      company_id: user.company_id || null,
      employee_name: user.full_name || user.email,
      date: form.date,
      check_in: form.check_in,
      check_out: form.check_out,
      work_mode: form.work_mode,
      reason: form.reason,
      status: "Pending",
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRequests.length === 0) return;
    if (window.confirm(`Delete ${selectedRequests.length} request(s)?`)) {
      deleteMutation.mutate(selectedRequests);
    }
  };

  const openAdd = () => {
    setForm({
      date: "",
      check_in: "",
      check_out: "",
      work_mode: "WFO",
      reason: "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* User Regularization Requests */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" /> Attendance Regularization
          </h3>
          <div className="flex gap-2">
            {selectionMode && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={selectedRequests.length === 0}
                >
                  Delete Selected ({selectedRequests.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedRequests([]);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button variant="outline" size="icon" onClick={() => setSelectionMode(true)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
            <Button size="sm" onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Request Regularization
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : myRequests.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No regularization requests submitted</p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((r) => {
              const cfg = statusConfig[r.status] || statusConfig["Pending"];
              const StatusIcon = cfg.icon;
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={selectedRequests.includes(r.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRequests((prev) => [...prev, r.id]);
                        } else {
                          setSelectedRequests((prev) => prev.filter((id) => id !== r.id));
                        }
                      }}
                    />
                  )}
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Regularization request for {r.date ? format(new Date(r.date), "MMM d, yyyy") : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Timings: {r.check_in} → {r.check_out} ({r.work_mode})
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

      {/* CEO/Admin Regularization Management */}
      {canManage && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Regularization Management
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-medium">
                {pendingRequests.length} pending
              </span>
            )}
          </h3>

          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No pending regularization requests</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {r.employee_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Date: {r.date ? format(new Date(r.date), "MMM d, yyyy") : "—"} · Timings: {r.check_in} → {r.check_out} ({r.work_mode})
                    </p>
                    {r.reason && <p className="text-xs text-muted-foreground/70 mt-0.5">{r.reason}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-7 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => updateMutation.mutate({ id: r.id, status: "Approved" })}
                    >
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-7 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => updateMutation.mutate({ id: r.id, status: "Rejected" })}
                    >
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request Regularization Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>Request Attendance Regularization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check In Time</Label>
                <Input
                  type="time"
                  value={form.check_in}
                  onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                />
              </div>
              <div>
                <Label>Check Out Time</Label>
                <Input
                  type="time"
                  value={form.check_out}
                  onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Work Mode</Label>
              <Select value={form.work_mode} onValueChange={(v) => setForm({ ...form, work_mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WFO">WFO</SelectItem>
                  <SelectItem value="WFH">WFH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                placeholder="Reason for regularization request..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}