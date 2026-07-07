import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Archive, RotateCcw, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusColors = {
  Open: "bg-emerald-500/15 text-emerald-300",
  "In Progress": "bg-blue-500/15 text-blue-300",
  "On Hold": "bg-amber-500/15 text-amber-300",
  Closed: "bg-gray-500/15 text-gray-400",
  Cancelled: "bg-red-500/15 text-red-300",
  Archived: "bg-zinc-500/15 text-zinc-400",
};

export default function PositionNode({ node, children, allNodes, onAdd, onEdit, onDelete, onArchive, onReopen, depth }) {
  const [expanded, setExpanded] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ title: "", department: "", description: "", assigned_recruiter: "" });

  const childNodes = children.filter(c => c.parent_id === node.id);
  const hasChildren = childNodes.length > 0;
  const isArchived = node.status === "Archived";

  const openAdd = () => {
    setEditMode("add");
    setForm({ title: "", department: node.department || "", description: "", assigned_recruiter: ""});
    setDialogOpen(true);
  };
  const openEdit = () => {
    setEditMode("edit");
    setForm({
      title: node.title || "",
      department: node.department || "",
      description: node.description || "",
      assigned_recruiter: node.assigned_recruiter || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const data = {
  ...form,
  title: form.title.trim(),
  department: form.department.trim(),
  description: form.description.trim(),
  assigned_recruiter: form.assigned_recruiter.trim(),
  location: form.location.trim(),

  company_id: client.id,
  client_name: client.name,
};

if (editMode === "add") {
  console.log("POSITION DATA", data);
  onAdd({
    ...data,
    parent_id: node.id,
  });
} else {
  onEdit(node.id, data);
}
    setDialogOpen(false);
  };

  return (
    <div className="relative">
      <div className={cn("flex items-center gap-2 py-2 px-3 rounded-lg transition-colors", isArchived ? "opacity-50" : "hover:bg-muted/50")}>
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 rounded hover:bg-muted text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isArchived ? "bg-zinc-500/10" : "bg-primary/10")}>
          <User className={cn("h-4 w-4", isArchived ? "text-zinc-400" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{node.title}</p>
            
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusColors[node.status] || statusColors["Open"])}>{node.status}</span>
            {node.created_date && (
              <span className="text-xs text-muted-foreground">· {format(new Date(node.created_date), "MMM d, yyyy")}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {node.department && <span className="text-xs text-muted-foreground">{node.department}</span>}
            {node.location && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="h-3 w-3" />{node.location}</span>}
            {node.assigned_recruiter && <span className="text-xs text-muted-foreground">· {node.assigned_recruiter}</span>}
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={openAdd} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary" title="Add child"><Plus className="h-3.5 w-3.5" /></button>
          <button onClick={openEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          {isArchived ? (
            <button onClick={() => onReopen(node.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-emerald-400" title="Reopen"><RotateCcw className="h-3.5 w-3.5" /></button>
          ) : (
            <button onClick={() => onArchive(node.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-amber-400" title="Archive"><Archive className="h-3.5 w-3.5" /></button>
          )}
          <button onClick={() => onDelete(node.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="ml-[18px] border-l border-border pl-2">
          {childNodes.map(child => (
            <PositionNode
              key={child.id}
              node={child}
              children={children}
              allNodes={allNodes}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
              onReopen={onReopen}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode === "add" ? "Add Position" : "Edit Position"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Position Name *</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Recruiter" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              
            </div>
            <div className="grid grid-cols-2 gap-3">
              
            </div>
            <div>
              <Label>Assigned Recruiter</Label>
              <Input value={form.assigned_recruiter} onChange={(e) => setForm({ ...form, assigned_recruiter: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>{editMode === "add" ? "Add" : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}