import { format, parseISO, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Clock, MapPin, User } from "lucide-react";
import { PRIORITY_COLORS, STATUS_COLORS, EVENT_TYPE_ICONS } from "./eventUtils";

export default function EventCard({ event, onEdit, onDelete, compact = false }) {
  const isOverdue = event.status === "Upcoming" && isPast(parseISO(event.start_datetime));
  const priorityStyle = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.Medium;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 bg-card hover:shadow-sm transition-shadow ${priorityStyle.border}`}>
        <span className="text-lg">{EVENT_TYPE_ICONS[event.event_type] || "📅"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground">{format(parseISO(event.start_datetime), "MMM d, h:mm a")}</p>
        </div>
        <Badge className={`text-xs shrink-0 ${isOverdue ? "bg-red-500/15 text-red-300" : STATUS_COLORS[event.status] || ""}`}>
          {isOverdue ? "Overdue" : event.status}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow border-l-4 ${priorityStyle.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl mt-0.5">{EVENT_TYPE_ICONS[event.event_type] || "📅"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{event.title}</h3>
              <Badge className={`text-xs ${priorityStyle.badge}`}>{event.priority}</Badge>
              <Badge className={`text-xs ${isOverdue ? "bg-red-500/15 text-red-300" : STATUS_COLORS[event.status] || ""}`}>
                {isOverdue ? "⚠ Overdue" : event.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{event.event_type}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(event.start_datetime), "MMM d, yyyy · h:mm a")}
              </span>
              {event.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
              )}
              {event.assigned_to && (
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{event.assigned_to}</span>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(event)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(event)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}