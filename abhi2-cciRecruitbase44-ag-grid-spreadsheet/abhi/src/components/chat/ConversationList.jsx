import { useState } from "react";
import { Search, Plus, Users, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getConversationName, getConversationInitials, getGroupColor, formatMessageTime } from "./chatUtils";

export default function ConversationList({ conversations, selectedId, onSelect, unreadCounts, currentUser, onNew }) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(c => {
  const name = getConversationName(c, currentUser?.id || "").toLowerCase();
  return name.includes(search.toLowerCase());
});

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-lg">Team Chat</h2>
          <Button size="icon" variant="ghost" onClick={onNew} title="New Conversation">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search teammates..."
    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
/>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4 text-muted-foreground text-sm">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No conversations yet</p>
            <button onClick={onNew} className="text-primary text-xs hover:underline mt-1">Start one</button>
          </div>
        ) : (
          filtered.map(conv => {
            const name = getConversationName(conv, currentUser.id);
            const initials = getConversationInitials(conv, currentUser.id);
            const unread = unreadCounts[conv.id] || 0;
            const isSelected = conv.id === selectedId;
            const colorClass = conv.type === "group" ? getGroupColor(conv.id) : "bg-primary";
            

            return (
              <button key={conv.id} onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0 ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}>
                <div className="relative shrink-0">
                  <div className={`h-10 w-10 rounded-full ${colorClass} flex items-center justify-center text-sm font-bold text-white`}>
                    {conv.type === "group" ? <Users className="h-4 w-4" /> : initials}
                  </div>
                  {unread > 0 && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{formatMessageTime(conv.last_message_at)}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {conv.last_message || (conv.type === "group" ? "Group chat" : "Say hello!")}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}