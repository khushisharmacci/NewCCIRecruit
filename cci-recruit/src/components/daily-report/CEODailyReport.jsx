import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

import EmployeeSelector from "./EmployeeSelector";
import ReportCalendar from "./ReportCalendar";
import ReadOnlyReport from "./ReadOnlyReport";

export default function CEODailyReport() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Load all employees
  const { data: users = [] } = useQuery({
    queryKey: ["employees", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiters")
        .select("*")
        .eq("company_id", companyId)
        .order("full_name");

      if (error) throw error;

      return data || [];
    },
  });

  // Load selected employee reports
  const { data: empReports = [] } = useQuery({
    queryKey: ["daily-reports", selectedEmployee?.id],
    enabled: !!selectedEmployee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", selectedEmployee.id)
        .order("report_date", { ascending: false });

      if (error) throw error;

      return data || [];
    },
  });

  const reportDates = empReports.map((report) => report.report_date);

  const selectedReport = empReports.find(
    (report) => report.report_date === selectedDate
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <EmployeeSelector
          users={users}
          selected={selectedEmployee}
          onSelect={setSelectedEmployee}
        />
      </div>

      <div className="lg:col-span-4">
        {selectedEmployee ? (
          <ReportCalendar
            reportDates={reportDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Select an employee to view their reports
            </p>
          </div>
        )}
      </div>

      <div className="lg:col-span-5">
        {selectedReport ? (
          <ReadOnlyReport report={selectedReport} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              {selectedEmployee
                ? "Select a date to view the report"
                : "Select an employee first"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}