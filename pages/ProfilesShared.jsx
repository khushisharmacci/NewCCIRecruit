import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Send, Filter, Building2, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import ProfileSharedForm from "@/components/profiles/ProfileSharedForm";

export default function ProfilesShared() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [recruiterFilter, setRecruiterFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles-shared"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_shared")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["profiles-shared"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data: inserted, error } = await supabase
        .from("profiles_shared")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: () => {
      invalidateAll();
      setFormOpen(false);
      setEditing(null);
      toast({ title: "Profile shared entry saved successfully" });
    },
    onError: (err) => {
      toast({
        title: "Error saving entry",
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from("profiles_shared")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      invalidateAll();
      setFormOpen(false);
      setEditing(null);
      toast({ title: "Profile entry updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("profiles_shared").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      toast({ title: "Entry deleted" });
    },
  });

  const handleSave = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const companies = Array.from(new Set(profiles.map((p) => p.organisation_name).filter(Boolean)));
  const recruiters = Array.from(new Set(profiles.map((p) => p.sourced_by).filter(Boolean)));

  const filtered = profiles.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        p.candidate_name?.toLowerCase().includes(q) ||
        p.current_org?.toLowerCase().includes(q) ||
        p.organisation_name?.toLowerCase().includes(q) ||
        p.position_title?.toLowerCase().includes(q) ||
        p.email_id?.toLowerCase().includes(q) ||
        p.contact_number?.includes(q);
      if (!match) return false;
    }
    if (companyFilter !== "All" && p.organisation_name !== companyFilter) return false;
    if (recruiterFilter !== "All" && p.sourced_by !== recruiterFilter) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profiles Shared</h1>
          <p className="text-muted-foreground text-sm">Track candidate profiles shared with client organizations</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Share Profile
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search candidate, org, position, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Organisations</SelectItem>
              {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Sourced By" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Recruiters</SelectItem>
              {recruiters.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>{filtered.length} profile{filtered.length !== 1 ? "s" : ""} found</span>
          {(search || companyFilter !== "All" || recruiterFilter !== "All") && (
            <button
              onClick={() => { setSearch(""); setCompanyFilter("All"); setRecruiterFilter("All"); }}
              className="text-primary hover:underline ml-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Send className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-medium text-foreground">No profiles shared yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click below to add your first shared profile entry</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Share Profile
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <tr className="text-left">
                  <th className="px-4 py-3">Candidate & Contact</th>
                  <th className="px-4 py-3">Current Org</th>
                  <th className="px-4 py-3">Academics</th>
                  <th className="px-4 py-3">Target Organisation</th>
                  <th className="px-4 py-3">Position & Location</th>
                  <th className="px-4 py-3">Sent On</th>
                  <th className="px-4 py-3">Sourced / Spoken</th>
                  <th className="px-4 py-3">HR Contact</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    {/* Candidate & Contact */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground text-sm">{p.candidate_name}</p>
                      {/* Phone Number - Larger text-sm font */}
                      {p.contact_number && (
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">{p.contact_number}</p>
                      )}
                      {/* Email ID - Larger text-sm font */}
                      {p.email_id && (
                        <p className="text-sm text-muted-foreground">{p.email_id}</p>
                      )}
                    </td>

                    {/* Current Org */}
                    <td className="px-4 py-3 text-foreground font-medium">{p.current_org || "—"}</td>

                    {/* Academics - Larger text-sm font */}
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{p.academics || "—"}</td>

                    {/* Target Organisation */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{p.organisation_name}</span>
                      </div>
                    </td>

                    {/* Position & Location */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.position_title}</p>
                      {/* Location - Larger text-sm font */}
                      {p.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" /> {p.location}
                        </p>
                      )}
                    </td>

                    {/* Sent On */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {p.sent_on ? format(parseISO(p.sent_on), "dd-MM-yyyy") : "—"}
                    </td>

                    {/* Sourced / Spoken */}
                    <td className="px-4 py-3 text-xs space-y-0.5">
                      <p className="text-foreground"><span className="text-muted-foreground font-medium">Src:</span> {p.sourced_by || "—"}</p>
                      <p className="text-foreground"><span className="text-muted-foreground font-medium">Spk:</span> {p.spoken_by || "—"}</p>
                    </td>

                    {/* HR Contact */}
                    <td className="px-4 py-3 text-muted-foreground font-medium">{p.hr_contact || "—"}</td>

                    {/* Remarks */}
                    <td className="px-4 py-3">
                      {p.remarks ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          {p.remarks}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(p); setFormOpen(true); }}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <ProfileSharedForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        editing={editing}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the shared profile entry for {deleteTarget?.candidate_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}