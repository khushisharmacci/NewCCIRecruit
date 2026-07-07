import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Download, RefreshCw, Sparkles, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResumeAnalysis({ candidate, onCandidateUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [jd, setJd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [matchReport, setMatchReport] = useState(null);
  const handleResumeUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    setUploading(true);

    const fileName = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("resumes")
      .getPublicUrl(fileName);

    await onCandidateUpdate({
      resume_url: data.publicUrl,
    });
  } catch (err) {
    console.error(err);
  } finally {
    setUploading(false);
  }
};

  const handleAnalyze = async () => {
  if (!jd.trim()) return;

  try {
    setAnalyzing(true);
    setMatchReport(null);

    const response = await fetch("/api/recruiter-iq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidate,
        jd,
      }),
    });
console.log("STATUS:", response.status);
    const result = await response.json();

let analysis = result.result;

if (typeof analysis === "string") {
  analysis = analysis
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
  analysis = JSON.parse(analysis);
} catch (e) {
  console.error("JSON Parse Error:", analysis);
  return;
  console.log("RESULT:", result);
}
}

setMatchReport(analysis);
  } catch (err) {
    console.error(err);
 } finally {
  setAnalyzing(false);
}
};

const scoreColor = (score) => {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
};

  const ScoreBar = ({ label, value }) => (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("text-sm font-bold", scoreColor(value))}>{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700",
            value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Resume Upload */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Resume
        </h3>
        {candidate?.resume_url ? (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Resume uploaded</p>
              <p className="text-xs text-muted-foreground">Click to view or download</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1"><Download className="h-3 w-3" /> View</Button>
              </a>
              <label>
                <Button variant="ghost" size="sm" className="gap-1 cursor-pointer" asChild>
                  <span><RefreshCw className="h-3 w-3" /> Replace</span>
                </Button>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
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

      {/* JD Match Analysis */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> AI Job Description Match
        </h3>
        <textarea
          value={jd}
          onChange={e => setJd(e.target.value)}
          placeholder="Paste the Job Description here to get an AI-powered match analysis..."
          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-3"
        />
        <Button onClick={handleAnalyze} disabled={analyzing || !jd.trim()} className="gap-2">
          {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Analyze Match</>}
        </Button>

        {matchReport && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <div className={cn("text-4xl font-bold", scoreColor(matchReport.overall_match))}>
                {matchReport.overall_match}%
              </div>
              <div>
                <p className="font-semibold text-foreground">Overall Match</p>
                <p className="text-sm text-muted-foreground">{matchReport.summary}</p>
              </div>
            </div>

            <div className="space-y-3">
              <ScoreBar label="Skill Match" value={matchReport.skill_match} />
              <ScoreBar label="Experience Match" value={matchReport.experience_match} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Matching Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(matchReport.matching_skills || []).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">{s}</span>
                  ))}
                  {!matchReport.matching_skills?.length && <span className="text-xs text-emerald-700">None identified</span>}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Missing Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(matchReport.missing_skills || []).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">{s}</span>
                  ))}
                  {!matchReport.missing_skills?.length && <span className="text-xs text-red-700">None identified</span>}
                </div>
              </div>
            </div>

            {matchReport.interview_focus_areas?.length > 0 && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm font-semibold text-blue-800 mb-2">Recommended Interview Focus Areas</p>
                <ul className="space-y-1">
                  {matchReport.interview_focus_areas.map((area, i) => (
                    <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span> {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}