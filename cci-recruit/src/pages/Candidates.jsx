import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import CandidateDialog from "../components/CandidateDialog";

const statusColors = {
  "Applied": "bg-blue-500/15 text-blue-300",
  "Screening": "bg-indigo-500/15 text-indigo-300",
  "Shortlisted": "bg-violet-500/15 text-violet-300",
  "Interview Scheduled": "bg-amber-500/15 text-amber-300",
  "Selected": "bg-emerald-500/15 text-emerald-300",
  "Offer Released": "bg-green-500/15 text-green-300",
  "Joined": "bg-teal-500/15 text-teal-300",
  "Rejected": "bg-red-500/15 text-red-300",
  "On Hold": "bg-gray-500/15 text-gray-400"
};

export default function Candidates() {
  const queryClient = useQueryClient();
  const { tenantFilter, stampRecord, companyId } = useTenant();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fileFilter, setFileFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState([]);

  const { data: candidates = [], isLoading } = useQuery({
  queryKey: ["candidates", companyId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },
});

  const { data: files = [] } = useQuery({
  queryKey: ["candidate-files", companyId],
  queryFn: async () => {
  const { data, error } = await supabase
    .from("data_files")
    .select("*");


  if (error) throw error;

  return data || [];
},
});
  async function syncCandidateToSpreadsheet(candidate) {
    if (!candidate.data_file_id) return;

    const { data: file } = await supabase
      .from("data_files")
      .select("*")
      .eq("id", candidate.data_file_id)
      .single();

    if (!file) return;

    const rows =
      typeof file.rows_data === "string"
        ? JSON.parse(file.rows_data || "[]")
        : file.rows_data || [];

        const aliases = {
      full_name: ["Name", "Candidate Name", "Full Name"],
      email: ["Email", "Email ID", "Email Address"],
      phone: ["Phone", "Contact Number", "Mobile", "Mobile Number"],
      current_company: ["Company", "Current Company", "Current Org"],
      position: ["Position", "Position Title", "Job Title"],
      notes: ["Remarks", "Notes"],
      status: ["Status"],
      experience_years: [
        "Experience",
        "Experience (Yrs)",
        "Years of Experience",
      ],
      location: ["Location", "Position Location"],
      sourced_by: ["Sourced By", "Sourced_by", "Sourcedby"],
      current_ctc: ["Current Fixed CTC", "Current CTC", "Fixed CTC", "CTC"],
      expected_ctc: ["Expected CTC", "Expected Salary"],
      academics: ["Academics", "Education", "Qualification"],
      linkedin: ["LinkedIn", "LinkedIn Profile Link", "LinkedIn Link"],
      sent_on: ["Sent On", "Submission Date", "Date Sent"],
      hr: ["HR", "HR Name", "HR Recruiter"],
    };

    const emailCol = file.columns.find((col) =>
      aliases.email.some((alias) => alias.toLowerCase() === col.toLowerCase())
    );
    const phoneCol = file.columns.find((col) =>
      aliases.phone.some((alias) => alias.toLowerCase() === col.toLowerCase())
    );

    const rowIndex = rows.findIndex((row) => {
      if (row._candidate_id === candidate.id) return true;
      const emailMatch =
        candidate.email &&
        emailCol &&
        row[emailCol]?.toLowerCase() === candidate.email.toLowerCase();
      const phoneMatch =
        candidate.phone &&
        phoneCol &&
        String(row[phoneCol]) === String(candidate.phone);
      return emailMatch || phoneMatch;
    });

    const row = {};
        const values = {
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      current_company: candidate.current_company,
      position: candidate.position,
      notes: candidate.notes,
      status: candidate.status,
      experience_years: candidate.experience_years,
      location: candidate.location,
      candidate_date: candidate.candidate_date,
      sourced_by: candidate.sourced_by,
      current_ctc: candidate.current_ctc,
      expected_ctc: candidate.expected_ctc,
      academics: candidate.academics,
      linkedin: candidate.linkedin,
      sent_on: candidate.sent_on,
      hr: candidate.hr,
    };

    file.columns.forEach((column) => {
  for (const [field, names] of Object.entries(aliases)) {
    if (
      names.some(
        (name) =>
          name.toLowerCase() === column.toLowerCase()
      )
    ) {
      if (field) {
        row[column] = values[field] ?? row[column];
      }

      break;
    }
  }
});

    row._candidate_id = candidate.id;
    row.spreadsheet_id = candidate.data_file_id;

    if (rowIndex >= 0) {
      rows[rowIndex] = {
        ...rows[rowIndex],
        ...row,
      };
    } else {
      rows.push({
        __id: crypto.randomUUID(),
        _row_id: crypto.randomUUID(),
        _candidate_id: candidate.id,
        spreadsheet_id: candidate.data_file_id,
        ...row,
      });
    }

    const { error } = await supabase
      .from("data_files")
      .update({
        rows_data: rows,
      })
      .eq("id", file.id);

    if (error) throw error;
  }

  async function removeCandidateFromSpreadsheet(candidateId, fileId) {
    if (!fileId) return;

    const { data: file } = await supabase
      .from("data_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (!file) return;

    const rows =
      typeof file.rows_data === "string"
        ? JSON.parse(file.rows_data || "[]")
        : file.rows_data || [];

    const updatedRows = rows.filter((row) => row._candidate_id !== candidateId);

    const { error } = await supabase
      .from("data_files")
      .update({
        rows_data: updatedRows,
      })
      .eq("id", file.id);

    if (error) throw error;
  }

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: inserted, error } = await supabase
        .from("candidates")
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      if (inserted.data_file_id) {
        await syncCandidateToSpreadsheet(inserted);
      }

      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
      queryClient.invalidateQueries({
        queryKey: ["spreadsheet"],
      });
      queryClient.invalidateQueries({
        queryKey: ["candidate-files"],
      });
      setDeleteId(null);
      setDialogOpen(false);
    },
    onError: (error) => {
      console.error("CREATE ERROR:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // 1. Fetch current candidate to inspect the old data_file_id
      const { data: currentCandidate } = await supabase
        .from("candidates")
        .select("data_file_id")
        .eq("id", id)
        .single();

      // 2. Update candidate record
      const { data: updated, error } = await supabase
        .from("candidates")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const oldFileId = currentCandidate?.data_file_id;
      const newFileId = updated.data_file_id;

      // 3. If the file ID changed, remove candidate from old spreadsheet
      if (oldFileId && oldFileId !== newFileId) {
        await removeCandidateFromSpreadsheet(id, oldFileId);
      }

      // 4. Sync candidate to the new spreadsheet
      if (newFileId) {
        await syncCandidateToSpreadsheet(updated);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
      queryClient.invalidateQueries({
        queryKey: ["spreadsheet"],
      });
      setDialogOpen(false);
      setEditCandidate(null);
    },
  });

    const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const candidate = candidates.find(c => c.id === id);
      if (candidate?.data_file_id) {
        // Fetch spreadsheet data to update rows_data
        const { data: file } = await supabase
          .from("data_files")
          .select("rows_data")
          .eq("id", candidate.data_file_id)
          .single();

        if (file?.rows_data) {
          const updatedRows = file.rows_data.filter(
            (r) => r._candidate_id !== candidate.id
          );

          await supabase
            .from("data_files")
            .update({
              rows_data: updatedRows,
            })
            .eq("id", candidate.data_file_id);
        }
      }

      // Delete linked records first to prevent foreign key errors
      await supabase
        .from("client_submissions")
        .delete()
        .eq("candidate_id", id);

      await supabase
        .from("interviews")
        .delete()
        .eq("candidate_id", id);

      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["spreadsheet"] });
      setDeleteId(null);
    }
  });
