import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Palette, MapPin, Clock, FileText, Bell, Users, Upload, Loader2, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { can } from "@/lib/roles";

function FieldGroup({ label, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">{label}</h3>
      {children}
    </div>
  );
}

function FileUpload({ label, currentUrl, onUpload, uploading }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View current file</a>
        )}
        <label className="flex items-center gap-2 h-9 px-3 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading..." : "Upload file"}
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }} />
        </label>
      </div>
    </div>
  );
}

export default function OrgSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);

  const { data: profiles = [], isLoading } = useQuery({
  queryKey: ["company-profile"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("company_profile")
      .select("*");

    if (error) {
  console.error("Company profile insert error:", error);
  throw error;
}

    return data || [];
  },
});

  const profile = profiles[0] || {};
  const [form, setForm] = useState({});

  // Merge DB values into form when loaded
  const getVal = (key) => form[key] !== undefined ? form[key] : (profile[key] || "");
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const saveMutation = useMutation({
  mutationFn: async (data) => {
    if (profile.id) {
      const { data: result, error } = await supabase
  .from("company_profile")
  .update(data)
  .eq("id", profile.id)
  .select();

console.log("PROFILE ID:", profile.id);
console.log("DATA:", data);
console.log("RESULT:", result);
console.log("ERROR:", error);

if (error) {
  alert(error.message);
  throw error;
}
    } else {
      const { data: result, error } = await supabase
  .from("company_profile")
  .insert([data])
  .select();

console.log("INSERT RESULT:", result);
console.log("INSERT ERROR:", error);

if (error) {
  alert(error.message);
  throw error;
}
    }
  },

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["company-profile"],
    });

    toast.success("Settings saved successfully!");
    setForm({});
  },
});

  const handleSave = async () => {
    setSaving(true);
    const data = { ...profile, ...form };
    await saveMutation.mutateAsync(data);
    setSaving(false);
  };

  const handleFileUpload = async () => {
  toast.error("File uploads not migrated yet");
};

  if (!can.viewOrgSettings(user)) {
    return (
      <div className="p-8 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold text-foreground">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">Only Super Admins and CEOs can access Organization Settings.</p>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  const hasChanges = Object.keys(form).length > 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your company profile, branding, and platform configuration</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5"><MapPin className="h-3.5 w-3.5" />Locations & Hours</TabsTrigger>
          <TabsTrigger value="policies" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Policies</TabsTrigger>
        </TabsList>

        {/* Company Profile */}
        <TabsContent value="profile" className="mt-5">
          <div className="bg-card rounded-xl border border-border p-6 space-y-5">
            <FieldGroup label="Company Identity">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company Name <span className="text-red-400">*</span></Label>
                  <Input value={getVal("company_name")} onChange={e => set("company_name", e.target.value)} placeholder="Your company name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={getVal("website")} onChange={e => set("website", e.target.value)} placeholder="https://yourcompany.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input type="email" value={getVal("contact_email")} onChange={e => set("contact_email", e.target.value)} placeholder="hr@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input value={getVal("contact_phone")} onChange={e => set("contact_phone", e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Office Address</Label>
                <Textarea value={getVal("office_address")} onChange={e => set("office_address", e.target.value)} placeholder="Full office address" rows={2} />
              </div>
            </FieldGroup>

            <FieldGroup label="Legal Documents">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload label="Registration Certificate" currentUrl={getVal("registration_cert_url")} onUpload={f => handleFileUpload(f, "registration_cert_url")} uploading={uploadingField === "registration_cert_url"} />
                <FileUpload label="GST Certificate" currentUrl={getVal("gst_cert_url")} onUpload={f => handleFileUpload(f, "gst_cert_url")} uploading={uploadingField === "gst_cert_url"} />
                <FileUpload label="PAN Card" currentUrl={getVal("pan_card_url")} onUpload={f => handleFileUpload(f, "pan_card_url")} uploading={uploadingField === "pan_card_url"} />
                <FileUpload label="Company Profile PDF" currentUrl={getVal("company_profile_pdf_url")} onUpload={f => handleFileUpload(f, "company_profile_pdf_url")} uploading={uploadingField === "company_profile_pdf_url"} />
              </div>
            </FieldGroup>
          </div>
        </TabsContent>


        {/* Locations & Hours */}
        <TabsContent value="locations" className="mt-5">
          <div className="bg-card rounded-xl border border-border p-6 space-y-5">
            <FieldGroup label="Office Locations">
              <div className="space-y-1.5">
                <Label>Office Locations (one per line)</Label>
                <Textarea value={getVal("office_locations")} onChange={e => set("office_locations", e.target.value)} placeholder={"Bengaluru HQ - 123 MG Road\nMumbai - 456 BKC\nDelhi - 789 Connaught Place"} rows={4} />
              </div>
            </FieldGroup>
            <FieldGroup label="Working Hours">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={getVal("working_hours_start") || "09:00"} onChange={e => set("working_hours_start", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={getVal("working_hours_end") || "18:00"} onChange={e => set("working_hours_end", e.target.value)} />
                </div>
              </div>
            </FieldGroup>
          </div>
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies" className="mt-5">
          <div className="bg-card rounded-xl border border-border p-6 space-y-5">
            <FieldGroup label="Attendance Rules">
              <Textarea value={getVal("attendance_rules")} onChange={e => set("attendance_rules", e.target.value)} placeholder={"e.g. Employees must check in by 9:30 AM\nLate arrivals after 10:00 AM will be marked Half Day\nMinimum 8 hours per day required"} rows={4} />
            </FieldGroup>
            <FieldGroup label="Leave Policy">
              <Textarea value={getVal("leave_policy")} onChange={e => set("leave_policy", e.target.value)} placeholder={"e.g. 12 days casual leave per year\n15 days sick leave per year\nLeave requests must be submitted 2 days in advance"} rows={4} />
            </FieldGroup>
            <FieldGroup label="Recruitment Workflow">
              <Textarea value={getVal("recruitment_workflow")} onChange={e => set("recruitment_workflow", e.target.value)} placeholder={"e.g. Applied → Screening → Technical Round → HR Round → Offer → Joining"} rows={4} />
            </FieldGroup>
          </div>
        </TabsContent>


      </Tabs>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}