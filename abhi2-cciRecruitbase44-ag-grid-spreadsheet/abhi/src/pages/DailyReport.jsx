import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import UserDailyReport from "@/components/daily-report/UserDailyReport";
import CEODailyReport from "@/components/daily-report/CEODailyReport";

export default function DailyReport() {
  const { user } = useAuth();
console.log("AUTH USER", user);
  const isCEO = user?.role === "ceo";

  const [ceoView, setCeoView] = useState("team");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Daily Report
        </h1>

        {isCEO && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={ceoView === "team" ? "default" : "outline"}
              onClick={() => setCeoView("team")}
            >
              Team Reports
            </Button>

            <Button
              size="sm"
              variant={ceoView === "my" ? "default" : "outline"}
              onClick={() => setCeoView("my")}
            >
              My Reports
            </Button>
          </div>
        )}
      </div>

      {isCEO && ceoView === "team" ? (
        <CEODailyReport />
      ) : (
        <UserDailyReport />
      )}
    </div>
  );
}