import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const EVENT_TYPES = [
  "Interview",
  "Follow-Up",
  "Resume Review",
  "Candidate Submission",
  "Offer Release",
  "Joining Date",
  "Candidate Documentation",
  "Client Follow-Up",
  "Requirement Deadline",
  "Team Meeting",
  "Task",
  "Reminder",
  "Monthly Report",
  "Custom",
];


const REMINDER_OPTIONS = [
{ label: "5 min before", value: 5 },
{ label: "15 min before", value: 15 },
{ label: "30 min before", value: 30 },
{ label: "1 hour before", value: 60 },
{ label: "3 hours before", value: 180 },
{ label: "1 day before", value: 1440 },
{ label: "3 days before", value: 4320 },
{ label: "7 days before", value: 10080 }];


const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const RECURRENCES = ["None", "Daily", "Weekly", "Monthly"];

const defaultForm = {
  title: "",
  description: "",
  event_type: "Meeting",
  custom_event: "",
  priority: "Medium",
  start_datetime: "",
  end_datetime: "",
  all_day: false,
  location: "",
  assigned_to: "",
  related_candidate: "",
  related_client: "",
  reminders: [],
  recurrence: "None",
  notes: "",
};

export default function EventForm({ open, onOpenChange, event, onSave, isLoading }) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
  if (event) {
    const isBuiltIn = EVENT_TYPES.includes(event.event_type);

    setForm({
      ...defaultForm,
      ...event,

      event_type: isBuiltIn
        ? event.event_type
        : "Custom",

      custom_event: isBuiltIn
        ? ""
        : event.event_type,

      reminders:
        typeof event.reminders === "string"
          ? (event.reminders ? JSON.parse(event.reminders) : [])
          : (event.reminders || []),

      start_datetime: event.start_datetime
        ? event.start_datetime.slice(0, 16)
        : "",

      end_datetime: event.end_datetime
        ? event.end_datetime.slice(0, 16)
        : "",
    });
  } else {
    setForm(defaultForm);
  }
}, [event, open]);

  const handleSubmit = (e) => {
  e.preventDefault();

  if (
    form.event_type === "Custom" &&
    !form.custom_event.trim()
  ) {
    alert("Please enter a custom event name.");
    return;
  }

  onSave({
    ...form,

    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    assigned_to: form.assigned_to.trim(),
    related_candidate: form.related_candidate.trim(),
    related_client: form.related_client.trim(),
    notes: form.notes.trim(),

    event_type:
      form.event_type === "Custom"
        ? form.custom_event.trim()
        : form.event_type,

    reminders: JSON.stringify(form.reminders),

    start_datetime: form.start_datetime || null,
    end_datetime: form.end_datetime || null,
  });
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create New Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Event Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Final Interview - John Doe" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Event Type</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              {form.event_type === "Custom" && (
  <div className="mt-3">
    <Label>Custom Event Name</Label>

    <Input
      value={form.custom_event}
      placeholder="e.g. Campus Placement Drive"
      onChange={(e) =>
        setForm({
          ...form,
          custom_event: e.target.value,
        })
      }
    />
  </div>
)}
<div>
  <Label>Priority</Label>

  <Select
    value={form.priority}
    onValueChange={(v) =>
      setForm({
        ...form,
        priority: v,
      })
    }
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>

    <SelectContent>
      {PRIORITIES.map((p) => (
        <SelectItem key={p} value={p}>
          {p}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
         </div>  
</div>  
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : event ? "Update Event" : "Create Event"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>);

}