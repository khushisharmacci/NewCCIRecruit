import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CandidateSearch from "@/components/interviews/CandidateSearch";
import CompanySearch from "@/components/interviews/CompanySearch";

export default function ProfileSharedForm({
  open,
  onOpenChange,
  editing,
  onSave,
  isLoading,
}) {
  const [candidate, setCandidate] = useState(null);
  const [company, setCompany] = useState(null);
  const [prevCandidateId, setPrevCandidateId] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    candidate_name: "",
    current_org: "",
    contact_number: "",
    email_id: "",
    academics: "",
    organisation_name: "",
    position_title: "",
    location: "",
    sent_on: new Date().toISOString().split("T")[0],
    sourced_by: "",
    spoken_by: "",
    hr_contact: "",
    remarks: "",
    status: "Shared",
  });

  // Fetch positions for selected company
  const { data: companyPositions = [] } = useQuery({
    queryKey: ["positions", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("positions")
        .select("title")
        .eq("company_id", company.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!company?.id,
  });

  useEffect(() => {
    if (editing) {
      setCandidate(
        editing.candidate_id
          ? {
              id: editing.candidate_id,
              full_name: editing.candidate_name,
              email: editing.email_id || "",
              phone: editing.contact_number || "",
            }
          : null
      );
      setPrevCandidateId(editing.candidate_id || null);
      setCompany(
        editing.company_id || editing.organisation_name
          ? {
              id: editing.company_id || null,
              name: editing.organisation_name || "",
            }
          : null
      );
      setForm({
        candidate_name: editing.candidate_name || "",
        current_org: editing.current_org || "",
        contact_number: editing.contact_number || "",
        email_id: editing.email_id || "",
        academics: editing.academics || "",
        organisation_name: editing.organisation_name || "",
        position_title: editing.position_title || "",
        location: editing.location || "",
        sent_on: editing.sent_on ? editing.sent_on.split("T")[0] : new Date().toISOString().split("T")[0],
        sourced_by: editing.sourced_by || "",
        spoken_by: editing.spoken_by || "",
        hr_contact: editing.hr_contact || "",
        remarks: editing.remarks || "",
        status: editing.status || "Shared",
      });
    } else {
      setCandidate(null);
      setPrevCandidateId(null);
      setCompany(null);
      setForm({
        candidate_name: "",
        current_org: "",
        contact_number: "",
        email_id: "",
        academics: "",
        organisation_name: "",
        position_title: "",
        location: "",
        sent_on: new Date().toISOString().split("T")[0],
        sourced_by: "",
        spoken_by: "",
        hr_contact: "",
        remarks: "",
        status: "Shared",
      });
    }
    setErrors({});
  }, [editing, open]);

  // Auto-fill from candidate search
  useEffect(() => {
    if (candidate && candidate.id !== prevCandidateId) {
      setPrevCandidateId(candidate.id);
      setForm((f) => ({
        ...f,
        candidate_name: candidate.full_name || f.candidate_name,
        contact_number: candidate.phone || f.contact_number,
        email_id: candidate.email || f.email_id,
        current_org: candidate.current_company || candidate.current_org || f.current_org,
        academics: candidate.academics || candidate.qualification || f.academics,
        sourced_by: candidate.sourced_by || f.sourced_by,
        spoken_by: candidate.spoken_by || f.spoken_by,
      }));
    }
  }, [candidate, prevCandidateId]);

  // Sync company selection
  useEffect(() => {
    if (company) {
      setForm((f) => ({
        ...f,
        organisation_name: company.name || f.organisation_name,
      }));
    }
  }, [company]);

  const STATUSES = ["Shared", "Shortlisted for Interview", "Interview Scheduled", "In Review", "Rejected", "On Hold"];

  const handleSubmit = () => {
    const errs = {};
    if (!form.candidate_name.trim()) errs.candidate_name = "Candidate Name is required";
    if (!form.organisation_name.trim()) errs.organisation_name = "Target Organisation is required";
    if (!form.position_title.trim()) errs.position_title = "Position Title is required";
    if (!form.sent_on) errs.sent_on = "Date is required";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSave({
      candidate_id: candidate?.id && candidate.id !== "" ? candidate.id : null,
      candidate_name: form.candidate_name.trim(),
      current_org: form.current_org.trim() || null,
      contact_number: form.contact_number.trim() || null,
      email_id: form.email_id.trim() || null,
      academics: form.academics.trim() || null,
      company_id: company?.id && company.id !== "" ? company.id : null,
      organisation_name: form.organisation_name.trim(),
      position_title: form.position_title.trim(),
      location: form.location.trim() || null,
      sent_on: form.sent_on,
      sourced_by: form.sourced_by.trim() || null,
      spoken_by: form.spoken_by.trim() || null,
      hr_contact: form.hr_contact.trim() || null,
      remarks: form.remarks.trim() || null,
      status: form.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-xl font-bold">
            {editing ? "Edit Shared Profile Entry" : "Share Candidate Profile"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* SECTION 1: Candidate Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              1. Candidate Details
            </h3>

            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Quick Search Candidate (Auto-fills form)</Label>
              <CandidateSearch value={candidate} onSelect={setCandidate} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Candidate Name *</Label>
                <Input
                  value={form.candidate_name}
                  onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
                  placeholder="e.g. Arijit Nayak"
                  className={errors.candidate_name ? "border-red-500" : ""}
                />
                {errors.candidate_name && <p className="text-xs text-red-400 mt-1">{errors.candidate_name}</p>}
              </div>

              <div>
                <Label>Current Organization</Label>
                <Input
                  value={form.current_org}
                  onChange={(e) => setForm({ ...form, current_org: e.target.value })}
                  placeholder="e.g. ICICI Bank"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  placeholder="e.g. 7781913284"
                />
              </div>

              <div>
                <Label>Email ID</Label>
                <Input
                  type="email"
                  value={form.email_id}
                  onChange={(e) => setForm({ ...form, email_id: e.target.value })}
                  placeholder="arijit@gmail.com"
                />
              </div>

              <div>
                <Label>Academics</Label>
                <Input
                  value={form.academics}
                  onChange={(e) => setForm({ ...form, academics: e.target.value })}
                  placeholder="e.g. MBA 2017"
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* SECTION 2: Target Client & Position Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              2. Target Client & Position Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Target Organisation *</Label>
                <div className="space-y-2">
                  <CompanySearch value={company} onSelect={setCompany} />
                  <Input
                    value={form.organisation_name}
                    onChange={(e) => setForm({ ...form, organisation_name: e.target.value })}
                    placeholder="Or type company name manually"
                    className={errors.organisation_name ? "border-red-500" : ""}
                  />
                </div>
                {errors.organisation_name && <p className="text-xs text-red-400 mt-1">{errors.organisation_name}</p>}
              </div>

              <div>
                <Label>Position *</Label>
                <div className="space-y-2">
                  {/* Fetched Position Dropdown */}
                  {companyPositions.length > 0 && (
                    <Select
                      value={form.position_title}
                      onValueChange={(val) => setForm({ ...form, position_title: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Open Position" />
                      </SelectTrigger>
                      <SelectContent>
                        {companyPositions.map((p, idx) => (
                          <SelectItem key={idx} value={p.title}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Input
                    value={form.position_title}
                    onChange={(e) => setForm({ ...form, position_title: e.target.value })}
                    placeholder={companyPositions.length > 0 ? "Or type position manually..." : "e.g. SRM-Commercial Banking"}
                    className={errors.position_title ? "border-red-500" : ""}
                  />
                </div>
                {errors.position_title && <p className="text-xs text-red-400 mt-1">{errors.position_title}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Kolkata, Baroda"
                />
              </div>

              <div>
                <Label>Sent On Date *</Label>
                <Input
                  type="date"
                  value={form.sent_on}
                  onChange={(e) => setForm({ ...form, sent_on: e.target.value })}
                  className={errors.sent_on ? "border-red-500" : ""}
                />
                {errors.sent_on && <p className="text-xs text-red-400 mt-1">{errors.sent_on}</p>}
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* SECTION 3: Internal & HR Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              3. Recruiter & Remarks
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Sourced By</Label>
                <Input
                  value={form.sourced_by}
                  onChange={(e) => setForm({ ...form, sourced_by: e.target.value })}
                  placeholder="e.g. Deepali"
                />
              </div>

              <div>
                <Label>Spoken By</Label>
                <Input
                  value={form.spoken_by}
                  onChange={(e) => setForm({ ...form, spoken_by: e.target.value })}
                  placeholder="e.g. Deepali"
                />
              </div>

              <div>
                <Label>Client HR Contact</Label>
                <Input
                  value={form.hr_contact}
                  onChange={(e) => setForm({ ...form, hr_contact: e.target.value })}
                  placeholder="e.g. Payel / Nishant"
                />
              </div>
            </div>

            <div>
              <Label>Remarks / Status Notes</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={2}
                placeholder="e.g. Shortlisted for Interview"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 pt-3 border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : editing ? "Update Entry" : "Save Profile Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}