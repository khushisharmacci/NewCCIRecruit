import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Upload, Plus, Trash2, Eye, ArrowLeft, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

function JDCard({ jd, onOpen, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = jd.content && jd.content.length > 200;
  const preview = expanded ? jd.content : (jd.content || "").slice(0, 200);

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{jd.title}</h3>
          {jd.client_name && <p className="text-sm text-muted-foreground">{jd.client_name}</p>}
        </div>
        <div className="flex items-center gap-2">

  {jd.publicUrl && (
    <FileText className="h-5 w-5 text-primary" />
  )}

  <button
    onClick={onDelete}
    className="h-7 w-7 rounded-md bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center"
  >
    <Trash2 className="h-3.5 w-3.5 text-red-400" />
  </button>

</div>
      </div>
      <div className="text-xs text-muted-foreground">
        Created: {jd.created_date ? format(new Date(jd.created_date), "MMM d, yyyy") : "—"}
      </div>
      {jd.content && (
        <div className="text-sm text-muted-foreground">
          <ReactMarkdown>{preview}</ReactMarkdown>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="text-primary hover:underline text-xs mt-1">
              {expanded ? "...See Less" : "...See More"}
            </button>
          )}
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => onOpen(jd)}>
        <Eye className="h-3.5 w-3.5" /> View Details
      </Button>
    </div>
  );
}

function JDDetail({ jd, onBack }) {
  const { tenantFilter } = useTenant();
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["jd-connected-candidates", jd.id],
    queryFn: async () => {
  let query = supabase
    .from("candidates")
    .select("*")
    .eq("position", jd.title);

  const filters = tenantFilter();

  if (filters.company_id) {
    query = query.eq("company_id", filters.company_id);
  }

  const { data, error } = await query.order(
    "created_at",
    { ascending: false }
  );

  if (error) throw error;

  return data || [];
},
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["jd-submissions", jd.id],
    queryFn: async () => {
  let query = supabase
    .from("client_submissions")
    .select("*");

  const filters = tenantFilter();

  if (filters.company_id) {
    query = query.eq(
      "company_id",
      filters.company_id
    );
  }

  const { data, error } =
    await query.order("date_sent", {
      ascending: false,
    });

  if (error) throw error;

  return data || [];
},
  });

  // Match submissions to this JD's client
  const connectedCandidates = candidates.filter((c) =>
    submissions.some((s) => s.candidate_id === c.id && (!jd.client_name || s.client_name === jd.client_name))
  );

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Job Descriptions
      </button>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{jd.title}</h2>
            {jd.client_name && <p className="text-sm text-muted-foreground">Client: {jd.client_name}</p>}
            <p className="text-xs text-muted-foreground mt-1">Created: {jd.created_date ? format(new Date(jd.created_date), "MMM d, yyyy") : "—"}</p>
          </div>
          {jd.publicUrl && (
            <a href={jd.publicUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1"><FileText className="h-3.5 w-3.5" /> View File</Button>
            </a>
          )}
        </div>
        {jd.content && (
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown>{jd.content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Connected Candidates
          <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{connectedCandidates.length}</span>
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : connectedCandidates.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No candidates connected to this JD yet</p>
        ) : (
          <div className="space-y-3">
            {connectedCandidates.map((c) => {
              const submission = submissions.find((s) => s.candidate_id === c.id);
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {c.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.full_name}</p>
                    {submission && (
                      <p className="text-xs text-muted-foreground">Sent to {submission.client_name} on {submission.date_sent ? format(new Date(submission.date_sent), "MMM d, yyyy") : "—"}</p>
                    )}
                  </div>
                  {submission && (
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                      submission.status === "Selected" ? "bg-emerald-500/15 text-emerald-300" :
                      submission.status === "Rejected" ? "bg-red-500/15 text-red-300" :
                      "bg-amber-500/15 text-amber-300"
                    )}>{submission.status}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function JDManagement() {
  const queryClient = useQueryClient();
  const { tenantFilter, stampRecord } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJD, setSelectedJD] = useState(null);
  const [form, setForm] = useState({ title: "", client_name: "", content: "", source_type: "manual" });
  const [uploading, setUploading] = useState(false);

  const { data: jds = [], isLoading } = useQuery({
    queryKey: ["job-descriptions"],
    queryFn: async () => {
  let query = supabase
    .from("job_descriptions")
    .select("*");

  const filters = tenantFilter();

  if (filters.company_id) {
    query = query.eq(
      "company_id",
      filters.company_id
    );
  }

  const { data, error } =
    await query.order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data || [];
},
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
  const { error } = await supabase
    .from("job_descriptions")
    .insert([
      stampRecord(data),
    ]);

  if (error) throw error;
},
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-descriptions"] }); setDialogOpen(false); },
  });

  const deleteMutation = useMutation({
  mutationFn: async (jd) => {
    if (jd.publicUrl) {
      const fileName = jd.publicUrl.split("/").pop();

      await supabase.storage
        .from("job-descriptions")
        .remove([fileName]);
    }

    const { error } = await supabase
      .from("job_descriptions")
      .delete()
      .eq("id", jd.id);

    if (error) throw error;
  },

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["job-descriptions"],
    });
  },
});

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt =
  file.name.split(".").pop();

const fileName =
  `${Date.now()}-${file.name}`;

const { error: uploadError } =
  await supabase.storage
    .from("job-descriptions")
    .upload(fileName, file, {
      upsert: true,
    });

if (uploadError)
  throw uploadError;

const {
  data: { publicUrl },
} = supabase.storage
  .from("job-descriptions")
  .getPublicUrl(fileName);
      setForm({ ...form, publicUrl, file_name: file.name, source_type: "upload", title: form.title || file.name.replace(/\.[^/.]+$/, "") });
    } catch (err) {
      console.error("JD upload failed:", err);
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    createMutation.mutate(form);
  };

  if (selectedJD) {
    return <JDDetail jd={selectedJD} onBack={() => setSelectedJD(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Job Descriptions
        </h3>
        <Button size="sm" onClick={() => { setForm({ title: "", client_name: "", content: "", source_type: "manual" }); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add JD
        </Button>
      </div>

      {isLoading ? (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
) : jds.length === 0 ? (
  <div className="bg-card rounded-xl border border-border p-12 text-center">
    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
    <p className="text-muted-foreground text-sm">
      No job descriptions yet. Click "Add JD" to get started.
    </p>
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {jds.map((jd) => (
      <JDCard
        key={jd.id}
        jd={jd}
        onOpen={setSelectedJD}
        onDelete={() => {
  console.log("JD:", jd);
  console.log("JD ID:", jd.id);

  if (window.confirm(`Delete "${jd.title}"?`)) {
    deleteMutation.mutate(jd);
  }
}}
      />
    ))}
  </div>
)}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Job Description</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>JD Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior React Developer" />
            </div>
            <div>
              <Label>Client Name</Label>
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Client name (optional)" />
            </div>
            <div>
              <Label>Upload JD File (PDF, DOCX, TXT)</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                    {uploading ? (
                      <><Loader2 className="h-5 w-5 text-primary animate-spin mr-2" /><span className="text-sm text-muted-foreground">Uploading...</span></>
                    ) : (
                      <><Upload className="h-5 w-5 text-muted-foreground mr-2" /><span className="text-sm text-muted-foreground">{form.file_name || "Choose file"}</span></>
                    )}
                  </div>
                  <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 border-t border-border" /> OR ENTER MANUALLY <div className="flex-1 border-t border-border" />
            </div>
            <div>
              <Label>JD Content (manual entry)</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Paste or type the job description here..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.title || createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save JD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}