import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Building2, Plus, Network } from "lucide-react";
import PositionNode from "@/components/positions/PositionNode";

export default function Positions() {
  const qc = useQueryClient();
  const [companySearch, setCompanySearch] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [rootDialogOpen, setRootDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [rootForm, setRootForm] = useState({ title: "", department: "", assigned_recruiter: "", description: "" });

  const { data: clients = [] } = useQuery({
  queryKey: ["clients"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) throw error;

    return data || [];
  },
});
  const filteredClients = companySearch.trim()
    ? clients.filter(c => (c.name || "").toLowerCase().includes(companySearch.toLowerCase())).slice(0, 8)
    : clients.slice(0, 8);

  const { data: positions = [], isLoading } = useQuery({
  queryKey: ["positions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("created_at");

    if (error) throw error;

    return data || [];
  },
});

  const createMutation = useMutation({
  mutationFn: async (data) => {
    console.log(
  JSON.stringify(data, null, 2)
);

    const { error } = await supabase
      .from("positions")
      .insert([data]);

    if (error) {
      console.error("POSITION INSERT ERROR", error);
      throw error;
    }
  },

  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["positions"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  },
});
  const updateMutation = useMutation({
  mutationFn: async ({ id, data }) => {
    const { error } = await supabase
      .from("positions")
      .update(data)
      .eq("id", id);

    if (error) throw error;
  },

  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["positions"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  },
});

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
  const { error } = await supabase
    .from("positions")
    .delete()
    .eq("id", id);

  if (error) throw error;
},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["positions"] }),
  });

  const rootNodes = useMemo(() => positions.filter(p => !p.parent_id), [positions]);
  const displayedClients = companySearch.trim()
  ? clients.filter((c) =>
      c.name.toLowerCase().includes(companySearch.toLowerCase())
    )
  : clients;

const positionsByCompany = useMemo(() => {
  return displayedClients.map((client) => ({
    client,
    positions: positions.filter(
      (p) => p.company_id === client.id
    ),
  }));
}, [displayedClients, positions]);

  const handleAdd = (data) => {
  createMutation.mutate({
    ...data,
    company_id: selectedClient.id,
  });
};
  const handleEdit = (id, data) => updateMutation.mutate({ id, data });
  const handleDelete = (id) => { deleteMutation.mutate(id); setDeleteId(null); };
  const handleArchive = (id) => updateMutation.mutate({ id, data: { status: "Archived" } });
  const handleReopen = (id) => updateMutation.mutate({ id, data: { status: "Open" } });

  const handleAddRoot = () => {
  if (!rootForm.title.trim() || !selectedClient) return;

  createMutation.mutate({
  title: rootForm.title.trim(),
  department: rootForm.department.trim(),
  assigned_recruiter: rootForm.assigned_recruiter.trim(),
  description: rootForm.description.trim(),
  company_id: selectedClient.id,
});

  setRootDialogOpen(false);

  setRootForm({
    title: "",
    department: "",
    assigned_recruiter: "",
    description: "",
  });
};

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Positions</h1>
          <p className="text-muted-foreground text-sm">Manage position hierarchies for each company</p>
        </div>
        {selectedClient && (
          <Button onClick={() => setRootDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Root Position
          </Button>
        )}
      </div>

      {/* Company Search */}
      <div className="bg-card rounded-xl border border-border p-4">
        <Label className="mb-2 block">Search Company</Label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Type company name..."
            value={selectedClient ? selectedClient.name : companySearch}
            onChange={(e) => { setCompanySearch(e.target.value); setSelectedClient(null); setCompanyOpen(true); setHighlight(-1); }}
            onFocus={() => { if (!selectedClient) setCompanyOpen(true); }}
          />
          {companyOpen && !selectedClient && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">No companies found</div>
              ) : (
                filteredClients.map((c, idx) => (
                  <button
                    key={c.id}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => { setSelectedClient(c); setCompanyOpen(false); setCompanySearch(""); }}
                    className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${highlight === idx ? "bg-accent" : "hover:bg-muted/50"}`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      {c.industry && <p className="text-xs text-muted-foreground">{c.industry}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6">
  {positionsByCompany.map(({ client, positions: companyPositions }) => {
    const roots = companyPositions.filter((p) => !p.parent_id);

    return (
      <div
        key={client.id}
        className="bg-card rounded-xl border border-border p-4"
      >
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{client.name}</h3>

            <span className="text-sm text-muted-foreground">
              • {companyPositions.length} Position
              {companyPositions.length !== 1 ? "s" : ""}
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setSelectedClient(client);
              setRootDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Position
          </Button>
        </div>

        {roots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No positions yet.
          </p>
        ) : (
          roots.map((node) => (
            <PositionNode
              key={node.id}
              node={node}
              children={companyPositions}
              allNodes={companyPositions}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              onArchive={handleArchive}
              onReopen={handleReopen}
              depth={0}
            />
          ))
        )}
      </div>
    );
  })}
</div>

      {/* Add Root Dialog */}
      <Dialog open={rootDialogOpen} onOpenChange={setRootDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Root Position — {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Position Name *</Label>
              <Input value={rootForm.title} onChange={(e) => setRootForm({ ...rootForm, title: e.target.value })} placeholder="e.g. CEO" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Input value={rootForm.department} onChange={(e) => setRootForm({ ...rootForm, department: e.target.value })} />
              </div>
             </div> 
            <div className="grid grid-cols-2 gap-3">
            
            </div>
            <div>
              <Label>Assigned Recruiter</Label>
              <Input value={rootForm.assigned_recruiter} onChange={(e) => setRootForm({ ...rootForm, assigned_recruiter: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={rootForm.description} onChange={(e) => setRootForm({ ...rootForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRootDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRoot} disabled={!rootForm.title.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this position and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}