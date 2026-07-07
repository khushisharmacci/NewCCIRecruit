import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DuplicateConfirmDialog({
  open,
  onOpenChange,
  candidate,
  onSaveAnyway,
}) {
  const navigate = useNavigate();

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            Candidate Already Exists
          </DialogTitle>

          <DialogDescription>
            An exact duplicate candidate was found.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div>
            <strong>Name:</strong> {candidate.full_name}
          </div>

          <div>
            <strong>Email:</strong> {candidate.email || "-"}
          </div>

          <div>
            <strong>Phone:</strong> {candidate.phone || "-"}
          </div>

          <div>
            <strong>Company:</strong> {candidate.current_company || "-"}
          </div>

          <div>
            <strong>Position:</strong> {candidate.position || "-"}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/candidates/${candidate.id}`)
            }
          >
            Open Existing
          </Button>

          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={onSaveAnyway}
          >
            Save Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}