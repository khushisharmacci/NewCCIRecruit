import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3, TrendingUp, Users, Building2 } from "lucide-react";

const COLORS = ["hsl(224,76%,48%)", "hsl(160,60%,45%)", "hsl(38,92%,50%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)"];

export default function Analytics() {
  const { companyId } = useTenant();
  const { data: candidates = [] } = useQuery({
  queryKey: ["candidates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});
  const { data: interviews = [] } = useQuery({
  queryKey: ["interviews"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interviews")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});
  const { data: clients = [] } = useQuery({
  queryKey: ["clients"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});

  const statusCounts = candidates.reduce((acc, c) => {acc[c.status] = (acc[c.status] || 0) + 1;return acc;}, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const sourceCounts = candidates.reduce((acc, c) => {const s = c.source || "Other";acc[s] = (acc[s] || 0) + 1;return acc;}, {});
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  const interviewTypes = interviews.reduce((acc, i) => {acc[i.interview_type || "Other"] = (acc[i.interview_type || "Other"] || 0) + 1;return acc;}, {});
  const interviewData = Object.entries(interviewTypes).map(([name, count]) => ({ name, count }));

  const total = candidates.length || 1;
  const interviewRate = Math.round((statusCounts["Interview Scheduled"] || 0) / total * 100);
  const joinRate = Math.round((statusCounts["Joined"] || 0) / total * 100);
  const offerRate = Math.round((statusCounts["Offer Released"] || 0) / total * 100);
  const closureRate = Math.round(((statusCounts["Joined"] || 0) + (statusCounts["Selected"] || 0)) / total * 100);

  const metrics = [
  { label: "Interview Rate", value: `${interviewRate}%`, icon: Users, color: "text-blue-400 bg-blue-500/20" },
  { label: "Joining Rate", value: `${joinRate}%`, icon: TrendingUp, color: "text-emerald-400 bg-emerald-500/20" },
  { label: "Offer Rate", value: `${offerRate}%`, icon: BarChart3, color: "text-amber-400 bg-amber-500/20" },
  { label: "Closure Rate", value: `${closureRate}%`, icon: Building2, color: "text-violet-400 bg-violet-500/20" }];


  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm">Track performance, hiring trends, and pipeline health</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) =>
        <div key={m.label} className="bg-card rounded-xl border border-border p-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${m.color}`}>
              <m.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Candidate Status Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2} dataKey="value">
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Candidates by Source</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Interview Types Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={interviewData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>);

}