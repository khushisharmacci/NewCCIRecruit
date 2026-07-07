import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import ReportCalendar from "./ReportCalendar";
import ReportEditor from "./ReportEditor";
import { supabase } from "@/lib/supabase";
import { syncCallLogToSpreadsheet } from "@/lib/spreadsheetSync";

export default function UserDailyReport() {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [workSummary, setWorkSummary] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [existingReport, setExistingReport] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const skipDirtyRef = useRef(true);

  const { data: myReports = [] } = useQuery({
  queryKey: ["daily-reports", user?.id, companyId],
  enabled: !!user,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("report_date", { ascending: false });

    if (error) throw error;

    return data || [];
  },
});

const { data: candidates = [] } = useQuery({
  queryKey: ["candidates"],
  enabled: !!companyId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("company_id", companyId);

    if (error) throw error;
    return data || [];
  },
});

const { data: clients = [] } = useQuery({
  queryKey: ["clients"],
  enabled: true,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*");

    console.log("CLIENT QUERY RESULT", data);
    console.log("CLIENT QUERY ERROR", error);

    if (error) throw error;

    return data || [];
  },
});
console.log("COMPANY ID", companyId);
console.log("CLIENTS FROM QUERY", clients);
const { data: positions = [] } = useQuery({
  queryKey: ["positions"],
  enabled: !!companyId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("company_id", companyId);

    if (error) throw error;
    return data || [];
  },
});

const { data: files = [] } = useQuery({
  queryKey: ["spreadsheet-files"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("data_files")
      .select("id, name")
      .order("name");

    if (error) throw error;

    return data || [];
  },
});

  const reportDates = myReports.map(r => r.report_date);

  useEffect(() => {
  const loadReport = async () => {
    const report = myReports.find(
      r => r.report_date === selectedDate
    );

    skipDirtyRef.current = true;

    if (report) {
      setExistingReport(report);
      setWorkSummary(report.work_summary || "");
      setAttachments(report.attachments || []);

      const { data } = await supabase
        .from("daily_report_call_logs")
        .select("*")
        .eq("report_id", report.id);

      setCallLogs(data || []);
    } else {
      setExistingReport(null);
      setWorkSummary("");
      setAttachments([]);
      setCallLogs([]);
    }

    setIsDirty(false);
  };

  loadReport();
}, [selectedDate, myReports]);

  useEffect(() => {
    if (skipDirtyRef.current) { skipDirtyRef.current = false; return; }
    setIsDirty(true);
  }, [workSummary, attachments, callLogs]);

  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleSave = async () => {
    if (!workSummary.trim && callLogs.length === 0 && attachments.length === 0) {
      toast({ title: "Nothing to save", description: "Add some content first.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let reportId;
      if (existingReport) {
        const { error: updateError } = await supabase
  .from("daily_reports")
  .update({
    work_summary: workSummary,
    attachments,
  })
  .eq("id", existingReport.id);

if (updateError) throw updateError;
        reportId = existingReport.id;
        await supabase
.from("daily_report_call_logs")
.delete()
.eq("report_id", reportId);
      } else {
        const { data: newReport, error } = await supabase
  .from("daily_reports")
  .insert({
    company_id: companyId,
    user_id: user.id,
    user_name: user.full_name,
    report_date: selectedDate,
    work_summary: workSummary,
    attachments,
  })
  .select()
  .single();

if (error) throw error;

reportId = newReport.id;
setExistingReport(newReport);

      }
      if (callLogs.length > 0) {

const logs = callLogs.map(log => ({
  report_id: reportId,
  company_id: companyId,

  person_name: log.person_name,
  phone_number: log.phone_number,

  spreadsheet_id: log.spreadsheet_id || null,
  company_name: log.company_name || null,
  position_title: log.position_title || null,

  discussion_notes: log.discussion_notes,
}));
console.log("LOGS TO SAVE", logs);
const { error } = await supabase
.from("daily_report_call_logs")
.insert(logs);

if (error) throw error;
console.log("STARTING SPREADSHEET SYNC");

for (const log of logs) {
  console.log("SYNCING LOG:", log);

  await syncCallLogToSpreadsheet(log);

  console.log("SYNC COMPLETE");
}
      }
      await queryClient.invalidateQueries({
  queryKey: ["daily-reports"],
});
      queryClient.invalidateQueries({ queryKey: ["daily-report-status"] });
      setIsDirty(false);
      toast({ title: existingReport ? "Report updated" : "Report saved", description: format(new Date(selectedDate), "MMM d, yyyy") });
 }  catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!existingReport) return;
    setSaving(true);
    try {
      const { error: deleteLogsError } = await supabase
  .from("daily_report_call_logs")
  .delete()
  .eq("report_id", existingReport.id);

if (deleteLogsError) throw deleteLogsError;
      const { error } = await supabase
  .from("daily_reports")
  .delete()
  .eq("id", existingReport.id);

if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report-status"] });
      setExistingReport(null);
      setWorkSummary("");
      setAttachments([]);
      setCallLogs([]);
      setIsDirty(false);
      toast({ title: "Report deleted" });
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <ReportCalendar reportDates={reportDates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>
      <div className="lg:col-span-8">
        <ReportEditor
  selectedDate={selectedDate}
  workSummary={workSummary}
  setWorkSummary={setWorkSummary}
  attachments={attachments}
  setAttachments={setAttachments}
  callLogs={callLogs}
  setCallLogs={setCallLogs}

  candidates={candidates}
  clients={clients}
  positions={positions}
  files={files}   // ✅ Add this

  existingReport={existingReport}
  isDirty={isDirty}
  saving={saving}
  onSave={handleSave}
  onDelete={handleDelete}
  readOnly={false}
/>
      </div>
    </div>
  );
}