import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Upload, Search, Grid3X3, List, SortDesc, Trash2, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/AuthContext";
import { can } from "@/lib/roles";
import { useLocation } from "react-router-dom";

import DCStats from "@/components/datacenter/DCStats";
import FolderSidebar from "@/components/datacenter/FolderSidebar";
import FileCard from "@/components/datacenter/FileCard";
import SpreadsheetViewer from "@/components/spreadsheet/SpreadsheetViewer";
import UploadWizard from "@/components/datacenter/UploadWizard";

export default function DataCenter() {
  const queryClient = useQueryClient();
  const { tenantFilter, stampRecord, companyId } = useTenant();
  const { user } = useAuth();
  const canEdit = can.editFiles(user);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [openFile, setOpenFile] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingFile, setEditingFile] = useState(null);

    const location = useLocation();

  useEffect(() => {
    // If user was navigated here with the autoUpload request, trigger the upload popup
    if (location.state?.autoUpload) {
      setShowUpload(true);
      // Clean up navigation state so it doesn't auto-open again on a manual page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
const { data: folders = [], isLoading: loadingFolders } = useQuery({
  queryKey: ["data-folders", companyId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("data_folders")
      .select("*")
      .eq("company_id", companyId)
      .order("name");

    if (error) throw error;

    return data || [];
  },
});

const handleDelete = async (file) => {
  if (!window.confirm(`Delete "${file.name}"?`)) return;

  try {
    // Delete database record
    const { error } = await supabase
      .from("data_files")
      .delete()
      .eq("id", file.id);

    if (error) throw error;

    // Delete from Storage (if applicable)
    if (file.storage_path) {
      await supabase.storage
        .from("data-files") // replace with your bucket name
        .remove([file.storage_path]);
    }

    queryClient.invalidateQueries({
  queryKey: ["data-files"],
}); // or queryClient.invalidateQueries(...)
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

console.log("Folders:", folders);

  const { data: files = [], isLoading: loadingFiles } = useQuery({
    queryKey: ["data-files", companyId],
    queryFn: async () => {
  const { data, error } = await supabase
    .from("data_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
  });
console.log("Supabase:", supabase);

const handleCreateFolder = async (name) => {
  console.log("companyId:", companyId);
  console.log("folder name:", name);

  const { data, error } = await supabase
    .from("data_folders")
    .insert([
      {
        name,
        company_id: companyId,
      },
    ])
    .select();

  console.log("Inserted data:", data);
  console.log("Insert error:", error);

  if (error) {
    toast.error(error.message);
    return;
  }

  queryClient.invalidateQueries({
    queryKey: ["data-folders"],
  });

  toast.success(`Folder "${name}" created`);
};

const handleEditMapping = (file) => {
  setEditingFile(file);
  setShowUpload(true);
};

const handleReimport = (file) => {
  console.log("Re-import:", file);
};

const handleDownload = (file) => {
  console.log("Download:", file);
};

    const handleDeleteFile = async (file) => {
  const confirmed = window.confirm(
    `Delete "${file.name}"?\n\nThis will also delete all candidates imported from this file. This action cannot be undone.`
  );

  if (!confirmed) return;

  setDeletingId(file.id);

  try {
    // 1. Fetch candidates linked to this file
    const { data: linkedCandidates } = await supabase
      .from("candidates")
      .select("id")
      .eq("data_file_id", file.id);

    if (linkedCandidates && linkedCandidates.length > 0) {
      const candidateIds = linkedCandidates.map((c) => c.id);

      // Delete client submissions first to prevent foreign key errors
      await supabase
        .from("client_submissions")
        .delete()
        .in("candidate_id", candidateIds);

      // Delete interviews first to prevent foreign key errors
      await supabase
        .from("interviews")
        .delete()
        .in("candidate_id", candidateIds);

      // Delete candidates
      const { error: candidateError } = await supabase
        .from("candidates")
        .delete()
        .in("id", candidateIds);

      if (candidateError) throw candidateError;
    }

    // 2. Delete the uploaded file record
    const { error: fileError } = await supabase
      .from("data_files")
      .delete()
      .eq("id", file.id);

    if (fileError) throw fileError;

    // 3. Delete the original Excel from Storage (if it exists)
    if (file.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("data-files") // <-- change if your bucket has a different name
        .remove([file.storage_path]);

      if (storageError) {
        console.warn("Storage delete failed:", storageError);
      }
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["data-files"] }),
      queryClient.invalidateQueries({ queryKey: ["candidates"] }),
    ]);

    toast.success("File and imported candidates deleted successfully.");
  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    setDeletingId(null);
  }
};

  const handleUploadDone = () => {
  setEditingFile(null);
  setShowUpload(false);
  queryClient.invalidateQueries({ queryKey: ["data-files"] });
};

  // Filter files
  const visibleFiles = files.filter((f) => {
    if (selectedFolder === "unfiled") return !f.folder_id;
    if (selectedFolder?.id) return f.folder_id === selectedFolder.id;
    return true;
  }).filter((f) => {
    if (!search.trim()) return true;
    return f.name.toLowerCase().includes(search.toLowerCase()) || f.original_filename?.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "rows") return (b.row_count || 0) - (a.row_count || 0);
    return 0;
  });

  const isLoading = loadingFolders || loadingFiles;
  console.log("OPEN FILE", openFile);
  return (
    <>
      {/* Spreadsheet Viewer overlay */}
      {openFile && (
  <SpreadsheetViewer
    file={openFile}
    onClose={() => setOpenFile(null)}
  />
)}


      <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Center</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Upload spreadsheets, view data, sync across the platform</p>
          </div>
          <Button
  onClick={() => {
    setEditingFile(null);
    setShowUpload(true);
  }}
>
  Upload File
</Button>
          {!canEdit && (
            <span className="text-xs text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">View Only</span>
          )}
        </div>

        {/* Stats */}
        <DCStats folders={folders} files={files} />

        {/* Main layout */}
        <div className="flex gap-5 items-start">
          {/* Folder sidebar */}
          <div className="shrink-0 w-48 lg:w-52 hidden sm:block">
            <FolderSidebar
              folders={folders}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onCreateFolder={handleCreateFolder}
              files={files} />
            
          </div>

          {/* File area */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..." className="pl-9 h-9" />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 h-9 text-foreground">
                  <SortDesc className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="rows">Most Rows</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 border border-border rounded-lg p-0.5">
                <button onClick={() => setViewMode("grid")} className={cn("h-7 w-7 rounded flex items-center justify-center transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setViewMode("list")} className={cn("h-7 w-7 rounded flex items-center justify-center transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              <button onClick={() => setSelectedFolder(null)} className="text-primary hover:underline">All Files</button>
              {selectedFolder && selectedFolder !== "unfiled" &&
              <><span className="text-muted-foreground">/</span><span className="text-foreground font-medium">{selectedFolder.name}</span></>
              }
              {selectedFolder === "unfiled" &&
              <><span className="text-muted-foreground">/</span><span className="text-foreground font-medium">Unfiled</span></>
              }
              <span className="text-muted-foreground ml-2 text-xs">({visibleFiles.length} files)</span>
            </div>

            {/* Files */}
            {isLoading ?
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> :
            visibleFiles.length === 0 ?
            <div className="bg-card rounded-2xl border-2 border-dashed border-border p-16 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground">No files yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Upload your first Excel or CSV file to get started</p>
                <Button onClick={() => setShowUpload(true)} className="gap-2"><Upload className="h-4 w-4" /> Upload File</Button>
              </div> :
            viewMode === "grid" ?
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleFiles.map((file) =>
              <FileCard
  key={file.id}
  file={file}
  onOpen={setOpenFile}
  onDelete={canEdit ? handleDeleteFile : null}
  onEditMapping={handleEditMapping}
  onReimport={handleReimport}
  onDownload={handleDownload}
/>

              )}
              </div> :

            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">File</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Folder</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rows</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleFiles.map((file) =>
                  <tr key={file.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.original_filename}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{file.folder_name || "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{file.entity_type || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{(file.row_count || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", file.sync_status === "synced" ? "bg-emerald-500/15 text-emerald-300" : file.sync_status === "error" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300")}>
                            {file.sync_status || "synced"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
  size="sm"
  variant="ghost"
  className="h-8 w-8 p-0 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300"
  onClick={() => setOpenFile(file)}
>
  <Eye className="h-4 w-4" />
</Button>

<Button
  size="sm"
  variant="ghost"
  className="h-8 w-8 p-0 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
  onClick={() => handleDeleteFile(file)}
>
  <Trash2 className="h-4 w-4" />
</Button>
                          </div>
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>

      {/* Upload Wizard Dialog */}
      <Dialog
  open={showUpload}
  onOpenChange={(open) => {
    setShowUpload(open);

    if (!open) {
      setEditingFile(null);
    }
  }}
>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <UploadWizard
  folders={folders}
  onDone={handleUploadDone}
  onCreateFolder={handleCreateFolder}
  queryClient={queryClient}
  editingFile={editingFile}
/>
  </DialogContent>
</Dialog> 
    </>);

}