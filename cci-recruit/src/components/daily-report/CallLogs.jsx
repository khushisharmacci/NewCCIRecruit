import { useState, useEffect } from "react";
import { Phone, Plus, Pencil, Trash2, Search, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { syncCallLog } from "@/lib/callLogSync/index";

export default function CallLogs({
  callLogs = [],
  setCallLogs,
  readOnly = false,
}) {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const emptyForm = {
    person_name: "",
    phone_number: "",
    discussion_notes: "",
    company_id: "",
    position_title: "",
    candidate_id: null,
  };

  const [editing, setEditing] = useState(-1);
  const [form, setForm] = useState(emptyForm);
  
  // Dynamic UI States
  const [nameSearch, setNameSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [spreadsheetFields, setSpreadsheetFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ─── DB Queries ──────────────────────────────────────────────────────────

  // 1. Fetch Spreadsheets (DataFiles)
  const { data: spreadsheets = [] } = useQuery({
    queryKey: ["candidate-spreadsheets", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_files")
        .select("id, name, columns")
        .eq("entity_type", "Candidate");

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // 2. Fetch Candidates list for suggestions lookup
  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates-suggestions", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, full_name, phone, email, position, data_file_id");

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  
    // 3. Fetch Clients (Companies)
  const { data: companies = [] } = useQuery({
    queryKey: ["clients-suggestions", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
       .select("id, name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // 4. Fetch Job Positions
  const { data: positions = [] } = useQuery({
  queryKey: ["position-suggestions", companyId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*");

    if (error) throw error;

    console.log("Positions:", data);

    return data || [];
  },
  enabled: !!companyId,
});

  // ─── Suggestions Filtering ──────────────────────────────────────────────
  const filteredCandidates = nameSearch.trim()
    ? candidates.filter((c) =>
        c.full_name?.toLowerCase().includes(nameSearch.toLowerCase())
      )
    : [];

  const selectedCompany = companies.find((c) => c.id === form.company_id);

const filteredPositions = selectedCompany
  ? positions.filter((p) => p.company_id === selectedCompany.id)
  : [];

  const activeSpreadsheet = spreadsheets.find((s) => s.id === selectedSpreadsheetId);
  const spreadsheetColumns = activeSpreadsheet?.columns || [];

  // Initialize nameSearch when form updates (e.g. edit log)
  useEffect(() => {
    setNameSearch(form.person_name);
  }, [form.person_name]);

  const startAdd = () => {
    setForm(emptyForm);
    setNameSearch("");
    setSelectedSpreadsheetId("");
    setSpreadsheetFields({});
    setEditing(-2);
  };

  const startEdit = (index) => {
    const log = callLogs[index];
    setForm({
      person_name: log.person_name || "",
      phone_number: log.phone_number || "",
      discussion_notes: log.discussion_notes || "",
      company_id: log.company_id || "",
      position_title: log.position_title || "",
      candidate_id: log.candidate_id || null,
    });
    setNameSearch(log.person_name || "");
    setSelectedSpreadsheetId(log.spreadsheet_id || "");
    setSpreadsheetFields(log.spreadsheet_fields || {});
    setEditing(index);
  };

  const handleSave = async () => {
    if (!form.person_name.trim()) return;

    setSubmitting(true);
    try {
      // 1. Trigger the sync module to save to candidates and data_files
      const syncedCandidate = await syncCallLog({
        company_id: companyId,
        person_name: form.person_name,
        phone_number: form.phone_number,
        position_title: form.position_title,
        discussion_notes: form.discussion_notes,
        candidate_id: form.candidate_id || null,
        spreadsheet_id: selectedSpreadsheetId || null,
        spreadsheet_fields: spreadsheetFields,
      });

      const savedCandidateId = form.candidate_id || (syncedCandidate ? syncedCandidate.id : null);

      // 2. Build the local Call Log object to save on daily report state
      const savedLog = {
        person_name: form.person_name,
        phone_number: form.phone_number,
        discussion_notes: form.discussion_notes,
        company_id: form.company_id || null,
        position_title: form.position_title || null,
        candidate_id: savedCandidateId,
        spreadsheet_id: selectedSpreadsheetId || null,
        spreadsheet_fields: spreadsheetFields,
      };

      if (editing === -2) {
        setCallLogs((prev) => [...prev, savedLog]);
      } else {
        setCallLogs((prev) =>
          prev.map((item, index) => (index === editing ? savedLog : item))
        );
      }

      setEditing(-1);
      setForm(emptyForm);
      setNameSearch("");
      setSelectedSpreadsheetId("");
      setSpreadsheetFields({});
    } catch (err) {
      console.error(err);
      alert("Failed to sync call log candidate record: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (index) => {
    setCallLogs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setEditing(-1);
    setForm(emptyForm);
    setNameSearch("");
    setSelectedSpreadsheetId("");
    setSpreadsheetFields({});
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Phone className="h-5 w-5 text-primary" />
          Call Logs
        </h3>

        {!readOnly && editing === -1 && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add Call Log
          </Button>
        )}
      </div>

      {editing !== -1 && !readOnly && (
        <div className="mb-4 space-y-4 rounded-lg border border-border bg-muted/50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            
            {/* Person Name Suggestion Box */}
            <div className="relative space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Person Name *</Label>
                {form.candidate_id ? (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-medium">
                    Existing Candidate
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.2 rounded font-medium">
                    New Candidate
                  </span>
                )}
              </div>
              <Input
                placeholder="Type a name or select existing candidate"
                value={nameSearch}
                onChange={(e) => {
                  setNameSearch(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    person_name: e.target.value,
                    candidate_id: null, // Reset candidate ID on edit to treat as new unless clicked
                  }));
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && filteredCandidates.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCandidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/80 transition-colors flex justify-between items-center border-b border-border last:border-0"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          person_name: c.full_name,
                          phone_number: c.phone || "",
                          position_title: c.position || "",
                          candidate_id: c.id,
                        }));
                        setNameSearch(c.full_name);
                        setShowSuggestions(false);
                      }}
                    >
                      <div>
                        <p className="font-medium text-xs">{c.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.email || "No email"}
                        </p>
                      </div>
                      <span className="text-[10px] text-primary font-medium hover:underline">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <Label className="text-xs">Phone Number</Label>
              <Input
                placeholder="Phone Number"
                value={form.phone_number}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    phone_number: e.target.value,
                  }))
                }
              />
            </div>

            {/* Company Selection */}
            <div className="space-y-1">
              <Label className="text-xs">Company *</Label>
              <Select
                value={form.company_id}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, company_id: val, position_title: "" }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position Selection */}
            <div className="space-y-1">
              <Label className="text-xs">Position *</Label>
              <Select
                value={form.position_title}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, position_title: val }))
                }
                disabled={!form.company_id}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={form.company_id ? "Select position" : "Select company first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPositions.map((p) => (
                    <SelectItem key={p.id} value={p.title}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Dynamic Spreadsheet Dropdown (Only for New Candidate flow) */}
          {!form.candidate_id && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Select Spreadsheet (for new candidate)</Label>
                <Select
                  value={selectedSpreadsheetId}
                  onValueChange={(val) => {
                    setSelectedSpreadsheetId(val);
                    setSpreadsheetFields({});
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose a spreadsheet to store this candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {spreadsheets.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamically Populated Columns */}
              {selectedSpreadsheetId && spreadsheetColumns.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-border/60 p-3 rounded-lg bg-card/60">
                  <p className="sm:col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Spreadsheet Custom Fields
                  </p>
                  {spreadsheetColumns
                    .filter((col) => !["__id", "_candidate_id", "_row_id"].includes(col))
                    .map((col) => (
                      <div key={col} className="space-y-1">
                        <Label className="text-[11px] font-medium">{col}</Label>
                        <Input
                          placeholder={`Enter ${col}`}
                          className="h-8 text-xs"
                          value={spreadsheetFields[col] || ""}
                          onChange={(e) =>
                            setSpreadsheetFields((prev) => ({
                              ...prev,
                              [col]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Discussion Notes / Remarks */}
          <div className="space-y-1">
            <Label className="text-xs">Discussion Notes / Remarks</Label>
            <Textarea
              className="min-h-[85px]"
              placeholder="Discussion notes — will sync to Candidate Remarks and Spreadsheet Remarks"
              value={form.discussion_notes}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  discussion_notes: e.target.value,
                }))
              }
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving..." : editing === -2 ? "Add" : "Update"}
            </Button>

            <Button variant="outline" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {callLogs.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No call logs recorded
        </p>
      ) : (
        <div className="space-y-2">
          {callLogs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-4 w-4 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{log.person_name}</p>

                  {log.phone_number && (
                    <span className="text-xs text-muted-foreground">
                      {log.phone_number}
                    </span>
                  )}
                </div>

                {log.discussion_notes && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {log.discussion_notes}
                  </p>
                )}
              </div>

              {!readOnly && editing === -1 && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(index)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}