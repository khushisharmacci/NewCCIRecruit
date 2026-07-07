import { useState } from "react";
import { FolderOpen, Folder, Plus, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FOLDER_COLORS = [
  "text-blue-500", "text-emerald-500", "text-amber-500",
  "text-purple-500", "text-rose-500", "text-cyan-500"
];

export default function FolderSidebar({ folders, selectedFolder, onSelectFolder, onCreateFolder, files }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreateFolder(newName.trim());
    setNewName("");
    setCreating(false);
  };

  const fileCountFor = (folderId) => files.filter(f => f.folder_id === folderId).length;
  const unfiledCount = files.filter(f => !f.folder_id).length;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Folders</span>
        <button onClick={() => setCreating(!creating)} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {creating && (
        <div className="flex gap-1 mb-2">
          <Input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Folder name..."
            className="h-7 text-xs"
          />
          <Button size="sm" className="h-7 px-2 text-xs" onClick={handleCreate}>Add</Button>
        </div>
      )}

      {/* All Files */}
      <button
        onClick={() => onSelectFolder(null)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
          !selectedFolder ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
        )}
      >
        <Database className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">All Files</span>
        <span className={cn("text-xs px-1.5 py-0.5 rounded-full", !selectedFolder ? "bg-white/20" : "bg-muted text-muted-foreground")}>{files.length}</span>
      </button>

      {folders.map((folder, idx) => {
        const active = selectedFolder?.id === folder.id;
        const colorClass = FOLDER_COLORS[idx % FOLDER_COLORS.length];
        return (
          <button
            key={folder.id}
            onClick={() => onSelectFolder(folder)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            )}
          >
            {active
              ? <FolderOpen className="h-4 w-4 shrink-0" />
              : <Folder className={cn("h-4 w-4 shrink-0", colorClass)} />
            }
            <span className="flex-1 text-left truncate">{folder.name}</span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded-full", active ? "bg-white/20" : "bg-muted text-muted-foreground")}>{fileCountFor(folder.id)}</span>
          </button>
        );
      })}

      {unfiledCount > 0 && (
        <button
          onClick={() => onSelectFolder("unfiled")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            selectedFolder === "unfiled" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Folder className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Unfiled</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{unfiledCount}</span>
        </button>
      )}
    </div>
  );
}