useEffect(() => {
  setSelectedCandidates([]);
}, [search, statusFilter, fileFilter]);

const filtered = candidates.filter((c) => {
  // Ignore and hide any empty/placeholder rows
  if (!c.full_name || c.full_name.startsWith("noemail_")) {
    return false;
  }

  const matchSearch =
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.linkedin?.toLowerCase().includes(search.toLowerCase());

  const matchStatus =
    statusFilter === "all" ||
    c.status === statusFilter;

  const matchFile =
    fileFilter === "all" ||
    c.data_file_id === fileFilter;

  return matchSearch && matchStatus && matchFile;
});

    const handleDeleteSelected = async () => {
  if (
    !window.confirm(
      `Delete ${selectedCandidates.length} candidate(s)?`
    )
  ) return;

  // Filter spreadsheet rows for all selected candidates
  for (const candidateId of selectedCandidates) {
    const candidate = candidates.find(c => c.id === candidateId);
    if (candidate?.data_file_id) {
      const { data: file } = await supabase
        .from("data_files")
        .select("rows_data")
        .eq("id", candidate.data_file_id)
        .single();

      if (file?.rows_data) {
        const updatedRows = file.rows_data.filter(
          (r) => r._candidate_id !== candidateId
        );

        await supabase
          .from("data_files")
          .update({
            rows_data: updatedRows,
          })
          .eq("id", candidate.data_file_id);
      }
    }
  }

  // Delete linked records first to prevent foreign key errors
  await supabase
    .from("client_submissions")
    .delete()
    .in("candidate_id", selectedCandidates);

  await supabase
    .from("interviews")
    .delete()
    .in("candidate_id", selectedCandidates);

  const { error } = await supabase
    .from("candidates")
    .delete()
    .in("id", selectedCandidates);

  if (error) {
    alert(error.message);
    return;
  }

  setSelectedCandidates([]);

  queryClient.invalidateQueries({
    queryKey: ["candidates"],
  });
  queryClient.invalidateQueries({
    queryKey: ["spreadsheet"],
  });
};

