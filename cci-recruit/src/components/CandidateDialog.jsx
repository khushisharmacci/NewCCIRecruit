import { findCandidateDuplicate } from "@/lib/duplicateDetection/supabaseQueries";
import { useState, useEffect } from "react";
import DuplicateConfirmDialog from "@/components/duplicate/DuplicateConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useDuplicateCheck from "@/hooks/useDuplicateCheck";
import DuplicateWarningCard from "@/components/duplicate/DuplicateWarningCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

const statuses = ["Applied", "Screening", "Shortlisted", "Interview Scheduled", "Selected", "Offer Released", "Joined", "Rejected", "On Hold"];
const sources = ["LinkedIn", "Job Board", "Referral", "Direct", "Agency", "Other"];

export default function CandidateDialog({
  open,
  onOpenChange,
  candidate,
  onSave,
  isLoading,
  files = []
}) {
  const [form, setForm] = useState({
  full_name: "",
  email: "",
  phone: "",
  location: "",
  geographical_location: "",

  current_company: "",
  current_job_role: "",

  experience_years: "",

  current_ctc: "",
  expected_ctc: "",

  position: "",
  data_file_id: "",

  academics: "",

  source: "LinkedIn",
  sourced_by: "",
  spoken_by: "",

  candidate_date: "",

  linkedin: "",

  status: "Applied",

  notes: ""
});
const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
const [pendingSave, setPendingSave] = useState(null);
const duplicate = useDuplicateCheck(
  "candidates",
  form,
  candidate?.id
);
  useEffect(() => {
    if (candidate) {
      setForm({
  full_name: candidate.full_name || "",
  email: candidate.email || "",
  phone: candidate.phone || "",

  location: candidate.location || "",
  geographical_location: candidate.geographical_location || "",

  current_company: candidate.current_company || "",
  current_job_role: candidate.current_job_role || "",

  experience_years: candidate.experience_years || "",

  current_ctc: candidate.current_ctc || "",
  expected_ctc: candidate.expected_ctc || "",

  position: candidate.position || "",
  data_file_id: candidate.data_file_id || "",
  academics: candidate.academics || "",

  source: candidate.source || "LinkedIn",
  sourced_by: candidate.sourced_by || "",
  spoken_by: candidate.spoken_by || "",

  candidate_date: candidate.candidate_date || "",

  linkedin: candidate.linkedin || "",

  status: candidate.status || "Applied",

  notes: candidate.notes || ""
});
    } else {
      setForm({
  full_name: "",
  email: "",
  phone: "",

  location: "",
  geographical_location: "",

  current_company: "",
  current_job_role: "",

  experience_years: "",

  current_ctc: "",
  expected_ctc: "",

  position: "",
  data_file_id: "",
  academics: "",

  source: "LinkedIn",
  sourced_by: "",
  spoken_by: "",

  candidate_date: "",

  linkedin: "",

  status: "Applied",

  notes: ""
});
    }
  }, [candidate, open]);
  const saveCandidate = async () => {
  const savedCandidate = await onSave({
    ...form,

    candidate_date: form.candidate_date || null,

    experience_years: form.experience_years
      ? Number(form.experience_years)
      : null,

    current_ctc: form.current_ctc
      ? Number(form.current_ctc)
      : null,

    expected_ctc: form.expected_ctc
      ? Number(form.expected_ctc)
      : null,

    phone: form.phone || null,
    linkedin: form.linkedin || null,
    location: form.location || null,
    geographical_location: form.geographical_location || null,
    current_company: form.current_company || null,
    current_job_role: form.current_job_role || null,
    sourced_by: form.sourced_by || null,
    spoken_by: form.spoken_by || null,
    notes: form.notes || null,
    academics: form.academics || null,
    position: form.position || null,
    data_file_id: form.data_file_id || null,
  });

  return savedCandidate;
};

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const duplicate = await findCandidateDuplicate(
      form,
      candidate?.id
    );

    if (duplicate.exactMatch) {
      setPendingSave(duplicate.exactMatch);
      setShowDuplicateDialog(true);
      return;
    }

    await saveCandidate();
    onOpenChange(false);

  } catch (err) {
    console.error(err);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{candidate ? "Edit Candidate" : "Add Candidate"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {duplicate.exactMatch && (
  <DuplicateWarningCard
    type="exact"
    candidate={duplicate.exactMatch}
  />
)}

{!duplicate.exactMatch &&
  duplicate.possibleMatches.length > 0 && (
    <DuplicateWarningCard
      type="possible"
      candidate={duplicate.possibleMatches[0]}
    />
)}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
  <Label>Geographical Location</Label>
  <Input
    value={form.geographical_location}
    onChange={(e) =>
      setForm({
        ...form,
        geographical_location: e.target.value,
      })
    }
  />
</div>
            <div>
              <Label>Current Company</Label>
              <Input value={form.current_company} onChange={(e) => setForm({ ...form, current_company: e.target.value })} />
            </div>
            <div>
              <Label>Current Role</Label>
              <Input value={form.current_job_role} onChange={(e) => setForm({ ...form, current_job_role: e.target.value })} />
            </div>
            <div>
              <Label>Experience (Years)</Label>
              <Input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
            </div>
            <div>
  <Label>Current CTC</Label>
  <Input
    type="number"
    value={form.current_ctc}
    onChange={(e) =>
      setForm({ ...form, current_ctc: e.target.value })
    }
  />
</div>

<div>
  <Label>Expected CTC</Label>
  <Input
    type="number"
    value={form.expected_ctc}
    onChange={(e) =>
      setForm({ ...form, expected_ctc: e.target.value })
    }
  />
</div>
            <div>
  <Label>Position</Label>
  <Input
    value={form.position}
    onChange={(e) =>
      setForm({
        ...form,
        position: e.target.value,
      })
    }
  />
</div>

<div>
  <Label>Spreadsheet *</Label>

  <Select
    value={form.data_file_id}
    onValueChange={(v) =>
      setForm({
        ...form,
        data_file_id: v,
      })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder="Select spreadsheet" />
    </SelectTrigger>

    <SelectContent>
      {files.map((f) => (
        <SelectItem key={f.id} value={f.id}>
          {f.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div>
  <Label>Academics</Label>
  <Input
    value={form.academics}
    onChange={(e) =>
      setForm({
        ...form,
        academics: e.target.value,
      })
    }
  />
</div>
            <div>
  <Label>Source</Label>

  <Select
    value={form.source}
    onValueChange={(v) =>
      setForm({
        ...form,
        source: v,
      })
    }
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>

    <SelectContent>
      {sources.map((s) => (
        <SelectItem key={s} value={s}>
          {s}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div>
  <Label>Date</Label>

  <Input
    type="date"
    value={form.candidate_date}
    onChange={(e) =>
      setForm({
        ...form,
        candidate_date: e.target.value,
      })
    }
  />
</div>

<div>
  <Label>Sourced By</Label>

  <Input
    value={form.sourced_by}
    onChange={(e) =>
      setForm({
        ...form,
        sourced_by: e.target.value,
      })
    }
  />
</div>

<div>
  <Label>Spoken By</Label>

  <Input
    value={form.spoken_by}
    onChange={(e) =>
      setForm({
        ...form,
        spoken_by: e.target.value,
      })
    }
  />
</div>
        </div>

          <div>
  <Label>LinkedIn</Label>

  <Input
    placeholder="https://linkedin.com/in/..."
    value={form.linkedin}
    onChange={(e) =>
      setForm({
        ...form,
        linkedin: e.target.value,
      })
    }
  />
</div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Candidate"}</Button>
          </div>
        </form>
      </DialogContent>
      <DuplicateConfirmDialog
  open={showDuplicateDialog}
  onOpenChange={setShowDuplicateDialog}
  candidate={pendingSave}
  onSaveAnyway={async () => {
    setShowDuplicateDialog(false);

    const savedCandidate = await saveCandidate();

    if (savedCandidate) {
        await syncCandidateToSpreadsheet(savedCandidate);
    }
}}
/>
    </Dialog>);
}