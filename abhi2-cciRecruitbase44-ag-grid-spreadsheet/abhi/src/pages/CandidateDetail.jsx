import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ResumeUpload from "@/components/candidates/ResumeUpload";
import InterviewManager from "@/components/candidates/InterviewManager";
import ClientSubmissions from "@/components/candidates/ClientSubmissions";

const statusColors = {
  "Applied": "bg-blue-500/15 text-blue-300", "Screening": "bg-indigo-500/15 text-indigo-300",
  "Shortlisted": "bg-violet-500/15 text-violet-300", "Interview Scheduled": "bg-amber-500/15 text-amber-300",
  "Selected": "bg-emerald-500/15 text-emerald-300", "Offer Released": "bg-green-500/15 text-green-300",
  "Joined": "bg-teal-500/15 text-teal-300", "Rejected": "bg-red-500/15 text-red-300", "On Hold": "bg-gray-500/15 text-gray-400",
};

export default function CandidateDetail() {
  const { candidateId } = useParams();
  const queryClient = useQueryClient();
  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: async () => {
  console.log("Searching for:", candidateId);

  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  console.log("Candidate:", data);
  console.log("Error:", error);

  if (error) throw error;

  return data;
},
  });
  const updateMutation = useMutation({
    mutationFn: async (data) => {
  const { error } = await supabase
    .from("candidates")
    .update(data)
    .eq("id", candidateId);

  if (error) throw error;
},
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!candidate) return <div className="text-center py-20 text-muted-foreground">Candidate not found</div>;

  return (
  <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
    <Link
      to="/candidates"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Candidates
    </Link>

    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
          {candidate.full_name?.charAt(0) || "?"}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">
              {candidate.full_name}
            </h1>

            <span
              className={cn(
                "inline-flex px-3 py-1 rounded-full text-xs font-medium",
                statusColors[candidate.status]
              )}
            >
              {candidate.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {candidate.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {candidate.email}
              </span>
            )}

            {candidate.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {candidate.phone}
              </span>
            )}

            {candidate.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {candidate.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>

    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold">Professional Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">

        <div>
          <p className="text-muted-foreground">SR No.</p>
          <p className="font-medium mt-1">{candidate.row_order || "—"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Current Organisation</p>
          <p className="font-medium mt-1">{candidate.current_company || "—"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Current CTC</p>
          <p className="font-medium mt-1">{candidate.current_ctc || "—"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Academics</p>
          <p className="font-medium mt-1">{candidate.academics || "—"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Sourced By</p>
          <p className="font-medium mt-1">{candidate.sourced_by || "—"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">HR</p>
          <p className="font-medium mt-1">{candidate.hr || "—"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">LinkedIn</p>
          <p className="font-medium mt-1">
            {candidate.linkedin ? (
              <a
                href={candidate.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open Profile
              </a>
            ) : (
              "—"
            )}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">Sent On</p>
          <p className="font-medium mt-1">{candidate.sent_on || "—"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Position</p>
          <p className="font-medium mt-1">{candidate.position || "—"}</p>
        </div>

      </div>

      {(() => {
  let remarks = candidate.remarks || "";
  let customFields = {};

  if (remarks.includes("Custom Fields:")) {
    const [text, json] = remarks.split("Custom Fields:");

    remarks = text.trim();

    try {
      customFields = JSON.parse(json.trim());
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      {remarks && (
        <div className="mt-6 pt-5 border-t border-border">
          <h4 className="font-semibold mb-3">Remarks</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {remarks}
          </p>
        </div>
      )}

      {Object.keys(customFields).length > 0 && (
        <div className="mt-6 pt-5 border-t border-border">
          <h4 className="font-semibold mb-4">Additional Details</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            {Object.entries(customFields).map(([key, value]) => (
              <div key={key}>
                <p className="text-muted-foreground">
                  {key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, c => c.toUpperCase())}
                </p>

                <p className="font-medium mt-1">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
})()}

    <ResumeUpload
      candidate={candidate}
      onCandidateUpdate={(data) => updateMutation.mutate(data)}
    />

    <InterviewManager candidate={candidate} />

    <ClientSubmissions candidate={candidate} />
  </div>
</div>
);
}