import { FolderOpen, FileSpreadsheet, Database, RefreshCw } from "lucide-react";

export default function DCStats({ folders, files }) {
  const totalRecords = files.reduce((s, f) => s + (f.row_count || 0), 0);
  const synced = files.filter(f => f.sync_status === "synced").length;

  const stats = [
    { label: "Total Files", value: files.length, icon: FileSpreadsheet, color: "bg-blue-500/20 text-blue-400" },
    { label: "Total Folders", value: folders.length, icon: FolderOpen, color: "bg-amber-500/20 text-amber-400" },
    { label: "Total Records", value: totalRecords.toLocaleString(), icon: Database, color: "bg-emerald-500/20 text-emerald-400" },
    { label: "Synced Files", value: synced, icon: RefreshCw, color: "bg-purple-500/20 text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
            <s.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}