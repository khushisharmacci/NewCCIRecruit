import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Download,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";

function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type) {
  if (type?.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileText;
  if (
    type?.includes("spreadsheet") ||
    type?.includes("excel") ||
    type?.includes("csv")
  )
    return FileSpreadsheet;

  return File;
}

export default function AttachmentUploader({
  attachments,
  setAttachments,
  readOnly = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);

    if (!files.length) return;

    setUploading(true);

    try {
      for (const file of files) {
        const filePath = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}-${file.name}`;

        const { error } = await supabase.storage
          .from("daily-report-files")
          .upload(filePath, file);

        if (error) throw error;

        const { data } = supabase.storage
          .from("daily-report-files")
          .getPublicUrl(filePath);

        setAttachments((prev) => [
          ...prev,
          {
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            storage_path: filePath,
            public_url: data.publicUrl,
          },
        ]);
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded.`,
      });
    } catch (err) {
      console.error(err);

      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    }

    setUploading(false);
  };

  const handleRemove = async (index) => {
    const file = attachments[index];

    if (file?.storage_path) {
      await supabase.storage
        .from("daily-report-files")
        .remove([file.storage_path]);
    }

    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 font-semibold">Attachments</h3>

      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />

              <p className="mb-2 text-sm text-muted-foreground">
                Drag & drop files here, or
              </p>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Upload className="h-4 w-4" />
                Browse Files

                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>

              <p className="mt-2 text-xs text-muted-foreground">
                PDF, Excel, CSV, PNG, JPG, JPEG, WEBP
              </p>
            </>
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((att, index) => {
            const Icon = getFileIcon(att.file_type);
            const isImage = att.file_type?.startsWith("image/");

            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
              >
                {isImage ? (
                  <img
                    src={att.public_url}
                    alt={att.file_name}
                    className="h-12 w-12 cursor-pointer rounded object-cover"
                    onClick={() => setLightbox(att.public_url)}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {att.file_name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(att.file_size)}
                  </p>
                </div>

                <div className="flex gap-1">
                  <a
                    href={att.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.file_name}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  {!readOnly && (
                    <button
                      onClick={() => handleRemove(index)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {attachments.length === 0 && readOnly && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No attachments
        </p>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-lg"
          />

          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 text-white hover:text-white/80"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}