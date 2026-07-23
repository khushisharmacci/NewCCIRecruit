import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, CalendarX, Clock, Calendar, Filter, Eye } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";
import InterviewForm from "@/components/interviews/InterviewForm";

const statusColors = {
  Scheduled: "bg-amber-500/15 text-amber-300",
  Completed: "bg-blue-500/15 text-blue-300",
  Cancelled: "bg-red-500/15 text-red-300",
  Rescheduled: "bg-purple-500/15 text-purple-300",
  Selected: "bg-emerald-500/15 text-emerald-300",
  Rejected: "bg-red-500/15 text-red-300",
  "On Hold": "bg-gray-500/15 text-gray-400",
};

const STATUS_FILTERS = ["All", "Scheduled", "Completed", "Cancelled", "Rescheduled", "On Hold"];
const DATE_FILTERS = ["All Time", "Today", "Tomorrow", "This Week"];

export default function Interviews() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [recruiterFilter, setRecruiterFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .order("interview_date", { ascending: false });

      if (error) throw error;

      return data || [];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["interviews"] });
    qc.invalidateQueries({ queryKey: ["candidate-interviews"] });
    qc.invalidateQueries({ queryKey: ["upcoming-interviews"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["sidebar-notifications"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: inserted, error } = await supabase
        .from("interviews")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return inserted;
    },
    onSuccess: () => {
      invalidateAll();
      setFormOpen(false);
      setEditing(null);
      toast({ title: "Interview scheduled successfully" });
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
    onSuccess: async (updated, { action }) => {
      invalidateAll();

      if (action) {
        await supabase.from("notifications").insert([
          {
            title: `Interview ${action}: ${updated.candidate_name}`,
            message: `Interview ${action} for ${updated.candidate_name}`,
            type: "Interview",
            read: false,
            link: "/interviews",
          },
        ]);
      }

      setFormOpen(false);
      setEditing(null);
      toast({ title: "Interview updated" });
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
      setDeleteTarget(null);
      toast({ title: "Interview deleted" });
    },
  });

  const handleSave = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      const firstName = user?.full_name?.trim().split(" ")[0] || user?.name?.trim().split(" ")[0] || "";
      createMutation.mutate({ ...data, created_by: firstName });
    }
  };

  const handleReschedule = (interview) => {
    setEditing(interview);
    setFormOpen(true);
  };
  const handleCancel = (interview) => {
    updateMutation.mutate({ id: interview.id, data: { status: "Cancelled" }, action: "cancelled" });
  };
  const handleComplete = (interview) => {
    updateMutation.mutate({ id: interview.id, data: { status: "Completed" }, action: "completed" });
  };

  const companies = Array.from(new Set(interviews.map(i => i.company_name).filter(Boolean)));
  const positions = Array.from(new Set(interviews.map(i => i.position_title).filter(Boolean)));
  const recruiters = Array.from(new Set(interviews.map(i => i.created_by).filter(Boolean)));

  const filtered = interviews.filter(i => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.candidate_name?.toLowerCase().includes(q) && !i.company_name?.toLowerCase().includes(q) && !i.position_title?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "All" && i.status !== statusFilter) return false;
    if (companyFilter !== "All" && i.company_name !== companyFilter) return false;
    if (positionFilter !== "All" && i.position_title !== positionFilter) return false;
    if (recruiterFilter !== "All" && i.created_by !== recruiterFilter) return false;
    if (dateFilter !== "All Time" && i.interview_date) {
      const d = parseISO(i.interview_date);
      if (dateFilter === "Today" && !isToday(d)) return false;
      if (dateFilter === "Tomorrow" && !isTomorrow(d)) return false;
      if (dateFilter === "This Week" && !isThisWeek(d)) return false;
    }
    return true;
  });

  const hasFilters = search || statusFilter !== "All" || dateFilter !== "All Time" || companyFilter !== "All" || positionFilter !== "All" || recruiterFilter !== "All";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interviews</h1>
          <p className="text-muted-foreground text-sm">Schedule and manage all candidate interviews</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Schedule Interview
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by candidate, company, position..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Position" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Positions</SelectItem>
              {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Recruiter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Recruiters</SelectItem>
              {recruiters.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              {DATE_FILTERS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>{filtered.length} interview{filtered.length !== 1 ? "s" : ""} found</span>
          {hasFilters && <button onClick={() => { setSearch(""); setStatusFilter("All"); setDateFilter("All Time"); setCompanyFilter("All"); setPositionFilter("All"); setRecruiterFilter("All"); }} className="text-primary hover:underline">Clear filters</button>}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-medium text-foreground">No interviews found</p>
          <p className="text-sm text-muted-foreground mt-1">Schedule your first interview to get started</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Schedule Interview</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3 font-medium">Sourced By</th>
                  <th className="px-4 py-3 font-medium">Spoken By</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(i => {
                  return (
                    <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                            {(i.candidate_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[120px]">{i.candidate_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[100px]">{i.company_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[100px]">{i.position_title || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.interview_date ? format(parseISO(i.interview_date), "MMM d, yyyy") : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusColors[i.status] || statusColors.Scheduled)}>{i.status}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[80px]">{i.created_by || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[80px]">{i.sourced_by || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[80px]">{i.spoken_by || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5 justify-end">
                          <button onClick={() => setPreviewTarget(i)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Preview Details"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { setEditing(i); setFormOpen(true); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          {i.status === "Scheduled" && (
                            <>
                              <button onClick={() => handleReschedule(i)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-purple-400" title="Reschedule"><Clock className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleCancel(i)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Cancel"><CalendarX className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleComplete(i)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-400" title="Mark Completed"><Calendar className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                          <button onClick={() => setDeleteTarget(i)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InterviewForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Preview Modal */}
      <Dialog open={!!previewTarget} onOpenChange={(v) => !v && setPreviewTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interview Details</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Candidate</span>
                <span className="font-semibold text-foreground">{previewTarget.candidate_name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Company</span>
                <span className="font-medium">{previewTarget.company_name || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Position</span>
                <span className="font-medium">{previewTarget.position_title || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Date & Time</span>
                <span>{previewTarget.interview_date ? format(parseISO(previewTarget.interview_date), "MMM d, yyyy") : "—"} {previewTarget.interview_time ? `at ${previewTarget.interview_time}` : ""}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Type</span>
                <span>{previewTarget.interview_type || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusColors[previewTarget.status])}>{previewTarget.status}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Created By</span>
                <span>{previewTarget.created_by || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Sourced By</span>
                <span>{previewTarget.sourced_by || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Spoken By</span>
                <span>{previewTarget.spoken_by || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Interviewer</span>
                <span>{previewTarget.interviewer || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Location / Link</span>
                <span>{previewTarget.location || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Notes</span>
                <div className="p-2.5 rounded-md bg-muted/40 text-xs text-foreground whitespace-pre-wrap">{previewTarget.notes || "No notes added"}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete the interview for {deleteTarget?.candidate_name}? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}