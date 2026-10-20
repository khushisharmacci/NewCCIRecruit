import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, UsersRound, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Teams() {
  const queryClient = useQueryClient();
  const companyId = "default";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: "", lead_name: "", department: "", members: "", description: "" });

  const { data: teams = [], isLoading } = useQuery({
  queryKey: ["teams"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });
console.log("FETCHING TEAMS");
    if (error) throw error;

    return data || [];
  },
});

  const createMutation = useMutation({
  mutationFn: async (data) => {
    const { data: insertedTeam, error } = await supabase
      .from("teams")
      .insert([data])
      .select();

    if (error) throw error;

    return insertedTeam[0];
  },

  onSuccess: (newTeam) => {
    queryClient.setQueryData(["teams"], (old = []) => [
      newTeam,
      ...old,
    ]);

    setDialogOpen(false);

    setForm({
      name: "",
      lead_name: "",
      department: "",
      members: "",
      description: "",
    });

    toast.success("Team created successfully");
  },

  onError: (err) => {
  console.log("FULL ERROR", JSON.stringify(err, null, 2));
  console.log("MESSAGE", err.message);
  console.log("DETAILS", err.details);
  console.log("HINT", err.hint);
  console.log("CODE", err.code);

  toast.error(err.message || "Failed to create team");
},
});
  const updateMutation = useMutation({
  mutationFn: async ({ id, data }) => {
    const { error } = await supabase
      .from("teams")
      .update(data)
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    setDialogOpen(false);
    setEditItem(null);
  }
});
  const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    setDeleteId(null);
  }
});

  const openCreate = () => {setEditItem(null);setForm({ name: "", lead_name: "", department: "", members: "", description: "" });setDialogOpen(true);};
  const openEdit = (t) => {setEditItem(t);setForm({ name: t.name || "", lead_name: t.lead_name || "", department: t.department || "", members: t.members || "", description: t.description || "" });setDialogOpen(true);};

  const handleSave = (e) => {
    e.preventDefault();
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });else
    createMutation.mutate(form);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Teams</h1><p className="text-muted-foreground text-sm">Manage your recruitment teams</p></div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Create Team</Button>
      </div>

      {isLoading ?
      <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> :
      teams.length === 0 ?
      <div className="text-center py-20 text-muted-foreground">No teams yet — create your first team</div> :

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) =>
        <div key={t.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <UsersRound className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.department || "No department"}</p>
                </div>
              </div>
              {t.lead_name && <p className="text-sm text-muted-foreground mb-1">Lead: <span className="text-foreground font-medium">{t.lead_name}</span></p>}
              {t.members && <p className="text-sm text-muted-foreground mb-1">Members: {t.members}</p>}
              {t.description && <p className="text-xs text-muted-foreground mt-2">{t.description}</p>}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => openEdit(t)} className="gap-1"><Pencil className="h-3 w-3" /> Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteId(t.id)} className="gap-1 text-destructive"><Trash2 className="h-3 w-3" /> Delete</Button>
              </div>
            </div>
        )}
        </div>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Team" : "Create Team"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Team Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Team Lead</Label><Input value={form.lead_name} onChange={(e) => setForm({ ...form, lead_name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <div><Label>Members (comma-separated)</Label><Input value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} placeholder="e.g. John, Jane, Bob" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Team</AlertDialogTitle><AlertDialogDescription>This will permanently remove this team.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}