const handleSave = async (data) => {
  const stamped = stampRecord(data);
  if (editCandidate) {
    return await updateMutation.mutateAsync({
      id: editCandidate.id,
      data: stamped,
    });
  }

  console.log("DATA BEING SAVED:", stamped);

  return await createMutation.mutateAsync(stamped);
};

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

  {selectedCandidates.length > 0 && (
    <Button
      variant="destructive"
      onClick={handleDeleteSelected}
    >
      Delete Selected ({selectedCandidates.length})
    </Button>
  )}

  <Button
    onClick={() => {
      setEditCandidate(null);
      setDialogOpen(true);
    }}
    className="gap-2"
  >
    <Plus className="h-4 w-4" />
    Add Candidate
  </Button>

</div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email or LinkedIn..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
        <Select
  value={fileFilter}
  onValueChange={setFileFilter}
>
  <SelectTrigger className="w-72">
    <SelectValue placeholder="All Files" />
  </SelectTrigger>

  <SelectContent>
    <SelectItem value="all">
      All Files
    </SelectItem>

    {files.map((file) => (
      <SelectItem
        key={file.id}
        value={file.id}
      >
        {file.original_filename}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(statusColors).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ?
      <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> :
      filtered.length === 0 ?
      <div className="text-center py-20">
          <p className="text-muted-foreground">No candidates found — start building your talent pipeline</p>
        </div> :

      <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
  <tr className="border-b border-border bg-muted/50">

    <th className="w-12 px-4 py-3">
      <input
        type="checkbox"
        checked={
          filtered.length > 0 &&
          selectedCandidates.length === filtered.length
        }
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedCandidates(filtered.map(c => c.id));
          } else {
            setSelectedCandidates([]);
          }
        }}
      />
    </th>

    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Name
    </th>

    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
      Role
    </th>

    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
       Sourced By
     </th>

    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Status
    </th>

    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
      Source
    </th>

    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Actions
    </th>

  </tr>
</thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) =>
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">

               <td className="px-4 py-3">
  <input
    type="checkbox"
    checked={selectedCandidates.includes(c.id)}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedCandidates(prev => [...prev, c.id]);
      } else {
        setSelectedCandidates(prev =>
          prev.filter(id => id !== c.id)
        );
      }
    }}
  />
</td>

                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-foreground">{c.current_job_role || c.position || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.current_company || ""}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-foreground">{c.sourced_by || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", statusColors[c.status])}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-muted-foreground">{c.source || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/candidates/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setEditCandidate(c);setDialogOpen(true);}}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
    <Trash2 className="h-4 w-4" />
</Button>
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      }

      <CandidateDialog
    open={dialogOpen}
    onOpenChange={setDialogOpen}
    candidate={editCandidate}
    onSave={handleSave}
    files={files}
    isLoading={createMutation.isPending || updateMutation.isPending}
/>
      

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently remove this candidate from your pipeline.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}