import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/tenant";
import KPICards from "../components/dashboard/KPICards";
import RecruitmentFunnel from "../components/dashboard/RecruitmentFunnel";
import PerformanceCharts from "../components/dashboard/PerformanceCharts";
import UpcomingEventsWidget from "../components/events/UpcomingEventsWidget";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import DailyReportStatus from "../components/dashboard/DailyReportStatus";
import UpcomingInterviews from "../components/dashboard/UpcomingInterviews";
import { Button } from "@/components/ui/button";
const HERO_IMG = "banner2.jpeg";

export default function Dashboard() {
  const { user } = useAuth();
  useTenant();

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates", user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*");

      if (error) throw error;

      return data || [];
    },
  });
  
  const { data: positions = [] } = useQuery({
  queryKey: ["positions", user?.company_id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});
  const { data: interviews = [] } = useQuery({
  queryKey: ["interviews", user?.company_id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interviews")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});
  const { data: revenue = [] } = useQuery({
  queryKey: ["revenue", user?.company_id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("revenue_records")
      .select("*");

    if (error) throw error;

    return data || [];
  },
});

  const statusCount = (arr, field, val) => arr.filter((a) => a[field] === val).length;
  const totalRevenue = revenue.reduce((s, r) => s + (r.amount || 0), 0);
  const activePositions = positions.filter((p) => p.status === "Open" || p.status === "In Progress").length;
  const scheduledInterviews = interviews.filter((i) => i.status === "Scheduled").length;

  const kpiData = {
    totalCandidates: candidates.length,
    activePositions,
    scheduledInterviews,
    offersReleased: statusCount(candidates, "status", "Offer Released"),
    joinedCandidates: statusCount(candidates, "status", "Joined"),
    revenue: totalRevenue,
    openRequirements: positions.filter((p) => p.status === "Open").length,
    productivity: candidates.length > 0 ? Math.round(statusCount(candidates, "status", "Joined") / candidates.length * 100) : 0
  };

  const funnelData = {
    applied: statusCount(candidates, "status", "Applied"),
    screening: statusCount(candidates, "status", "Screening"),
    shortlisted: statusCount(candidates, "status", "Shortlisted"),
    interviewed: statusCount(candidates, "status", "Interview Scheduled"),
    selected: statusCount(candidates, "status", "Selected") + statusCount(candidates, "status", "Offer Released"),
    joined: statusCount(candidates, "status", "Joined")
  };
console.log("ALL interviews:", interviews);
  const upcomingInterviews = interviews.
  filter((i) => i.status === "Scheduled").
  sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date)).
  slice(0, 5);
const formatInterviewDate = (interview) => {
  if (!interview?.interview_date) return "TBD";

  const date = new Date(interview.interview_date);

  // Use the stored time instead of the timestamp's time component
  if (interview.interview_time) {
    const [hours, minutes] = interview.interview_time.split(":");

    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));
    date.setSeconds(0);
  }

  return format(date, "MMM d, h:mm a");
};
upcomingInterviews.forEach((i) => {
  console.log({
    id: i.id,
    interview_date: i.interview_date,
    interview_time: i.interview_time,
    scheduled_at: i.scheduled_at,
    interview_datetime: i.interview_datetime,
    created_at: i.created_at,
  });
});
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/90 to-primary h-40 md:h-48">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--background))]">
            Welcome back, {user?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-xs md:text-sm font-semibold tracking-widest uppercase mt-1 text-[hsl(var(--chart-5))]">RECRUIT SMARTER.</p>
          <p className="mt-1 text-sm md:text-base text-[hsl(var(--background))]">Here's what's happening with your recruitment pipeline today.

          </p>
          <div className="flex gap-3 mt-4">
            <Link to="/candidates" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg backdrop-blur transition-colors">
              View Pipeline <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <KPICards data={kpiData} />

<DailyReportStatus />

<div className="w-full">

  <div className="rounded-xl border border-border bg-card p-6">
  <div className="flex items-center justify-between mb-5">
    <h3 className="text-lg font-semibold flex items-center gap-2">
      <Calendar className="h-5 w-5 text-primary" />
      Upcoming Interviews
    </h3>

    <Link to="/interviews">
  <Button variant="outline" size="sm">
    View All →
  </Button>
</Link>
  </div>

  {upcomingInterviews.length === 0 ? (
    <p className="text-muted-foreground text-center py-8">
      No upcoming interviews scheduled
    </p>
  ) : (
    <div className="space-y-3">
      {upcomingInterviews.map((i) => (
        <div
          key={i.id}
          className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>

            <div>
              <p className="font-medium">{i.candidate_name}</p>
              <p className="text-sm text-muted-foreground">
                {i.position_title}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-medium">
              {formatInterviewDate(i)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
</div>

      <PerformanceCharts />

      <UpcomingEventsWidget />
    </div>);

}