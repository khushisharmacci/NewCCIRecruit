import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Pencil, Trash2, Clock, Video, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

const statusColors = {
  "Scheduled": "bg-amber-500/15 text-amber-300",
  "Completed": "bg-blue-500/15 text-blue-300",
  "Selected": "bg-emerald-500/15 text-emerald-300",
  "Rejected": "bg-red-500/15 text-red-300",
  "On Hold": "bg-gray-500/15 text-gray-400",
  "Cancelled": "bg-red-500/15 text-red-300",
  "Rescheduled": "bg-purple-500/15 text-purple-300",
};

const typeIcons = {
  "Online": Video,
  "Offline": MapPin,
};

export default function InterviewManager({ candidate }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ interview_date: "", interview_time: "", interview_type: "Online", status: "Scheduled", notes: "", interviewer: "", location: "" });

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["candidate-interviews", candidate.id],
    queryFn: async () => {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("interview_date", { ascending: false });

  if (error) throw error;

  return data || [];
},
  });

  const sorted = [...interviews].sort((a, b) => {
    const da = a.interview_date ? new Date(a.interview_date) : 0;
    const db = b.interview_date ? new Date(b.interview_date) : 0;
    return db - da;
  });

  const invalidateAll = () => {
  queryClient.invalidateQueries({
    queryKey: ["candidate-interviews", candidate.id],
  });

  queryClient.invalidateQueries({
    queryKey: ["interviews"],
  });

  queryClient.invalidateQueries({
    queryKey: ["upcoming-interviews"],
  });

  queryClient.invalidateQueries({
    queryKey: ["notifications"],
  });

  queryClient.invalidateQueries({
    queryKey: ["sidebar-notifications"],
  });
};

  const createMutation = useMutation({
    mutationFn: async (data) => {
  const { data: created, error } = await supabase
    .from("interviews")
    .insert([data])
    .select()
    .single();

  if (error) throw error;

  return created;
},
    onSuccess: async (created) => {
  invalidateAll();

  await supabase.from("notifications").insert([
    {
      title: `Interview scheduled: ${created.candidate_name}`,
      message: `Interview scheduled with ${created.candidate_name}`,
      user_id: candidate.user_id,
      company_id: candidate.company_id,
      created_at: new Date().toISOString(),
      type: "Interview",
      read: false,
      link: "/interviews",
    },
  ]);
setEditing(null);

setForm({
  interview_date: "",
  interview_time: "",
  interview_type: "Online",
  status: "Scheduled",
  notes: "",
  interviewer: "",
  location: "",
});
  setDialogOpen(false);
},
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
  const { data: updated, error } = await supabase
    .from("interviews")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return updated;
},
    onSuccess: async (updated, { data }) => {
  invalidateAll();

  let action = "updated";

  if (data.status === "Cancelled")
    action = "cancelled";

  else if (data.status === "Completed")
    action = "completed";

  else if (data.status === "Rescheduled")
    action = "rescheduled";

  await supabase.from("notifications").insert([
    {
      title: `Interview ${action}: ${updated.candidate_name}`,
      message: `Interview ${action} for ${updated.candidate_name}`,
      type: "Interview",
      read: false,
      link: "/interviews",
    },
  ]);
setEditing(null);

setForm({
  interview_date: "",
  interview_time: "",
  interview_type: "Online",
  status: "Scheduled",
  notes: "",
  interviewer: "",
  location: "",
});
  setDialogOpen(false);
},
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("id", id);

  if (error) throw error;
},
    onSuccess: () => {
  invalidateAll();
},
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ interview_date: "", interview_time: "", interview_type: "Online", status: "Scheduled", notes: "", interviewer: "", location: "" });
    setDialogOpen(true);
  };

const statuses = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "Rescheduled",
  "Selected",
  "Rejected",
  "On Hold",
];

  const openEdit = (interview) => {
    setEditing(interview);
    setForm({
      interview_date: interview.interview_date ? interview.interview_date.split("T")[0] : "",
      interview_time: interview.interview_time || "",
      interview_type: interview.interview_type || "Online",
      status: interview.status || "Scheduled",
      notes: interview.notes || interview.feedback || "",
      interviewer: interview.interviewer || "",
      location: interview.location || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
   const data = {
  candidate_id: candidate.id,
  candidate_name: candidate.full_name,
  position_title:
    candidate.position_title ||
    candidate.position ||
    "",

  company_id: candidate.company_id,
  user_id: candidate.user_id,

    created_by:
    (user?.full_name || user?.name)?.trim().split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "",

  ...form,
};
    if (editing) {
      updateMutation.mutate({
  id: editing.id,
  data: {
    ...editing,
    ...form,
  },
});
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Interview History
        </h3>
        <Button size="sm" onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Interview
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No interviews recorded yet</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((i) => {
            const TypeIcon = typeIcons[i.interview_type] || Video;
            return (
              <div key={i.id} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <TypeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{i.interview_type || "Interview"}</span>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusColors[i.status] || statusColors["Scheduled"])}>{i.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {i.interview_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(i.interview_date), "MMM d, yyyy")}</span>}
                      {i.interview_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {i.interview_time}</span>}
                      {i.interviewer && <span>Interviewer: {i.interviewer}</span>}
                      {i.location && <span>Location: {i.location}</span>}
                    </div>
                    {i.notes && <p className="text-sm text-muted-foreground mt-2">{i.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400" onClick={() => deleteMutation.mutate(i.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Interview" : "Add Interview"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Interview Date</Label>
                <Input type="date" value={form.interview_date} onChange={(e) => setForm({ ...form, interview_date: e.target.value })} />
              </div>
              <div>
                <Label>Interview Time</Label>
                <Input type="time" value={form.interview_time} onChange={(e) => setForm({ ...form, interview_time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Interview Type</Label>
                <Select value={form.interview_type} onValueChange={(v) => setForm({ ...form, interview_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
  {statuses.map((status) => (
    <SelectItem
      key={status}
      value={status}
    >
      {status}
    </SelectItem>
  ))}
</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Interviewer</Label>
              <Input value={form.interviewer} onChange={(e) => setForm({ ...form, interviewer: e.target.value })} placeholder="Interviewer name" />
            </div>
            <div>
              <Label>Location / Meeting Link</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Office address or video link" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Interview notes and feedback..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.interview_date || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Add Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}