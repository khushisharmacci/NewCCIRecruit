import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusConfig = {
  "Selected": { color: "bg-emerald-500/15 text-emerald-300", icon: Check, label: "Selected" },
  "Rejected": { color: "bg-red-500/15 text-red-300", icon: X, label: "Rejected" },
  "Pending": { color: "bg-amber-500/15 text-amber-300", icon: Clock, label: "Pending" },
};

export default function ClientSubmissions({ candidate }) {
  const queryClient = useQueryClient();
  const { stampRecord } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ client_name: "", date_sent: "", status: "Pending" });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["client-submissions", candidate.id],
    queryFn: async () => {
  const { data, error } = await supabase
    .from("client_submissions")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("date_sent", { ascending: false });

  if (error) throw error;

  return data || [];
},
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
  const { error } = await supabase
    .from("client_submissions")
    .insert([stampRecord(data)]);

  if (error) throw error;
},
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-submissions", candidate.id] }); setDialogOpen(false); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
  const { error } = await supabase
    .from("client_submissions")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
},
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-submissions", candidate.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
  const { error } = await supabase
    .from("client_submissions")
    .delete()
    .eq("id", id);

  if (error) throw error;
},
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-submissions", candidate.id] }),
  });

  const openAdd = () => {
    setForm({ client_name: "", date_sent: format(new Date(), "yyyy-MM-dd"), status: "Pending" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    createMutation.mutate({
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      ...form,
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Client Submissions
        </h3>
        <Button size="sm" onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : submissions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No client submissions yet</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => {
            const cfg = statusConfig[s.status] || statusConfig["Pending"];
            const StatusIcon = cfg.icon;
            return (
              <div key={s.id} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.client_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Resume sent: {s.date_sent ? format(new Date(s.date_sent), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={s.status} onValueChange={(v) => updateStatus.mutate({ id: s.id, status: v })}>
                      <SelectTrigger className={cn("h-7 w-auto gap-1 text-xs font-medium border-0", cfg.color)}>
                        <StatusIcon className="h-3 w-3" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">⏳ Pending</SelectItem>
                        <SelectItem value="Selected">✅ Selected</SelectItem>
                        <SelectItem value="Rejected">❌ Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400" onClick={() => deleteMutation.mutate(s.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client Name</Label>
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Enter client name" />
            </div>
            <div>
              <Label>Date Resume Sent</Label>
              <Input type="date" value={form.date_sent} onChange={(e) => setForm({ ...form, date_sent: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">⏳ Pending</SelectItem>
                  <SelectItem value="Selected">✅ Selected</SelectItem>
                  <SelectItem value="Rejected">❌ Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.client_name || !form.date_sent || createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}