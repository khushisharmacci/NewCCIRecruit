import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Download, RefreshCw, Loader2 } from "lucide-react";

export default function ResumeUpload({ candidate, onCandidateUpdate }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
  const fileExt = file.name.split(".").pop();

  const fileName =
    `${candidate.id}-${Date.now()}.${fileExt}`;

  const { error: uploadError } =
    await supabase.storage
      .from("resumes")
      .upload(fileName, file, {
        upsert: true,
      });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("resumes")
    .getPublicUrl(fileName);

  await onCandidateUpdate({
    resume_url: publicUrl,
    resume_filename: file.name,
    resume_upload_date: new Date().toISOString(),
  });

  queryClient.invalidateQueries({
    queryKey: ["candidate", candidate.id],
  });
} catch (err) {
  console.error(
    "Resume upload failed:",
    err
  );
}
    setUploading(false);
    e.target.value = "";
  };

  const uploadDate = candidate.resume_upload_date
    ? new Date(candidate.resume_upload_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" /> Resume
      </h3>
      {candidate.resume_url ? (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          <FileText className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{candidate.resume_filename || "Resume"}</p>
            {uploadDate && <p className="text-xs text-muted-foreground">Uploaded on {uploadDate}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1"><Download className="h-3 w-3" /> View</Button>
            </a>
            <label>
              <Button variant="ghost" size="sm" className="gap-1 cursor-pointer" asChild>
                <span><RefreshCw className="h-3 w-3" /> Replace</span>
              </Button>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
          {uploading ? (
            <><Loader2 className="h-8 w-8 text-primary animate-spin mb-2" /><p className="text-sm text-muted-foreground">Uploading...</p></>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Upload Resume</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX supported</p>
            </>
          )}
          <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}