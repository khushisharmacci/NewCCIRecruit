import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseISO, isPast, isToday, isTomorrow, isThisWeek, format } from "date-fns";
import {
  Plus,
  Calendar,
  List,
  BarChart2,
  Search,
  Filter,
  AlertTriangle,
  Info,
} from "lucide-react";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EventForm from "@/components/events/EventForm";
import QuickAddButton from "@/components/events/QuickAddButton";
import EventCard from "@/components/events/EventCard";
import EventCalendar from "@/components/events/EventCalendar";
import EventAnalytics from "@/components/events/EventAnalytics";

const VIEWS = ["List", "Calendar", "Analytics"];
const PRIORITY_FILTERS = ["All", "Critical", "High", "Medium", "Low"];
const STATUS_FILTERS = ["All", "Upcoming", "Overdue", "Completed", "Missed", "Cancelled"];
const DATE_FILTERS = ["All Time", "Today", "Tomorrow", "This Week", "Overdue"];

export default function EventCenter() {
  // tenant migration pending
  const qc = useQueryClient();

  const [view, setView] = useState("List");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [typeFilter, setTypeFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

const { data: events = [], isLoading } = useQuery({
  queryKey: ["events", "supabase"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_datetime", { ascending: false });

    if (error) throw error;

    return data || [];
  },
});

  const createMutation = useMutation({
  mutationFn: async (data) => {
    console.log("INSERTING EVENT", data);

    const { error } = await supabase
      .from("events")
      .insert([data]);

    console.log("INSERT ERROR", error);

    if (error) throw error;
  },
  onSuccess: () => {
    console.log("EVENT CREATED");
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["events-widget"] });
    setFormOpen(false);
  },
});

const updateMutation = useMutation({
  mutationFn: async ({ id, data }) => {
    const { error } = await supabase
      .from("events")
      .update(data)
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["events-widget"] });
    setFormOpen(false);
    setEditEvent(null);
  },
});

const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["events-widget"] });
    setDeleteTarget(null);
  },
});

  const handleSave = (data) => {
    if (editEvent) updateMutation.mutate({ id: editEvent.id, data });else
    createMutation.mutate(data);
  };

  const handleEdit = (event) => {setEditEvent(event);setFormOpen(true);};
  const handleNew = () => {setEditEvent(null);setFormOpen(true);};

  // Overdue detection
  const overdueCount = events.filter((e) => {
  if (!e.start_datetime) return false;

  return (
    e.status === "Upcoming" &&
    isPast(parseISO(e.start_datetime))
  );
}).length;

  const filtered = events.filter((e) => {
  // Interviews are managed from the Interviews page
  if (e.event_type === "Interview") return false;
    if (search && !e.title?.toLowerCase().includes(search.toLowerCase()) && !e.event_type?.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== "All" && e.priority !== priorityFilter) return false;
    if (typeFilter !== "All" && e.event_type !== typeFilter) return false;

    const isOverdue = e.status === "Upcoming" && isPast(parseISO(e.start_datetime));
    if (statusFilter === "Overdue") return isOverdue;
    if (statusFilter !== "All" && e.status !== statusFilter) return false;

    try {
      const d = parseISO(e.start_datetime);
      if (dateFilter === "Today") return isToday(d);
      if (dateFilter === "Tomorrow") return isTomorrow(d);
      if (dateFilter === "This Week") return isThisWeek(d);
      if (dateFilter === "Overdue") return isOverdue;
    } catch {}
    return true;
  });

  const eventTypes = ["All", ...Array.from(new Set(events.map((e) => e.event_type).filter(Boolean)))];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Center</h1>
          <p className="text-sm text-muted-foreground">Never miss an interview, meeting, follow-up, or deadline</p>
        </div>
        <Button onClick={handleNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 &&
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">{overdueCount} overdue event{overdueCount > 1 ? "s" : ""}</span>
            <span className="text-sm ml-2">— These events are past their scheduled time and require immediate attention.</span>
          </div>
          <button onClick={() => {setStatusFilter("Overdue");setDateFilter("All Time");}} className="ml-auto text-xs underline shrink-0">View all</button>
        </div>
      }
      {events.some((e) => e.event_type === "Interview") && (
  <Link
    to="/interviews"
    className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15 transition-colors"
  >
    <Info className="h-5 w-5 shrink-0" />

    <div>
      <span className="font-semibold">
        Interview scheduling has moved
      </span>

      <span className="text-sm ml-2">
        — All interviews are now managed in the dedicated Interviews page.
        Click to go there.
      </span>
    </div>
  </Link>
)}

      {/* View tabs */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        {VIEWS.map((v) =>
        <button
          key={v}
          onClick={() => setView(v)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          
            {v === "List" && <List className="h-4 w-4" />}
            {v === "Calendar" && <Calendar className="h-4 w-4" />}
            {v === "Analytics" && <BarChart2 className="h-4 w-4" />}
            {v}
          </button>
        )}
      </div>

      {view === "Analytics" && <EventAnalytics events={events} />}

      {view === "Calendar" &&
      <EventCalendar
        events={events}
        onDateClick={(d) => {}}
        onEventClick={handleEdit} />

      }

      {view === "List" &&
      <>
          {/* Filters */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{DATE_FILTERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>{PRIORITY_FILTERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>{STATUS_FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Event Type" /></SelectTrigger>
                <SelectContent>{eventTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>{filtered.length} event{filtered.length !== 1 ? "s" : ""} found</span>
              {(search || priorityFilter !== "All" || statusFilter !== "All" || dateFilter !== "All Time" || typeFilter !== "All") &&
            <button onClick={() => {setSearch("");setPriorityFilter("All");setStatusFilter("All");setDateFilter("All Time");setTypeFilter("All");}} className="text-primary hover:underline">Clear filters</button>
            }
            </div>
          </div>

          {/* Event list */}
          {isLoading ?
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div> :
        filtered.length === 0 ?
        <div className="text-center py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No events found</p>
              <p className="text-sm mt-1">Create your first event to get started</p>
              <Button onClick={handleNew} className="mt-4 gap-2"><Plus className="h-4 w-4" />New Event</Button>
            </div> :

        <div className="space-y-3">
              {filtered.map((e) =>
          <EventCard
            key={e.id}
            event={e}
            onEdit={handleEdit}
            onDelete={setDeleteTarget} />

          )}
            </div>
        }
        </>
      }

      <EventForm
        open={formOpen}
        onOpenChange={(v) => {setFormOpen(v);if (!v) setEditEvent(null);}}
        event={editEvent}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending} />
      

      <QuickAddButton />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteTarget?.title}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}