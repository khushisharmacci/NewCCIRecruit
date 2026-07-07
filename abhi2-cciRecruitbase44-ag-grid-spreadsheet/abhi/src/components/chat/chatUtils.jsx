export function getConversationName(conv, currentUserId) {
  if (conv.type === "group") return conv.name;
  try {
    const names = JSON.parse(conv.member_names || "[]");
    const ids = JSON.parse(conv.members || "[]");
    const idx = ids.findIndex(id => id !== currentUserId);
    return idx >= 0 ? names[idx] : "Unknown";
  } catch { return "Direct Message"; }
}

export function getConversationInitials(conv, currentUserId) {
  const name = getConversationName(conv, currentUserId);
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function getOtherUserId(conv, currentUserId) {
  try {
    const ids = JSON.parse(conv.members || "[]");
    return ids.find(id => id !== currentUserId) || null;
  } catch { return null; }
}

export function isUnread(conv, messages, currentUserId) {
  const convMessages = messages.filter(m => m.conversation_id === conv.id);
  return convMessages.some(m => {
    if (m.sender_id === currentUserId) return false;
    try { return !JSON.parse(m.read_by || "[]").includes(currentUserId); } catch { return true; }
  });
}

export function getUnreadCount(messages, currentUserId) {
  return messages.filter(m => {
    if (m.sender_id === currentUserId) return false;
    try { return !JSON.parse(m.read_by || "[]").includes(currentUserId); } catch { return true; }
  }).length;
}

export function parseMentions(content) {
  return content.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
}

export function renderMentions(content) {
  return content.replace(/@(\w+)/g, '<span class="text-primary font-semibold">@$1</span>');
}

export function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const GROUP_COLORS = [
  "bg-violet-500", "bg-pink-500", "bg-teal-500", "bg-amber-500",
  "bg-cyan-500", "bg-rose-500", "bg-indigo-500", "bg-emerald-500"
];

export function getGroupColor(id) {
  const hash = (id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}