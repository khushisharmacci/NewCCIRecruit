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
import { Plus, Building2, Pencil, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant";

export default function Companies() {
  const queryClient = useQueryClient();
  const { tenantFilter, stampRecord, companyId } = useTenant();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: "", industry: "", contact_person: "", contact_email: "", contact_phone: "", address: "", status: "Active", notes: "" });


 const {
    data: clients = [],
    isLoading,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    },
  });


  const createMutation = useMutation({
    mutationFn: async (data) => {
  const { error } = await supabase
    .from("clients")
    .insert([data]);

  if (error) throw error;
},
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["clients"] });setDialogOpen(false);}
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
  const { error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", id);

  if (error) throw error;
},
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["clients"] });setDialogOpen(false);setEditItem(null);}
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);

  if (error) throw error;
},
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["clients"] });setDeleteId(null);}
  });

  const openCreate = () => {setEditItem(null);setForm({ name: "", industry: "", contact_person: "", contact_email: "", contact_phone: "", address: "", status: "Active", notes: "" });setDialogOpen(true);};
  const openEdit = (c) => {setEditItem(c);setForm({ name: c.name || "", industry: c.industry || "", contact_person: c.contact_person || "", contact_email: c.contact_email || "", contact_phone: c.contact_phone || "", address: c.address || "", status: c.status || "Active", notes: c.notes || "" });setDialogOpen(true);};

  const handleSave = (e) => {
    e.preventDefault();
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });else
    createMutation.mutate(form);
  };

  const filtered = clients.filter((c) =>
  !search ||
  c.name?.toLowerCase().includes(search.toLowerCase()) ||
  c.industry?.toLowerCase().includes(search.toLowerCase())
);

  const statusColor = { Active: "bg-emerald-500/15 text-emerald-300", Inactive: "bg-gray-500/15 text-gray-400", Prospect: "bg-blue-500/15 text-blue-300" };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Companies</h1><p className="text-muted-foreground text-sm">
  {clients.length} client companies
</p> </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Company</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ?
      <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> :
      filtered.length === 0 ?
      <div className="text-center py-20 text-muted-foreground">No companies yet — add your first client</div> :

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) =>
        <div key={c.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.industry || "—"}</p>
                  </div>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColor[c.status])}>{c.status}</span>
              </div>
              {c.contact_person && <p className="text-sm text-muted-foreground">Contact: {c.contact_person}</p>}
              {c.contact_email && <p className="text-sm text-muted-foreground">{c.contact_email}</p>}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="gap-1"><Pencil className="h-3 w-3" /> Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteId(c.id)} className="gap-1 text-destructive"><Trash2 className="h-3 w-3" /> Delete</Button>
              </div>
            </div>
        )}
        </div>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Company" : "Add Company"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Company Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Active", "Inactive", "Prospect"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Delete Company</AlertDialogTitle><AlertDialogDescription>This will permanently remove this company.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}