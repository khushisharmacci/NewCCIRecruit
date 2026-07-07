import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { supabase } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";

import AttachmentUploader from "./AttachmentUploader";
import CallLogs from "./CallLogs";

export default function ReadOnlyReport({ report }) {
  const { data: callLogs = [] } = useQuery({
    queryKey: ["daily-report-call-logs", report.id],
    enabled: !!report?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_report_call_logs")
        .select("*")
        .eq("report_id", report.id);

      if (error) throw error;

      return data || [];
    },
  });

  // attachments are stored as JSONB in Supabase
  const attachments = report.attachments || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold">
          {format(new Date(report.report_date), "EEEE, MMMM d, yyyy")}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Work Summary
            </label>

            <Textarea
              readOnly
              value={report.work_summary || ""}
              className="min-h-[200px] resize-y bg-muted/30"
            />
          </div>

        
        </div>
      </div>

      <AttachmentUploader
        attachments={attachments}
        setAttachments={() => {}}
        readOnly
      />

      <CallLogs
  callLogs={callLogs}
  setCallLogs={() => {}}
  readOnly
/>
    </div>
  );
}