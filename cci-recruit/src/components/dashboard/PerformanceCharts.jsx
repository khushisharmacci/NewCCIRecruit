import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";

const COLORS = ["hsl(224,76%,48%)", "hsl(160,60%,45%)", "hsl(38,92%,50%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)"];

export default function PerformanceCharts() {
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

  // Build last 6 months from real data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const monthStr = format(d, "MMM");
    const monthStart = startOfMonth(d).getTime();
    const nextMonthStart = startOfMonth(addMonths(d, 1)).getTime();
    const placements = candidates.filter((c) => {
      const t = c.created_at ? new Date(c.created_at).getTime() : 0;
      return t >= monthStart && t < nextMonthStart && c.status === "Joined";
    }).length;
    const ivs = interviews.filter((c) => {
      const t = c.created_at ? new Date(c.created_at).getTime() : 0;
      return t >= monthStart && t < nextMonthStart;
    }).length;
    return { month: monthStr, placements, interviews: ivs };
  });

  const pipelineData = [
  { name: "Applied", value: candidates.filter((c) => c.status === "Applied").length },
  { name: "Screening", value: candidates.filter((c) => c.status === "Screening").length },
  { name: "Interview", value: candidates.filter((c) => c.status === "Interview Scheduled").length },
  { name: "Selected", value: candidates.filter((c) => c.status === "Selected" || c.status === "Offer Released").length },
  { name: "Joined", value: candidates.filter((c) => c.status === "Joined").length }];

  const filteredPipeline = pipelineData.filter((d) => d.value > 0);
  const displayPipeline = filteredPipeline.length > 0 ? filteredPipeline : [{ name: "No data yet", value: 1 }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Monthly Placements & Interviews</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220,13%,91%)' }} />
            <Area type="monotone" dataKey="placements" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorPlacements)" strokeWidth={2} />
            <Area type="monotone" dataKey="interviews" stroke={COLORS[1]} fillOpacity={0.1} fill={COLORS[1]} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border p-6 bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Candidate Pipeline</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={displayPipeline} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
              {displayPipeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220,13%,91%)' }} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>);

}