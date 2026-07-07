import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";;
import { parseISO, isToday, isTomorrow, isThisWeek, isPast, addDays, startOfDay, endOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "./EventCard";

const FILTERS = ["Today", "Tomorrow", "This Week", "Overdue"];

export default function UpcomingEventsWidget() {
  const [filter, setFilter] = useState("Today");

  const { data: events = [] } = useQuery({
  queryKey: ["events-widget"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "Upcoming")
      .order("start_datetime", { ascending: true });

    if (error) throw error;

    return data || [];
  },
});

  const filtered = events.filter(e => {
    try {
      const d = parseISO(e.start_datetime);
      if (filter === "Today") return isToday(d);
      if (filter === "Tomorrow") return isTomorrow(d);
      if (filter === "This Week") return isThisWeek(d);
      if (filter === "Overdue") return isPast(d) && e.status === "Upcoming";
    } catch { return false; }
  }).slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Upcoming Events</h3>
        </div>
        <Link to="/events">
          <Button variant="ghost" size="sm" className="text-xs gap-1">
            View All <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No {filter.toLowerCase()} events
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => <EventCard key={e.id} event={e} compact onEdit={() => {}} onDelete={() => {}} />)}
        </div>
      )}
    </div>
  );
}