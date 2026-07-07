import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, Users } from "lucide-react";

export default function NewConversationDialog({ open, onOpenChange, users, currentUser, onCreate }) {
  const [tab, setTab] = useState("direct");
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

const others = users.filter((u) => u.id !== currentUser.id);
console.log("OTHERS", others);

  const filtered = others.filter((u) =>
  u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
  u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (u) => {
    setSelectedMembers((prev) =>
    prev.find((m) => m.id === u.id) ? prev.filter((m) => m.id !== u.id) : [...prev, u]
    );
  };

  const handleCreate = () => {
    if (tab === "direct") {
      if (selectedMembers.length !== 1) return;
      onCreate({ type: "direct", member: selectedMembers[0] });
    } else {
      if (!groupName.trim() || selectedMembers.length < 1) return;
      onCreate({ type: "group", name: groupName, description: groupDesc, members: selectedMembers });
    }
    setSearch("");setGroupName("");setGroupDesc("");setSelectedMembers([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">New Conversation</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => {setTab(v);setSelectedMembers([]);}}>
          <TabsList className="w-full">
            <TabsTrigger value="direct" className="flex-1 gap-2 bg-[hsl(var(--accent))] text-[hsl(var(--card))]"><User className="h-4 w-4" />Direct</TabsTrigger>
            <TabsTrigger value="group" className="flex-1 gap-2 bg-[hsl(var(--accent))] text-[hsl(var(--card))]"><Users className="h-4 w-4" />Group</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-3 mt-3 text-[hsl(var(--muted))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
value={groupName}
onChange={(e)=>setGroupName(e.target.value)}
placeholder="e.g. Recruitment Team"
className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
/>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1">
              {filtered.map((u) =>
              <div key={u.id} onClick={() => setSelectedMembers([u])}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
selectedMembers[0]?.id === u.id
? "bg-blue-600/20 border-blue-500"
: "bg-slate-800 border-slate-700 hover:bg-slate-700"
}`}>
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white">
                    {u.full_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{u.full_name}</p>
                    <p className="text-xs text-slate-400">{u.role}</p>
                  </div>
                </div>
              )}
            </div>
            <Button className="w-full" disabled={selectedMembers.length !== 1} onClick={handleCreate}>Start Chat</Button>
          </TabsContent>

          <TabsContent value="group" className="space-y-3 mt-3">
            <div>
              <Label className="text-slate-300">Group Name *</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Recruitment Team" />
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label className="mb-2 block">Add Members *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search teammates..."
    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
/>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filtered.map((u) =>
                <div key={u.id} onClick={() => toggleMember(u)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
selectedMembers.find((m) => m.id === u.id)
? "bg-blue-600/20 border-blue-500"
: "bg-slate-800 border-slate-700 hover:bg-slate-700"
}`}>
                    <Checkbox checked={!!selectedMembers.find((m) => m.id === u.id)} />
                    <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                      {u.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white">{u.full_name}</span>
                  </div>
                )}
              </div>
              {selectedMembers.length > 0 &&
              <p className="text-xs text-muted-foreground mt-1">{selectedMembers.length} selected</p>
              }
            </div>
            <Button className="w-full" disabled={!groupName.trim() || selectedMembers.length < 1} onClick={handleCreate}>Create Group</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>);

}