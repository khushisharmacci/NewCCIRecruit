import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Target as TargetIcon, Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const periods = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];
const types = ["Placements", "Interviews", "Screenings", "Revenue", "Closures"];

export default function Targets() {
  const queryClient = useQueryClient();
  const companyId = "default";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ recruiter_name: "", period: "Monthly", target_type: "Placements", target_value: "", achieved_value: "" });

  const { data: targets = [], isLoading } = useQuery({
  queryKey: ["targets"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("targets")
      .select("*");

    if (error) throw error;

    return data || [];
  },
});

  const createMutation = useMutation({
  mutationFn: async (data) => {
    const { error } = await supabase
      .from("targets")
      .insert([data]);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["targets"] });
    setDialogOpen(false);
  }
});
  const updateMutation = useMutation({
  mutationFn: async ({ id, data }) => {
    const { error } = await supabase
      .from("targets")
      .update(data)
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["targets"] });
    setDialogOpen(false);
    setEditItem(null);
  }
});
  const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("targets")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["targets"] });
    setDeleteId(null);
  }
});

  const openCreate = () => {setEditItem(null);setForm({ recruiter_name: "", period: "Monthly", target_type: "Placements", target_value: "", achieved_value: "" });setDialogOpen(true);};
  const openEdit = (t) => {setEditItem(t);setForm({ recruiter_name: t.recruiter_name || "", period: t.period || "Monthly", target_type: t.target_type || "Placements", target_value: t.target_value || "", achieved_value: t.achieved_value || "" });setDialogOpen(true);};

  const handleSave = (e) => {
    e.preventDefault();
    const payload = { ...form, target_value: Number(form.target_value), achieved_value: Number(form.achieved_value) || 0 };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });else
    createMutation.mutate(payload);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Targets</h1><p className="text-muted-foreground text-sm">Set and track recruitment goals</p></div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Set Target</Button>
      </div>

      {isLoading ?
      <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> :
      targets.length === 0 ?
      <div className="text-center py-20 text-muted-foreground">No targets set — define your first goal</div> :

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targets.map((t) => {
          const pct = t.target_value > 0 ? Math.min(Math.round(t.achieved_value / t.target_value * 100), 100) : 0;
          return (
            <div key={t.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <TargetIcon className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.recruiter_name}</p>
                      <p className="text-xs text-muted-foreground">{t.target_type} — {t.period}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.achieved_value || 0} / {t.target_value}</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </div>);

        })}
        </div>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Target" : "Set Target"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label>Recruiter Name *</Label><Input value={form.recruiter_name} onChange={(e) => setForm({ ...form, recruiter_name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Period</Label>
                <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Target Value *</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} required /></div>
              <div><Label>Achieved Value</Label><Input type="number" value={form.achieved_value} onChange={(e) => setForm({ ...form, achieved_value: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Target</AlertDialogTitle><AlertDialogDescription>This will permanently remove this target.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}