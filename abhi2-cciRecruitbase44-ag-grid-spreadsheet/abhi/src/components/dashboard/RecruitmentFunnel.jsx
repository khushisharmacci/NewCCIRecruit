import { cn } from "@/lib/utils";

const stages = [
{ key: "applied", label: "Applications", color: "bg-blue-500" },
{ key: "screening", label: "Screened", color: "bg-indigo-500" },
{ key: "shortlisted", label: "Shortlisted", color: "bg-violet-500" },
{ key: "interviewed", label: "Interviewed", color: "bg-amber-500" },
{ key: "selected", label: "Selected", color: "bg-emerald-500" },
{ key: "joined", label: "Joined", color: "bg-teal-500" }];


export default function RecruitmentFunnel({ data }) {
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <div className="rounded-xl border border-border p-6 bg-card">
      <h3 className="text-lg font-semibold text-foreground mb-6">Recruitment Funnel</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const val = data[stage.key] || 0;
          const width = Math.max(val / maxVal * 100, 8);
          const prevVal = i > 0 ? data[stages[i - 1].key] || 0 : val;
          const conversion = prevVal > 0 && i > 0 ? Math.round(val / prevVal * 100) : 100;
          return (
            <div key={stage.key} className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground text-right shrink-0">{stage.label}</div>
              <div className="flex-1 h-9 bg-muted rounded-lg overflow-hidden relative">
                <div
                  className={cn("h-full rounded-lg transition-all duration-700 flex items-center px-3", stage.color)}
                  style={{ width: `${width}%` }}>
                  
                  <span className="text-white text-sm font-semibold">{val}</span>
                </div>
              </div>
              <div className="w-12 text-xs text-muted-foreground text-right shrink-0">
                {i > 0 ? `${conversion}%` : ""}
              </div>
            </div>);

        })}
      </div>
    </div>);

}