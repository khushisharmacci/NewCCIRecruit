import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare } from "lucide-react";

import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import NewConversationDialog from "@/components/chat/NewConversationDialog";

export default function TeamChat() {
  const { user, isLoadingAuth } = useAuth();

  const queryClient = useQueryClient();
  const companyId = user.company_id;

  const [selectedConv, setSelectedConv] = useState(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  // ---------------- USERS ----------------

  const { data: allUsers = [] } = useQuery({
  queryKey: ["users-chat"],
  enabled: !!user,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("recruiters")
      .select("*")
      .order("full_name");

    console.log("RECRUITERS DATA", data);
    console.log("RECRUITERS ERROR", error);

    if (error) throw error;

    return data ?? [];
  },
});

  // ---------------- CONVERSATIONS ----------------

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat-conversations", companyId],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // ---------------- MESSAGES ----------------

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", companyId],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
.select("*")
.eq("conversation_id", selectedConv.id)
.order("created_at")

      if (error) throw error;
      return data || [];
    },
  });

  // ---------------- FILTER CONVERSATIONS ----------------

  const myConversations = conversations.filter((c) => {
    try {
      return JSON.parse(c.members || "[]").includes(user?.id);
    } catch {
      return false;
    }
  });

  // ---------------- KEEP SELECTED UPDATED ----------------

  useEffect(() => {
    if (!selectedConv) return;

    const latest = myConversations.find(
      (c) => c.id === selectedConv.id
    );

    if (latest) setSelectedConv(latest);
  }, [myConversations, selectedConv]);

  // ---------------- UNREAD COUNTS ----------------

  const unreadCounts = {};

  myConversations.forEach((conv) => {
    unreadCounts[conv.id] = messages.filter((m) => {
      if (m.conversation_id !== conv.id) return false;
      if (m.sender_id === user?.id) return false;

      try {
        return !JSON.parse(m.read_by || "[]").includes(user?.id);
      } catch {
        return true;
      }
    }).length;
  });

  // ---------------- CREATE CONVERSATION ----------------

  const createMutation = useMutation({
  mutationFn: async (conversation) => {
    console.log("SENDING CONVERSATION", conversation);

    const result = await supabase
      .from("chat_conversations")
      .insert([conversation])
      .select()
      .single();

    console.log("SUPABASE RESULT", result);

    if (result.error) {
      throw result.error;
    }

    return result.data;
  },

  onSuccess: (conversation) => {
    console.log("SUCCESS", conversation);

    queryClient.invalidateQueries({
      queryKey: ["chat-conversations"],
    });

    setSelectedConv(conversation);
  },

  onError: (error) => {
    console.error("CREATE CONVERSATION FAILED", error);
  },
});

  const handleNewConversation = ({
    type,
    member,
    name,
    description,
    members,
  }) => {
    if (type === "direct") {
      const existing = myConversations.find((c) => {
        if (c.type !== "direct") return false;

        try {
          const ids = JSON.parse(c.members || "[]");
          return (
            ids.includes(user.id) &&
            ids.includes(member.id)
          );
        } catch {
          return false;
        }
      });

      if (existing) {
        setSelectedConv(existing);
        return;
      }

      createMutation.mutate({
    company_id: user.company_id,
    created_by: user.id,

    type: "direct",

    members: JSON.stringify([
        user.id,
        member.id,
    ]),

    member_names: JSON.stringify([
        user.full_name,
        member.full_name,
    ]),

    last_message_at: new Date().toISOString(),
});
    } else {
      const everyone = [user, ...members];

      createMutation.mutate({

    company_id: user.company_id,

    created_by: user.id,
        type: "group",
        name,
        description,
        members: JSON.stringify(
          everyone.map((m) => m.id)
        ),
        member_names: JSON.stringify(
          everyone.map((m) => m.full_name)
        ),
        admin_id: user.id,
        admin_name: user.full_name,
        last_message_at: new Date().toISOString(),
      });
    }
  };

  // ---------------- SAFE RETURNS ----------------

  if (isLoadingAuth) {
    return (
      <div className="p-6 text-white">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-red-400">
        No authenticated user.
      </div>
    );
  }

  // ---------------- UI ----------------

  return (
  <div className="flex h-[calc(100vh-56px)] bg-background p-4">

    {/* Main Chat Card */}
    <div className="flex flex-1 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">

      {/* Conversation List */}
      <div className="w-[340px] shrink-0 border-r border-border bg-card">
        <ConversationList
          conversations={myConversations}
          selectedId={selectedConv?.id}
          onSelect={setSelectedConv}
          unreadCounts={unreadCounts}
          currentUser={user}
          onNew={() => setNewDialogOpen(true)}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">

        {selectedConv ? (
          <ChatWindow
            key={selectedConv.id}
            conversation={selectedConv}
            messages={messages}
            currentUser={user}
            allUsers={allUsers}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MessageSquare className="h-12 w-12 text-primary/50" />
              </div>

              <h2 className="text-2xl font-semibold">
                Welcome to Team Chat
              </h2>

              <p className="text-muted-foreground mt-2">
                Select a conversation to start messaging.
              </p>

              <button
                onClick={() => setNewDialogOpen(true)}
                className="mt-6 px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition"
              >
                New Conversation
              </button>

            </div>

          </div>
        )}

      </div>

    </div>

    <NewConversationDialog
      open={newDialogOpen}
      onOpenChange={setNewDialogOpen}
      users={allUsers}
      currentUser={user}
      onCreate={handleNewConversation}
    />

  </div>
);
}