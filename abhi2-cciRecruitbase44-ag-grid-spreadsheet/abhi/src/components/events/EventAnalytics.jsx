import { useMemo } from "react";
import { isPast, parseISO } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#6b7280"];

export default function EventAnalytics({ events }) {
  const stats = useMemo(() => {
    const completed = events.filter(e => e.status === "Completed").length;
    const missed = events.filter(e => e.status === "Missed").length;
    const overdue = events.filter(e => e.status === "Upcoming" && isPast(parseISO(e.start_datetime))).length;
    const upcoming = events.filter(e => e.status === "Upcoming" && !isPast(parseISO(e.start_datetime))).length;
    const cancelled = events.filter(e => e.status === "Cancelled").length;
    const total = events.length;

    const byType = events.reduce((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {});

    const byPriority = [
      { name: "Critical", value: events.filter(e => e.priority === "Critical").length },
      { name: "High", value: events.filter(e => e.priority === "High").length },
      { name: "Medium", value: events.filter(e => e.priority === "Medium").length },
      { name: "Low", value: events.filter(e => e.priority === "Low").length },
    ].filter(x => x.value > 0);

    const typeData = Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);

    return { completed, missed, overdue, upcoming, cancelled, total, byPriority, typeData };
  }, [events]);

  const statusData = [
    { name: "Upcoming", value: stats.upcoming, color: "#3b82f6" },
    { name: "Completed", value: stats.completed, color: "#22c55e" },
    { name: "Overdue", value: stats.overdue, color: "#ef4444" },
    { name: "Missed", value: stats.missed, color: "#f59e0b" },
    { name: "Cancelled", value: stats.cancelled, color: "#6b7280" },
  ].filter(x => x.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Upcoming", value: stats.upcoming, color: "text-blue-400" },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Overdue", value: stats.overdue, color: "text-red-400" },
          { label: "Missed", value: stats.missed, color: "text-orange-400" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status pie */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h4 className="font-semibold text-foreground mb-4">Events by Status</h4>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>}
        </div>

        {/* Events by type */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h4 className="font-semibold text-foreground mb-4">Top Event Types</h4>
          {stats.typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.typeData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>}
        </div>
      </div>
    </div>
  );
}