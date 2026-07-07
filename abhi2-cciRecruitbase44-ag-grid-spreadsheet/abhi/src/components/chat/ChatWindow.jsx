import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Send, Paperclip, Users, Info, Smile, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageBubble from "./MessageBubble";
import GroupInfoPanel from "./GroupInfoPanel";
import { getConversationName, getConversationInitials, getGroupColor } from "./chatUtils";

const EMOJIS = ["👍", "😊", "🎉", "✅", "🔥", "👏", "😂", "❤️", "🤔", "👀"];

export default function ChatWindow({ conversation, messages, currentUser, allUsers }) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const qc = useQueryClient();

  // Sort oldest → newest for display
  const convMessages = (messages ?? [])
  .filter(
    (m) =>
      m.conversation_id === conversation?.id &&
      !m.is_deleted
  )
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    console.log(
  "LAST MESSAGE",
  convMessages[convMessages.length - 1]
);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setHasNewMessages(false);
  }, []);

  const checkIfNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // Initial load: jump to bottom instantly
  useEffect(() => {
    scrollToBottom("instant");
    prevMessageCountRef.current = convMessages.length;
  }, [conversation.id]);

  // New messages arrive
  useEffect(() => {
    const newCount = convMessages.length;
    const prevCount = prevMessageCountRef.current;
    if (newCount <= prevCount) { prevMessageCountRef.current = newCount; return; }

    const latestMsg = convMessages[newCount - 1];
    const isOwnMessage = latestMsg?.sender_id === currentUser.id;

    if (isOwnMessage || isNearBottomRef.current) {
      scrollToBottom("smooth");
    } else {
      setHasNewMessages(true);
    }
    prevMessageCountRef.current = newCount;
  }, [convMessages.length]);

  // Mark messages as read
  useEffect(() => {
    const unread = convMessages.filter(m => {
      if (m.sender_id === currentUser.id) return false;
      try { return !JSON.parse(m.read_by || "[]").includes(currentUser.id); } catch { return true; }
    });
    unread.forEach(m => {
      const readBy = (() => { try { return JSON.parse(m.read_by || "[]"); } catch { return []; } })();
      if (!readBy.includes(currentUser.id)) {
        supabase
  .from("chat_messages")
  .update({
  read_by: JSON.stringify([
    ...readBy,
    currentUser.id,
  ]),
})
  .eq("id", m.id);
      }
    });
    if (unread.length > 0) {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["chat-messages"] }), 500);
    }
  }, [convMessages.length, conversation.id]);

  useEffect(() => {
  const channel = supabase
    .channel("chat_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
      },
      () => {
        qc.invalidateQueries({
          queryKey: ["chat-messages"],
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  const sendMutation = useMutation({
  mutationFn: async (msg) => {
    console.log("MESSAGE TO INSERT", msg);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert([msg])
      .select();

    console.log("INSERT DATA", data);
    console.log("INSERT ERROR", error);

    if (error) throw error;

    return data[0];
  },

  onSuccess: async (newMsg) => {
    qc.invalidateQueries({
      queryKey: ["chat-messages"],
    });

    const { data, error } = await supabase
      .from("chat_conversations")
      .update({
        last_message:
          newMsg.message ||
          (newMsg.file_name
            ? `📎 ${newMsg.file_name}`
            : ""),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation.id)
      .select();

    console.log("UPDATE CONVERSATION DATA", data);
    console.log("UPDATE CONVERSATION ERROR", error);

    qc.invalidateQueries({
      queryKey: ["chat-conversations"],
    });

    try {
      const members = JSON.parse(
        conversation.members || "[]"
      );

      const otherMembers = members.filter(
        (id) => id !== currentUser.id
      );

      const preview =
        newMsg.message ||
        (newMsg.file_name
          ? `📎 ${newMsg.file_name}`
          : "Sent a file");

      for (const memberId of otherMembers) {
        const { error } = await supabase
          .from("notifications")
          .insert([
            {
              company_id: conversation.company_id,
              user_id: memberId,
              title: `New message from ${currentUser.full_name}`,
              message: preview.slice(0, 100),
              type: "Chat",
              read: false,
              sender_name: currentUser.full_name,
              created_at: new Date().toISOString(),
            },
          ]);

        if (error) {
          console.error("Notification insert error:", error);
        }
      }

      qc.invalidateQueries({
        queryKey: ["notifications"],
      });
    } catch (e) {
      console.error("Notification error", e);
    }
  },

  onError: (error) => {
    console.error("SEND MESSAGE FAILED", error);
  },
});


  const updateConvMutation = useMutation({
    mutationFn: async (data) => {
  const { error } = await supabase
    .from("chat_conversations")
    .update(data)
    .eq("id", conversation.id);

  if (error) throw error;
},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-conversations"] }),
  });

  const handleSend = () => {
  const text = input.trim();

  if (!text) return;

  setInput("");
  setShowEmoji(false);

  sendMutation.mutate({
    conversation_id: conversation.id,
    sender_id: currentUser.id,
    sender_name: currentUser.full_name,
    message: text,
    read_by: JSON.stringify([currentUser.id]),
  });
};

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "@") {
      setMentionQuery("");
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0 && atIdx === val.length - 1) setMentionQuery("");
    else if (atIdx >= 0 && !val.slice(atIdx + 1).includes(" ")) setMentionQuery(val.slice(atIdx + 1));
    else setMentionQuery(null);
  };

  const insertMention = (name) => {
    const atIdx = input.lastIndexOf("@");
    setInput(input.slice(0, atIdx) + `@${name} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  console.log("SELECTED FILE:", file);

  setUploading(true);

  try {
    const fileName = `${Date.now()}-${file.name}`;

    console.log("UPLOADING TO STORAGE:", fileName);

    const { data: uploadData, error: uploadError } =
      await supabase.storage
        .from("chat-files")
        .upload(fileName, file, {
          upsert: false,
        });

    console.log("UPLOAD DATA:", uploadData);
    console.log("UPLOAD ERROR:", uploadError);

    if (uploadError) {
      console.error("STORAGE UPLOAD FAILED:", uploadError);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("chat-files")
      .getPublicUrl(fileName);

    console.log("PUBLIC URL:", publicUrl);

    const isImg = file.type.startsWith("image/");

    const message = {
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      message: "",
      message_type: isImg ? "image" : "file",
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
      attachment_url: publicUrl,
      attachment_name: file.name,
      read_by: JSON.stringify([currentUser.id]),
    };

    console.log("MESSAGE OBJECT:", message);

    sendMutation.mutate(message);
  } catch (err) {
    console.error("HANDLE FILE UPLOAD ERROR:", err);
  } finally {
    setUploading(false);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }
};

  const name = getConversationName(conversation, currentUser.id);
  const initials = getConversationInitials(conversation, currentUser.id);
  const colorClass = conversation.type === "group" ? getGroupColor(conversation.id) : "bg-primary";

  let memberCount = 0;
  try { memberCount = JSON.parse(conversation.members || "[]").length; } catch {}

  const mentionableUsers = allUsers.filter(u =>
    u.id !== currentUser.id && (!mentionQuery || u.full_name?.toLowerCase().startsWith(mentionQuery.toLowerCase()))
  );

  // Group messages by day
  const groupedMessages = [];
  let lastDate = null;
  convMessages.forEach(m => {
    const d = m.created_at ? new Date(m.created_at).toDateString() : "Unknown";
    if (d !== lastDate) { groupedMessages.push({ type: "date", date: d }); lastDate = d; }
    groupedMessages.push({ type: "message", message: m });
  });

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Header */}
      <div className="h-16 bg-card border-b border-border px-6 flex items-center gap-4 shrink-0">
        <div className={`h-11 w-11 rounded-full ${colorClass} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
          {conversation.type === "group" ? <Users className="h-4 w-4" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">{name}</h3>
          <p className="text-xs text-muted-foreground">
            {conversation.type === "group" ? `${memberCount} members` : "Direct Message"}
          </p>
        </div>
        {conversation.type === "group" && (
          <Button variant="ghost" size="icon" onClick={() => setShowInfo(!showInfo)}>
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Messages area */}
        <div
  ref={scrollContainerRef}
  onScroll={() => {
    isNearBottomRef.current = checkIfNearBottom();
  }}
  className="flex-1 overflow-y-auto bg-[#0f172a]"
>
  <div className="w-full h-full px-8 py-6 flex flex-col">
          {groupedMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className={`h-16 w-16 rounded-full ${colorClass} flex items-center justify-center text-2xl text-white font-bold mb-3`}>
                {conversation.type === "group" ? <Users className="h-8 w-8" /> : initials}
              </div>
              <p className="font-medium text-foreground">{name}</p>
              <p className="text-base text-muted-foreground mt-2">Start the conversation!</p>
            </div>
          )}
          {groupedMessages.map((item, i) => {
            if (item.type === "date") {
              return (
                <div key={`date-${i}`} className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground px-2 bg-background">{item.date === new Date().toDateString() ? "Today" : item.date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }
            const m = item.message;
            const isOwn = m.sender_id === currentUser.id;
            const prev = groupedMessages[i - 1];
            const showAvatar = !prev || prev.type === "date" || prev.message?.sender_id !== m.sender_id;
            return (
              <MessageBubble
  key={m.id}
  message={m}
  isOwn={isOwn}
  showAvatar={showAvatar}
  senderName={m.sender_name}
/>
            );
          })}
          </div>
<div ref={bottomRef} />
        </div>

        {/* New messages indicator */}
        {hasNewMessages && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-10 animate-bounce"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            New Messages
          </button>
        )}

        {/* Group info panel */}
        {showInfo && conversation.type === "group" && (
          <GroupInfoPanel
            conversation={conversation}
            currentUser={currentUser}
            onClose={() => setShowInfo(false)}
            onUpdate={(data) => updateConvMutation.mutate(data)}
          />
        )}
      </div>

      {/* Mention suggestions */}
      {mentionQuery !== null && mentionableUsers.length > 0 && (
        <div className="mx-4 mb-1 bg-card border border-border rounded-lg shadow-lg max-h-32 overflow-y-auto">
          {mentionableUsers.slice(0, 5).map(u => (
            <button key={u.id} onClick={() => insertMention(u.full_name?.split(" ")[0])}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {u.full_name?.charAt(0)}
              </div>
              {u.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="mx-4 mb-1 bg-card border border-border rounded-lg p-2 flex flex-wrap gap-1">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => { setInput(i => i + e); setShowEmoji(false); inputRef.current?.focus(); }}
              className="text-xl hover:bg-muted rounded p-1 transition-colors">{e}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3 rounded-full bg-muted px-5 py-3 shadow-sm">
          <button onClick={() => { setShowEmoji(!showEmoji); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <Smile className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${name}... (@ to mention)`}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx" className="hidden" onChange={handleFileUpload} />
          <button onClick={handleSend} disabled={!input.trim()}
            className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}