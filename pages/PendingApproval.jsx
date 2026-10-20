import { useAuth } from "@/lib/AuthContext";
import { Clock, LogOut, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function PendingApproval() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-100 mx-auto">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Pending Approval</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Your account has been created successfully. A Company Admin will review and activate your account shortly.
            You'll receive an email once your access has been approved.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-left space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span>Signed in as: <span className="text-foreground font-medium">{user?.email}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Status: <span className="text-amber-600 font-medium">Pending Approval</span></span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          If you believe this is an error, please contact your company administrator.
        </p>
        <Button
  variant="outline"
  className="gap-2"
  onClick={async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }}
>
  <LogOut className="h-4 w-4" />
  Sign Out
</Button>
      </div>
    </div>
  );
}