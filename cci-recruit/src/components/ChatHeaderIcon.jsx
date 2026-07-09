import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

export default function ChatHeaderIcon() {
  const { user } = useAuth();

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages-header"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat-conversations-header"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
    enabled: !!user,
  });

  const myConvIds = conversations
    .filter((c) => {
      try {
        return (c.members || []).includes(user?.id);
      } catch {
        return false;
      }
    })
    .map((c) => c.id);

  const unread = messages.filter((m) => {
    if (!myConvIds.includes(m.conversation_id)) return false;
    if (m.sender_id === user?.id) return false;

    try {
      const readByArray = typeof m.read_by === "string" 
        ? JSON.parse(m.read_by || "[]") 
        : (m.read_by || []);
      return !readByArray.includes(user?.id);
    } catch {
      return true;
    }
  }).length;

  return (
    <Link
      to="/chat"
      className="relative text-muted-foreground hover:text-foreground transition-colors"
    >
      <MessageSquare className="h-5 w-5" />

      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}