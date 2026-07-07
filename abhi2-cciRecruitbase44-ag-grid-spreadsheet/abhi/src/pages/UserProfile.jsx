import { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, Loader2, User, Briefcase, Building2, Phone, Mail, Linkedin } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { toast } from "sonner";

export default function UserProfile() {
  const { user, checkUserAuth } = useAuth();
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    linkedin_url: user?.linkedin_url || "",
  });

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || "User";
const initials = (user?.full_name || "U")
  .split(" ")
  .map((w) => w[0])
  .join("")
  .toUpperCase()
  .slice(0, 2);

const handleAvatarUpload = async () => {
  toast.info("Avatar uploads will be migrated to Supabase Storage later.");
};

const handleSave = async (e) => {
  e.preventDefault();

  try {
    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: form.full_name,
        phone: form.phone,
        linkedin_url: form.linkedin_url,
      },
    });

    if (error) throw error;

    toast.success("Profile updated successfully");

    if (checkUserAuth) {
      await checkUserAuth();
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to update profile");
  } finally {
    setSaving(false);
  }
};
  return(
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information and account settings</p>
      </div>

      {/* Avatar section */}
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-6">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.photo_url} />
            <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{user?.full_name || "User"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="mt-1 inline-block text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{roleLabel}</span>
        </div>
      </div>

      {/* Editable fields */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-semibold text-foreground mb-1">Personal Information</h2>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm"><User className="h-3.5 w-3.5" /> Full Name</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Your full name"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm"><Mail className="h-3.5 w-3.5" /> Email Address</Label>
          <Input value={user?.email || ""} disabled className="opacity-60 cursor-not-allowed" />
          <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact your admin.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm"><Phone className="h-3.5 w-3.5" /> Phone Number</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm"><Linkedin className="h-3.5 w-3.5" /> LinkedIn Profile URL</Label>
          <Input
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            placeholder="https://linkedin.com/in/your-profile"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>

      {/* Read-only info */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Account Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Briefcase className="h-3.5 w-3.5" /> Role</Label>
            <p className="text-sm font-medium text-foreground">{roleLabel}</p>
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5" /> Company ID</Label>
            <p className="text-sm font-medium text-foreground font-mono text-xs">{user?.company_id || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}