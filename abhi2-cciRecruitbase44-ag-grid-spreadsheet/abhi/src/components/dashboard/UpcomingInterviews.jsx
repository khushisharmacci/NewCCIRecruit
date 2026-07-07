import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { format,  differenceInMinutes } from "date-fns";
import { Video, MapPin, Clock, ArrowRight, Calendar } from "lucide-react";

export default function UpcomingInterviews() {
  const { data: interviews = [], isLoading } = useQuery({
  queryKey: ["upcoming-interviews"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("status", "Scheduled")
      .order("interview_date", { ascending: true });

    if (error) throw error;

    return data || [];
  },
  refetchInterval: 60000,
});
  const now = new Date();
  const upcoming = interviews
    .filter(i => i.interview_date)
    .map(i => {
      const dt = i.interview_time
  ? new Date(`${i.interview_date}T${i.interview_time}`)
  : new Date(i.interview_date);
      return { ...i, datetime: dt, minutesUntil: differenceInMinutes(dt, now) };
    })
    .filter(i => i.minutesUntil >= 0)
    .sort((a, b) => a.minutesUntil - b.minutesUntil)
    .slice(0, 5);

  const formatRemaining = (mins) => {
    if (mins < 0) return "In progress";
    if (mins < 60) return `in ${mins}m`;
    if (mins < 1440) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `in ${Math.floor(mins / 1440)}d`;
  };

  return (
    <div className="rounded-xl border border-border p-6 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Upcoming Interviews
        </h3>
        <Link to="/interviews" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : upcoming.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No upcoming interviews scheduled</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map(i => {
            const TypeIcon = i.interview_type === "Online" ? Video : MapPin;
            return (
              <Link key={i.id} to="/interviews" className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TypeIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{i.candidate_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{i.company_name} · {i.position_title}</p>
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(i.datetime, "MMM d, h:mm a")} · {formatRemaining(i.minutesUntil)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}