import { format } from "date-fns";
import {
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AttachmentUploader from "./AttachmentUploader";
import CallLogs from "./CallLogs";

export default function ReportEditor({
  clients,
  positions,
  selectedDate,
  workSummary,
  setWorkSummary,
  attachments,
  setAttachments,
  callLogs,
  setCallLogs,
  existingReport,
  isDirty,
  saving,
  onSave,
  onDelete,
  readOnly = false,
}) {
  const { data: files = [] } = useQuery({
  queryKey: ["spreadsheet-files"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("data_files")
      .select("id, name")
      .eq("entity_type", "candidates")
      .order("name");

    if (error) throw error;

    return data || [];
  },
});
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">
              {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
            </h3>

            {isDirty ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </p>
            ) : saving ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </p>
            ) : existingReport ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                All changes saved
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                New report
              </p>
            )}
          </div>

          {!readOnly && (
            <div className="flex gap-2">
              {existingReport && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={saving}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              )}

              <Button
                size="sm"
                onClick={onSave}
                disabled={saving || (!isDirty && !!existingReport)}
              >
                {saving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}

                {existingReport ? "Update" : "Submit"}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Work Summary
            </label>

            <Textarea
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              readOnly={readOnly}
              className="min-h-[200px] resize-y"
              placeholder={`Tasks Completed:
Meetings Attended:
Candidates Called:
Progress Made:
Plans for Tomorrow:`}
            />
          </div>

          
        </div>
      </div>

      <AttachmentUploader
        attachments={attachments}
        setAttachments={setAttachments}
        readOnly={readOnly}
      />

      <CallLogs
      callLogs={callLogs}
      setCallLogs={setCallLogs}
      clients={clients}
      positions={positions}
      readOnly={readOnly}
      files={files}
/>
    </div>
  );
}