import { useState } from "react";
import { X, UserPlus, UserMinus, Shield, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function GroupInfoPanel({ conversation, currentUser, onClose, onUpdate }) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.name || "");

  const isAdmin = conversation.admin_id === currentUser.id;

  let memberIds = [], memberNames = [];
  try { memberIds = JSON.parse(conversation.members || "[]"); } catch {}
  try { memberNames = JSON.parse(conversation.member_names || "[]"); } catch {}

  const members = memberIds.map((id, i) => ({ id, name: memberNames[i] || id }));

  const handleRename = () => {
    if (newName.trim()) {
      onUpdate({ name: newName.trim() });
      setEditingName(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    const idx = memberIds.indexOf(memberId);
    const newIds = memberIds.filter(id => id !== memberId);
    const newNames = memberNames.filter((_, i) => i !== idx);
    onUpdate({ members: JSON.stringify(newIds), member_names: JSON.stringify(newNames) });
  };

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Group Info</h3>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-violet-500 flex items-center justify-center text-2xl text-white font-bold mx-auto mb-2">
            {conversation.name?.charAt(0).toUpperCase()}
          </div>
          {editingName ? (
            <div className="flex gap-1">
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-7 text-sm" autoFocus />
              <Button size="icon" className="h-7 w-7" onClick={handleRename}><Check className="h-3 w-3" /></Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <h4 className="font-semibold text-foreground">{conversation.name}</h4>
              {isAdmin && <button onClick={() => setEditingName(true)}><Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>}
            </div>
          )}
          {conversation.description && <p className="text-xs text-muted-foreground mt-1">{conversation.description}</p>}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{members.length} Members</p>
          <div className="space-y-1">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {m.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{m.name}</p>
                    {m.id === conversation.admin_id && (
                      <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">Admin</Badge>
                    )}
                  </div>
                </div>
                {isAdmin && m.id !== currentUser.id && m.id !== conversation.admin_id && (
                  <button onClick={() => handleRemoveMember(m.id)} className="text-muted-foreground hover:text-destructive">
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}