import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

import {
  Bell,
  Check,
  Calendar,
  UserCheck,
  Handshake,
  Target,
  Mail,
  MessageSquare,
  Clock,
  Trash2,
} from "lucide-react";

const playNotificationSound = () => {
  const audio = new Audio("/notification.mp3");
  audio.play().catch(() => {});
};


const typeIcons = {
  Interview: Calendar,
  "Follow-up": UserCheck,
  Offer: Mail,
  Target: Target,
  Lead: Handshake,
  Event: Clock,
  Chat: MessageSquare,
  General: Bell,
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "Event", label: "Events" },
  { key: "Chat", label: "Chat" },
];


export default function Notifications() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const queryClient = useQueryClient();
  const previousCount = useRef(0);
  const { data: notifications = [], isLoading } = useQuery({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { data, error } = await
      supabase
.from("notifications")
.select("*")
.eq("user_id", user.id)
.order("created_at", {
    ascending:false
});

    console.log("Notifications:", data);

    if (error) throw error;

    return data || [];
  },
});

const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () =>
    queryClient.invalidateQueries({
      queryKey: ["notifications"],
    }),
});

  const markRead = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] }),
});

  const markAllRead = useMutation({
  mutationFn: async () => {
    const unreadIds = notifications
      .filter((n) => !n.read)
      .map((n) => n.id);

    if (unreadIds.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);

      if (error) throw error;
    }
  },
  onSuccess: () =>
    queryClient.invalidateQueries({
      queryKey: ["notifications"],
    }),
});

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = notifications.filter((n) => {
  if (activeFilter === "all") return true;
  if (activeFilter === "unread") return !n.read;
  if (activeFilter === "read") return n.read;
  return n.type === activeFilter;
});

useEffect(() => {
  const channel = supabase
    .channel("notifications")

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      (payload) => {

        queryClient.invalidateQueries({
          queryKey: ["notifications"],
        });

        playNotificationSound();

        if (Notification.permission === "granted") {

          new Notification(payload.new.title, {
            body: payload.new.message,
            icon: "/logo.png",
          });

        }

      }
    )

    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };

}, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 &&
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} className="gap-2">
            <Check className="h-4 w-4" /> Mark all read
          </Button>
        }
      </div>

      <div className="flex gap-2 flex-wrap">
  {filterTabs.map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveFilter(tab.key)}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        activeFilter === tab.key
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>

            {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          You are all caught up — no notifications
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = typeIcons[n.type] || Bell;

            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer group",
                  n.read
                    ? "bg-card border-border"
                    : "bg-primary/5 border-primary/20"
                )}
                onClick={() => !n.read && markRead.mutate(n.id)}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    n.read ? "bg-muted" : "bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      n.read ? "text-muted-foreground" : "text-primary"
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      n.read
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {n.title}
                  </p>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.message}
                  </p>

                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {n.created_at
                      ? format(
                          new Date(n.created_at),
                          "MMM d, h:mm a"
                        )
                      : ""}
                  </p>
                </div>

                {!n.read && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}