import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTenant } from "@/lib/tenant";
import { toast } from "sonner";

const stages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
const stageColors = {
  "New Lead": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Contacted": "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "Qualified": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Proposal Sent": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Negotiation": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Won": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Lost": "bg-red-500/15 text-red-300 border-red-500/30"
};

export default function CRM() {
  const queryClient = useQueryClient();
  const companyId = "default";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ company_name: "", contact_person: "", email: "", phone: "", stage: "New Lead", source: "", notes: "", value: "", next_followup: "" });

  const { data: leads = [], isLoading } = useQuery({
  queryKey: ["leads"],
  queryFn: async () => {
    console.log("FETCHING LEADS");

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },
});

const createMutation = useMutation({
  mutationFn: async (data) => {
    const { data: insertedLead, error } = await supabase
      .from("leads")
      .insert([data])
      .select();

    if (error) {
      console.error(error);
      throw error;
    }

    return insertedLead[0];
  },

  onError: (err) => {
    console.error("MUTATION ERROR", err);
    toast.error(err.message);
  },

  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ["leads"],
    });

    await queryClient.refetchQueries({
      queryKey: ["leads"],
    });

    setDialogOpen(false);

    setForm({
      company_name: "",
      contact_person: "",
      email: "",
      phone: "",
      stage: "New Lead",
      source: "",
      notes: "",
      value: "",
      next_followup: "",
    });

    toast.success("Lead created successfully");
  },
}); 

  const updateMutation = useMutation({
  mutationFn: async ({ id, data }) => {
    const { error } = await supabase
      .from("leads")
      .update(data)
      .eq("id", id);

    if (error) {
  console.error("LEADS INSERT ERROR:", error);
  throw error;
}
  },
    onSuccess: async () => {
  await queryClient.invalidateQueries({
    queryKey: ["leads"],
  });

  await queryClient.refetchQueries({
    queryKey: ["leads"],
  });

  setDialogOpen(false);

  setForm({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    stage: "New Lead",
    source: "",
    notes: "",
    value: "",
    next_followup: "",
  });
},
  });
  const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) {
  console.error("LEADS INSERT ERROR:", error);
  throw error;
}
  },
    onSuccess: async () => {
  await queryClient.invalidateQueries({
    queryKey: ["leads"],
  });

  await queryClient.refetchQueries({
    queryKey: ["leads"],
  });

  setDialogOpen(false);

  setForm({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    stage: "New Lead",
    source: "",
    notes: "",
    value: "",
    next_followup: "",
  });
},
  });

  const openCreate = () => {setEditItem(null);setForm({ company_name: "", contact_person: "", email: "", phone: "", stage: "New Lead", source: "", notes: "", value: "", next_followup: "" });setDialogOpen(true);};
  const openEdit = (l) => {setEditItem(l);setForm({ company_name: l.company_name || "", contact_person: l.contact_person || "", email: l.email || "", phone: l.phone || "", stage: l.stage || "New Lead", source: l.source || "", notes: l.notes || "", value: l.value || "", next_followup: l.next_followup ? l.next_followup.split("T")[0] : "" });setDialogOpen(true);};

  const handleSave = (e) => {
  e.preventDefault();

  const payload = {
    company_name: form.company_name,
    contact_person: form.contact_person,
    email: form.email,
    phone: form.phone,
    stage: form.stage,
    notes: form.notes,
  };

  if (editItem) {
    updateMutation.mutate({
      id: editItem.id,
      data: payload,
    });
  } else {
    createMutation.mutate(payload);
  }
};

  const groupedByStage = stages.map((s) => ({ stage: s, leads: leads.filter((l) => l.stage === s) }));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">CRM and Leads</h1><p className="text-muted-foreground text-sm">{leads.length} total leads in pipeline</p></div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Lead</Button>
      </div>

      {isLoading ?
      <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> :

      <div className="flex gap-4 overflow-x-auto pb-4">
          {groupedByStage.map(({ stage, leads: stageLeads }) =>
        <div key={stage} className="min-w-[260px] max-w-[280px] flex-shrink-0">
              <div className={cn("px-3 py-2 rounded-t-lg border text-sm font-semibold", stageColors[stage])}>
                {stage} ({stageLeads.length})
              </div>
              <div className="bg-muted/30 border border-t-0 border-border rounded-b-lg p-2 space-y-2 min-h-[120px]">
                {stageLeads.length === 0 ?
            <p className="text-xs text-muted-foreground text-center py-4">No leads</p> :
            stageLeads.map((l) =>
            <div key={l.id} className="bg-card rounded-lg border border-border p-3 space-y-2 hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium text-foreground">{l.company_name}</p>
                    <p className="text-xs text-muted-foreground">{l.contact_person}</p>
                    {l.value && <p className="text-xs font-semibold text-primary">${Number(l.value).toLocaleString()}</p>}
                    {l.next_followup && <p className="text-xs text-amber-400">Follow-up: {format(new Date(l.next_followup), "MMM d")}</p>}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(l)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(l.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
            )}
              </div>
            </div>
        )}
        </div>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Lead" : "Add Lead"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Company Name *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required /></div>
              <div><Label>Contact Person *</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Deal Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              <div><Label>Next Follow-up</Label><Input type="date" value={form.next_followup} onChange={(e) => setForm({ ...form, next_followup: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Lead</AlertDialogTitle><AlertDialogDescription>This will permanently remove this lead.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}