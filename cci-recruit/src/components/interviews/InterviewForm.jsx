import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CandidateSearch from "./CandidateSearch";
import CompanySearch from "./CompanySearch";

export default function InterviewForm({
  open,
  onOpenChange,
  editing,
  onSave,
  isLoading,
}) {
  const [candidate, setCandidate] = useState(null);
  const [company, setCompany] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    position_title: "",
    interview_date: "",
    interview_time: "",
    interview_type: "Online",
    location: "",
    notes: "",
    status: "Scheduled",
    interviewer: "",
    sourced_by: "",
    spoken_by: "",
  });

  useEffect(() => {
    if (editing) {
      setCandidate({
        id: editing.candidate_id,
        full_name: editing.candidate_name,
        email: editing.email || "",
        phone: editing.phone || "",
        current_company: editing.company_name,
        position_title: editing.position_title,
        company_id: editing.company_id || "",
      });
      setCompany(
        editing.company_id
          ? {
              id: editing.company_id,
              name: editing.company_name || "",
              industry: editing.industry || "",
            }
          : null
      );
      setForm({
        position_title: editing.position_title || "",
        interview_date: editing.interview_date ? editing.interview_date.split("T")[0] : "",
        interview_time: editing.interview_time || "",
        interview_type: editing.interview_type || "Online",
        location: editing.location || "",
        notes: editing.notes || editing.feedback || "",
        status: editing.status || "Scheduled",
        interviewer: editing.interviewer || "",
        sourced_by: editing.sourced_by || "",
        spoken_by: editing.spoken_by || "",
      });
    } else {
      setCandidate(null);
      setCompany(null);
      setForm({
        position_title: "",
        interview_date: "",
        interview_time: "",
        interview_type: "Online",
        location: "",
        notes: "",
        status: "Scheduled",
        interviewer: "",
        sourced_by: "",
        spoken_by: "",
      });
    }
    setErrors({});
  }, [editing, open]);

  // Auto-populate from selected candidate
  useEffect(() => {
    if (candidate) {
      setForm((f) => ({
        ...f,
        position_title: candidate.position_title || f.position_title,
        sourced_by: candidate.sourced_by || f.sourced_by,
        spoken_by: candidate.spoken_by || f.spoken_by,
      }));
      if (candidate.current_company && !company) {
        setCompany({
          id: candidate.company_id || "",
          name: candidate.current_company,
          industry: candidate.industry || "",
        });
      }
    }
  }, [candidate, company]);

  const STATUSES = [
    "Scheduled",
    "Completed",
    "Selected",
    "Rejected",
    "Cancelled",
    "Rescheduled",
    "On Hold",
  ];

  const handleSubmit = () => {
    const errs = {};
    if (!candidate) errs.candidate = "Please select a candidate";
    if (!company) errs.company = "Please select a company";
    if (!form.position_title.trim()) errs.position = "Position is required";
    if (!form.interview_date) errs.date = "Date is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSave({
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      company_id: company.id,
      company_name: company.name,
      sourced_by: form.sourced_by.trim(),
      spoken_by: form.spoken_by.trim(),

      position_title: form.position_title.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      interviewer: form.interviewer.trim(),

      interview_date: form.interview_date,
      interview_time: form.interview_time,
      interview_type: form.interview_type,
      status: form.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Interview" : "Schedule Interview"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Candidate *</Label>
            <CandidateSearch value={candidate} onSelect={setCandidate} error={errors.candidate} />
            {errors.candidate && <p className="text-xs text-red-400 mt-1">{errors.candidate}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Company *</Label>
            <CompanySearch value={company} onSelect={setCompany} error={errors.company} />
            {errors.company && <p className="text-xs text-red-400 mt-1">{errors.company}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Position *</Label>
            <Input
              required
              value={form.position_title}
              onChange={(e) => setForm({ ...form, position_title: e.target.value })}
              placeholder="Position title"
              className={errors.position ? "border-red-500" : ""}
            />
            {errors.position && <p className="text-xs text-red-400 mt-1">{errors.position}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Interview Date *</Label>
              <Input
                type="date"
                required
                value={form.interview_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interview_date: e.target.value,
                  })
                }
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
            </div>
            <div>
              <Label>Interview Time</Label>
              <Input type="time" value={form.interview_time} onChange={(e) => setForm({ ...form, interview_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Interview Type</Label>
              <Select
                value={form.interview_type}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    interview_type: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Telephonic">Telephonic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sourced By</Label>
              <Input
                value={form.sourced_by}
                onChange={(e) => setForm({ ...form, sourced_by: e.target.value })}
                placeholder="Recruiter name"
              />
            </div>
            <div>
              <Label>Spoken By</Label>
              <Input
                value={form.spoken_by}
                onChange={(e) => setForm({ ...form, spoken_by: e.target.value })}
                placeholder="Recruiter name"
              />
            </div>
          </div>
          <div>
            <Label>Meeting Link / Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Zoom link or office address" />
          </div>
          <div>
            <Label>Interviewer</Label>
            <Input value={form.interviewer} onChange={(e) => setForm({ ...form, interviewer: e.target.value })} placeholder="Interviewer name" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Interview notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : editing ? "Update" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}