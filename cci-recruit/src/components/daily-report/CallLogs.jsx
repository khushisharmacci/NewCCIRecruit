import { useState } from "react";
import {
  Phone,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Briefcase,
  Check,
} from "lucide-react";

import CandidateInput from "./CandidateInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CallLogs({
  callLogs = [],
  setCallLogs,
  readOnly = false,

  candidates = [],
  clients = [],
  positions = [],
}) {
  console.log("CALL LOG CLIENTS", clients);
  console.log("CALL LOG POSITIONS", positions);
  const emptyForm = {
  person_name: "",
  phone_number: "",
  discussion_notes: "",
  company_name: "",
  position_title: "",
  candidate_id: "",
};

  const [editing, setEditing] = useState(-1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const startAdd = () => {
    setForm(emptyForm);
    setEditing(-2);
  };

  const startEdit = (index) => {
    setForm(callLogs[index]);
    setEditing(index);
  };

  const handleSave = () => {
    const errs = {};

if (!form.person_name.trim())
  errs.person_name = "Required";

if (!form.phone_number.trim())
  errs.phone_number = "Required";

if (!form.company_name)
  errs.company_name = "Required";

if (!form.position_title)
  errs.position_title = "Required";

setErrors(errs);

if (Object.keys(errs).length) return;

    if (editing === -2) {
      setCallLogs((prev) => [...prev, form]);
    } else {
      setCallLogs((prev) =>
        prev.map((item, index) =>
          index === editing ? form : item
        )
      );
    }

    setEditing(-1);
    setForm(emptyForm);
  };

  const handleDelete = (index) => {
    setCallLogs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setEditing(-1);
    setForm(emptyForm);
  };
  console.log("POSITIONS", positions);
  console.log("SELECTED COMPANY", form.company_name);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
  <Phone className="h-5 w-5 text-primary" />
  Call Logs

  {callLogs.length > 0 && (
    <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
      {callLogs.length}
    </span>
  )}
</h3>

        {!readOnly && editing === -1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={startAdd}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Call Log
          </Button>
        )}
      </div>

      {editing !== -1 && !readOnly && (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
  <Label className="mb-1 block text-xs">
    Person Name *
  </Label>

  <CandidateInput
  value={form.person_name}
  candidateId={form.candidate_id}
  candidates={candidates}
  onChange={(name, id) => {
    setForm((prev) => ({
      ...prev,
      person_name: name,
      candidate_id: id || "",
    }));

    setErrors((prev) => ({
      ...prev,
      person_name: undefined,
    }));
  }}
/>

  {errors.person_name && (
    <p className="mt-1 text-xs text-red-500">
      {errors.person_name}
    </p>
  )}
</div>

   <Input
  placeholder="Phone Number"
  value={form.phone_number}
  className={errors.phone_number ? "border-red-500" : ""}
  onChange={(e) => {
    setForm((prev) => ({
      ...prev,
      phone_number: e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      phone_number: undefined,
    }));
  }}
/>

{errors.phone_number && (
  <p className="mt-1 text-xs text-red-500">
    {errors.phone_number}
  </p>
)}
            <div>
  <Label className="mb-1 block text-xs">
    Company *
  </Label>

  <Select
    value={form.company_name}
    onValueChange={(value) => {
      setForm((prev) => ({
        ...prev,
        company_name: value,
        position_title: "",
      }));

      setErrors((prev) => ({
        ...prev,
        company_name: undefined,
        position_title: undefined,
      }));
    }}
  >
    <SelectTrigger
      className={errors.company_name ? "border-red-500" : ""}
    >
      <SelectValue placeholder="Select company" />
    </SelectTrigger>

    <SelectContent>
      {clients.map((client) => (
        <SelectItem
        key={client.id}
        value={client.id}
       >
       {client.name}
       </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {errors.company_name && (
    <p className="mt-1 text-xs text-red-500">
      {errors.company_name}
    </p>
  )}
</div>
<div>
  <Label className="mb-1 block text-xs">
    Position *
  </Label>

  <Select
    value={form.position_title}
    onValueChange={(value) => {
      setForm((prev) => ({
        ...prev,
        position_title: value,
      }));

      setErrors((prev) => ({
        ...prev,
        position_title: undefined,
      }));
    }}
    disabled={!form.company_name}
  >
    <SelectTrigger
      className={errors.position_title ? "border-red-500" : ""}
    >
      <SelectValue
        placeholder={
          form.company_name
            ? "Select position"
            : "Select company first"
        }
      />
    </SelectTrigger>

    <SelectContent>
      {positions
  .filter(
    (position) =>
      position.company_id === form.company_name
  )
        .map((position) => (
          <SelectItem
            key={position.id}
            value={position.title}
          >
            {position.title}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>

  {errors.position_title && (
    <p className="mt-1 text-xs text-red-500">
      {errors.position_title}
    </p>
  )}
</div>
          </div>

          <Textarea
  className="min-h-[80px]"
  placeholder="Discussion Notes"
  value={form.discussion_notes}
  onChange={(e) =>
    setForm((prev) => ({
      ...prev,
      discussion_notes: e.target.value,
    }))
  }
/>

          <div className="flex gap-2">
            <Button
  onClick={handleSave}
  disabled={saving}
>
              {saving
  ? "Saving..."
  : editing === -2
  ? "Add"
  : "Update"}
            </Button>

            <Button
  variant="outline"
  onClick={handleCancel}
  disabled={saving}
>
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
  <p className="text-sm font-medium">
    {log.person_name}
  </p>

  {log.phone_number && (
    <span className="text-xs text-muted-foreground">
      {log.phone_number}
    </span>
  )}

  {log.candidate_id && (
    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
      <Check className="h-3 w-3" />
      Linked Candidate
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