import { AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DuplicateWarningCard({
  type = "possible",
  candidate,
}) {
  const navigate = useNavigate();

  if (!candidate) return null;

  const isExact = type === "exact";

  return (
    <div
      className={`mb-4 rounded-lg border p-3 ${
        isExact
          ? "border-red-500 bg-red-500/10"
          : "border-yellow-500 bg-yellow-500/10"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div
            className={`flex items-center gap-2 font-semibold ${
              isExact ? "text-red-500" : "text-yellow-500"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />

            {isExact
              ? "Exact Duplicate Found"
              : "Possible Duplicate Found"}
          </div>

          <div className="mt-2 text-sm space-y-1">
            <div>
              <strong>{candidate.full_name}</strong>
            </div>

            {candidate.email && (
              <div>{candidate.email}</div>
            )}

            {candidate.phone && (
              <div>{candidate.phone}</div>
            )}

            {candidate.current_company && (
              <div>{candidate.current_company}</div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate(`/candidates/${candidate.id}`)
          }
        >
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      </div>
    </div>
  );
}