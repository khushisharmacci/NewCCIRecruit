import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { can } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, LogIn, LogOut, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, eachDayOfInterval, endOfMonth, isSameDay, parseISO } from "date-fns";

export default function EmployeeDirectory() {
  const { user } = useAuth();
  const companyId = user?.company_id || null;
  const [selectedEmp, setSelectedEmp] = useState(null);

  const isCEO =
  can.isCEO(user) ||
  can.manageUsers(user);

  const { data: users = [] } = useQuery({
  queryKey: ["directory-users", companyId],
  queryFn: async () => {
    let query = supabase
      .from("recruiters")
      .select("*");

    if (companyId) {
      query = query.eq(
        "company_id",
        companyId
      );
    }

    const { data, error } =
      await query;

    if (error) throw error;

    return data || [];
  },
});

  const { data: records = [] } = useQuery({
  queryKey: ["directory-attendance", companyId],
  queryFn: async () => {
    let query = supabase
      .from("attendance_records")
      .select("*")
      .order(
        "attendance_date",
        {
          ascending: false,
        }
      );

    if (companyId) {
      query = query.eq(
        "company_id",
        companyId
      );
    }

    const { data, error } =
      await query;

    if (error) throw error;

    return data || [];
  },
});

  if (!isCEO) return null;

  const today = format(new Date(), "yyyy-MM-dd");

  const getEmployeeStatus = (empName) => {
    const todayRecord = records.find((r) => r.employee_name === empName && r.attendance_date === today);
    if (!todayRecord) return { status: "Not Checked In", color: "bg-gray-500/15 text-gray-400" };
    if (todayRecord.check_out) return { status: "Checked Out", color: "bg-blue-500/15 text-blue-300" };
    return { status: "Checked In", color: "bg-emerald-500/15 text-emerald-300" };
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Employee Directory
        </h3>

        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No employees found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((emp) => {
              const empStatus = getEmployeeStatus(emp.full_name || emp.email);
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {(emp.full_name || emp.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{emp.full_name || emp.email}</p>
                    <p className="text-xs text-muted-foreground">{emp.role || "Employee"}</p>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", empStatus.color)}>{empStatus.status}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <EmployeeDetailDialog
        employee={selectedEmp}
        records={records}
        onClose={() => setSelectedEmp(null)}
      />
    </>
  );
}

function EmployeeDetailDialog({ employee, records, onClose }) {
  if (!employee) return null;
  const empName = employee.full_name || employee.email;
  const today = format(new Date(), "yyyy-MM-dd");

  const todayRecord = records.find((r) => r.employee_name === empName && r.attendance_date === today);
  const empRecords = records.filter((r) => r.employee_name === empName);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayStatus = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const rec = empRecords.find((r) => r.attendance_date === dayStr);
    if (!rec) return null;
    if (rec.status === "Absent") return { label: "Absent", color: "bg-red-500/15 text-red-300" };
    if (rec.work_mode === "WFH") return { label: "WFH", color: "bg-blue-500/15 text-blue-300" };
    return { label: "WFO", color: "bg-emerald-500/15 text-emerald-300" };
  };

  return (
    <Dialog open={!!employee} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
              {empName?.charAt(0).toUpperCase()}
            </div>
            {empName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Logged In</p>
              <p className="text-sm font-bold text-foreground">{todayRecord ? "Yes" : "No"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Login Time</p>
              <p className="text-sm font-bold text-foreground">{todayRecord?.check_in || "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Logout Time</p>
              <p className="text-sm font-bold text-foreground">{todayRecord?.check_out || "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
              <p className="text-sm font-bold text-foreground">{todayRecord?.total_hours ? `${todayRecord.total_hours}h` : "—"}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Monthly Attendance
            </h4>
            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((day) => {
                const status = getDayStatus(day);
                const isFuture = day > new Date();
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center text-xs",
                      isFuture ? "bg-muted/20 text-muted-foreground/30" :
                      status ? status.color : "bg-muted/30 text-muted-foreground",
                      isToday && "ring-1 ring-primary"
                    )}
                    title={status ? `${format(day, "MMM d")}: ${status.label}` : format(day, "MMM d")}
                  >
                    <span className="text-[10px] opacity-70">{format(day, "d")}</span>
                    {status && !isFuture && <span className="text-[9px] font-medium">{status.label}</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/15" /> WFO</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/15" /> WFH</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/15" /> Absent</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}