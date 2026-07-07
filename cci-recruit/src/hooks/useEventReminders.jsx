import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

const REMINDER_OFFSETS = [60, 30, 15, 5];

export function useEventReminders() {
  const qc = useQueryClient();
  const checkedRef = useRef(new Set());

  const { data: events = [] } = useQuery({
    queryKey: ["event-reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "Upcoming");

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: existingNotifications = [] } = useQuery({
  queryKey: ["event-notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("event_id");

    if (error) throw error;

    return data || [];
  },
  refetchInterval: 60000,
});

  const { data: interviews = [] } = useQuery({
  queryKey: ["interview-reminders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("status", "Scheduled");

    if (error) throw error;

    return data || [];
  },
  refetchInterval: 60000,
});

  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();

      for (const event of events) {
        if (!event.start_datetime) continue;

        const eventTime = new Date(event.start_datetime);
        const minutesUntil = (eventTime - now) / 60000;

        for (const offset of REMINDER_OFFSETS) {
          const notificationKey = `${event.id}_${offset}`;

          if (checkedRef.current.has(notificationKey)) continue;

          const nextOffset =
            REMINDER_OFFSETS[
              REMINDER_OFFSETS.indexOf(offset) + 1
            ];

          const lowerBound = nextOffset || 0;
          const upperBound = offset;

          if (
            minutesUntil <= upperBound &&
            minutesUntil > lowerBound
          ) {
            const alreadyExists =
              existingNotifications.some(
                (n) => n.event_id === notificationKey
              );

            if (alreadyExists) {
              checkedRef.current.add(notificationKey);
              continue;
            }

            checkedRef.current.add(notificationKey);

            const { error } = await supabase
              .from("notifications")
              .insert([
                {
                  title: `Event Reminder: ${event.title}`,
                  message: `Starting in ~${offset} min • ${format(
                    eventTime,
                    "MMM d, h:mm a"
                  )}`,
                  type: "Event",
                  read: false,
                  link: "/events",
                  event_id: notificationKey,
                  user_id: event.owner_id || event.assigned_to || null,
                  company_id: event.company_id,
                  created_at: new Date().toISOString(),
                },
              ]);

            if (error) {
              console.error("Notification creation failed:", error);
              continue;
            }

            await Promise.all([
              qc.invalidateQueries({
                queryKey: ["notifications"],
              }),
              qc.invalidateQueries({
                queryKey: ["sidebar-notifications"],
              }),
              qc.invalidateQueries({
                queryKey: ["event-notifications"],
              }),
            ]);
          }
        }
      }
    };

    if (events.length) {
      checkReminders();
    }
  }, [events, existingNotifications, qc]);

  useEffect(() => {
  const checkInterviewReminders = async () => {
    const now = new Date();

    for (const interview of interviews) {
      if (!interview.interview_date) continue;

      const offset = interview.reminder_minutes || 0;

      if (offset === 0) continue;

      const interviewTime = new Date(
        `${interview.interview_date}T${interview.interview_time || "00:00"}`
      );

      const minutesUntil =
        (interviewTime - now) / 60000;

      const notificationKey = `interview_${interview.id}_${offset}`;

      if (checkedRef.current.has(notificationKey))
        continue;

      if (
        minutesUntil <= offset &&
        minutesUntil > 0
      ) {
        const alreadyExists =
          existingNotifications.some(
            (n) => n.event_id === notificationKey
          );

        if (alreadyExists) {
          checkedRef.current.add(notificationKey);
          continue;
        }

        checkedRef.current.add(notificationKey);

        const { error } = await supabase
          .from("notifications")
          .insert([
            {
              title: `Interview Reminder: ${interview.candidate_name}`,
              message: `Starting in ~${Math.round(
                minutesUntil
              )} min • ${(interview.company_name || "")} ${(interview.position_title || "")}`.trim(),
              type: "Interview",
              read: false,
              link: "/interviews",
              event_id: notificationKey,
              user_id: interview.user_id || null,
              company_id: interview.company_id || null,
              created_at: new Date().toISOString(),
            },
          ]);

        if (!error) {
          await Promise.all([
            qc.invalidateQueries({
              queryKey: ["notifications"],
            }),
            qc.invalidateQueries({
              queryKey: ["sidebar-notifications"],
            }),
          ]);
        }
      }
    }
  };

  if (interviews.length) {
    checkInterviewReminders();
  }
}, [interviews, existingNotifications, qc]);

  return null;
}