import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function DailyReportStatus() {
  const { user } = useAuth();

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: myReports = [] } = useQuery({
    queryKey: ["daily-report-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_reports")
        .select("report_date")
        .eq("user_id", user.id);

      if (error) throw error;

      return data || [];
    },
  });

  const hasToday = myReports.some(
    (report) => report.report_date === today
  );

  return (
    <Link to="/daily-report" className="block">
      <div
        className={`rounded-xl border p-5 transition-colors hover:border-primary/50 ${
          hasToday
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/30 bg-amber-500/10"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasToday ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            )}

            <div>
              <p className="text-sm font-semibold text-foreground">
                Today's Report Status
              </p>

              <p
                className={`text-lg font-bold ${
                  hasToday
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {hasToday
                  ? "Report Submitted"
                  : "Report Pending"}
              </p>
            </div>
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}