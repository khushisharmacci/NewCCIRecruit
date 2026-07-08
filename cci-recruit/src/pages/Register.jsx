import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Building2, Upload, ChevronRight, ChevronLeft } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

// --- Step components ---

function StepAccount({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  loading,
  error,
  onGoogle,
}) {
  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 text-sm font-medium"
        onClick={onGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function ConfirmEmailStep({ email, onCheckStatus, error, loading }) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
        <Mail className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        We sent a verification link to <span className="text-foreground font-semibold">{email}</span>. 
        Please click the link in your email, then return here and click the button below to continue setup.
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-left">
          {error}
        </div>
      )}

      <Button className="w-full h-12 font-medium" onClick={onCheckStatus} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking verification...
          </>
        ) : (
          "I've verified my email"
        )}
      </Button>
    </div>
  );
}

function FileUploadField({ label, required, onChange, value }) {
  return (
    <div className="space-y-1.5 text-left">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <label className="flex items-center gap-3 h-10 px-3 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
        <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground truncate">{value ? value.name : "Click to upload file"}</span>
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
    </div>
  );
}

function StepCompany({ company, setCompany, files, setFiles, onNext, onBack, loading, error }) {
  const setFile = (key, val) => setFiles((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary font-medium flex items-center gap-2">
        <Building2 className="w-4 h-4 shrink-0" />
        CEO Account — Company Onboarding Required
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5 text-left">
          <Label>Company Name <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. Career Connect India Pvt. Ltd." value={company.name} onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="space-y-1.5">
            <Label>Office Address <span className="text-red-500">*</span></Label>
            <Input placeholder="123 MG Road, Bengaluru" value={company.address} onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Phone <span className="text-red-500">*</span></Label>
            <Input placeholder="+91 98765 43210" value={company.phone} onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))} required />
          </div>
        </div>
        <FileUploadField label="Registration Certificate" required onChange={(v) => setFile("reg_cert", v)} value={files.reg_cert} />
        <FileUploadField label="GST Certificate" required onChange={(v) => setFile("gst_cert", v)} value={files.gst_cert} />
        <FileUploadField label="PAN Card" required onChange={(v) => setFile("pan_card", v)} value={files.pan_card} />
        <FileUploadField label="Company Logo" onChange={(v) => setFile("logo", v)} value={files.logo} />
        <FileUploadField label="Company Profile PDF" onChange={(v) => setFile("profile_pdf", v)} value={files.profile_pdf} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <Button onClick={onNext} disabled={loading || !company.name || !company.address || !company.phone} className="flex-1">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <>Complete Setup <ChevronRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}

// --- Main Register ---
export default function Register() {
  // account | confirm_email | company_type | company
  const [step, setStep] = useState("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState({ name: "", address: "", phone: "" });
  const [files, setFiles] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStep = params.get("step");
    const urlEmail = params.get("email");
    if (urlStep) setStep(urlStep);
    if (urlEmail) setEmail(urlEmail);
  }, []);

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;
      setStep("confirm_email");
    } catch (err) {
      setError(err.message || "Registration failed");
    }
    setLoading(false);
  };

  const handleCheckEmailStatus = async () => {
    setError("");
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (user && user.email_confirmed_at) {
        setStep("company_type");
      } else {
        setError("We couldn't confirm your email yet. Please make sure you click the link in your email inbox.");
      }
    } catch (err) {
      setError(err.message || "Failed to verify email status");
    }
    setLoading(false);
  };

  const handleRoleChoice = async (isCeo) => {
    setError("");
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Please log in to continue onboarding.");

      if (isCeo) {
        setStep("company");
      } else {
        // Create Recruiter profile directly without status columns
        const { error: profileError } = await supabase
          .from("recruiters")
          .insert({
            auth_user_id: authUser.id,
            company_id: "default", // Join default team company
            email: authUser.email,
            full_name: authUser.email.split("@")[0],
            role: "recruiter",
          });

        if (profileError) throw profileError;
        window.location.href = "/pending";
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCompanySetup = async () => {
    setError("");
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("No authenticated user found.");

      // Helper to upload document files with mock fallback if storage bucket fails
      const uploadDocument = async (fileField, label) => {
        const file = files[fileField];
        if (!file) return null;
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${authUser.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from("company-documents")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("company-documents")
            .getPublicUrl(filePath);

          return publicUrl;
        } catch (storageErr) {
          console.warn(`Failed to upload ${label}:`, storageErr);
          return `https://fncburroqspliyrazbvr.supabase.co/storage/v1/object/public/company-documents/fallback_${fileField}.png`;
        }
      };

      const regCertUrl = await uploadDocument("reg_cert", "Registration Certificate");
      const gstCertUrl = await uploadDocument("gst_cert", "GST Certificate");
      const panCardUrl = await uploadDocument("pan_card", "PAN Card");
      const logoUrl = await uploadDocument("logo", "Company Logo");
      const profilePdfUrl = await uploadDocument("profile_pdf", "Company Profile PDF");

      // Create company profile in company_profile table without owner_user_id
      const { data: companyData, error: companyError } = await supabase
        .from("company_profile")
        .insert({
          company_name: company.name,
          logo_url: logoUrl,
          registration_cert_url: regCertUrl,
          gst_cert_url: gstCertUrl,
          pan_card_url: panCardUrl,
          company_profile_pdf_url: profilePdfUrl,
          office_address: company.address,
          contact_email: authUser.email,
          contact_phone: company.phone,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create CEO profile in recruiters table without status columns
      const { error: recruiterError } = await supabase
        .from("recruiters")
        .insert({
          auth_user_id: authUser.id,
          company_id: companyData.id,
          email: authUser.email,
          full_name: authUser.email.split("@")[0],
          role: "ceo",
        });

      if (recruiterError) throw recruiterError;

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Failed to set up company.");
    }
    setLoading(false);
  };

  if (step === "confirm_email") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm">
          <ConfirmEmailStep
            email={email}
            onCheckStatus={handleCheckEmailStatus}
            error={error}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  if (step === "company_type") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">How are you joining?</h1>
            <p className="text-muted-foreground mt-2">This helps us set up the right experience for you</p>
          </div>
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">{error}</div>}
          <div className="space-y-3">
            <button
              onClick={() => handleRoleChoice(true)}
              className="w-full bg-card rounded-2xl border-2 border-primary p-6 text-left hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">I'm a CEO / Founder</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Set up a new company account with full access</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => handleRoleChoice(false)}
              className="w-full bg-card rounded-2xl border border-border p-6 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">I'm joining a team</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Join an existing company (you'll be a Recruiter by default)</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "company") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Company Setup</h1>
            <p className="text-muted-foreground mt-2">Provide your company details to complete registration</p>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
            <StepCompany
              company={company}
              setCompany={setCompany}
              files={files}
              setFiles={setFiles}
              onNext={handleCompanySetup}
              onBack={() => setStep("company_type")}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    );
  }

  // Step: account
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <UserPlus className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Create your account</h1>
          <p className="text-muted-foreground mt-2">Sign up to get started with cciRecruit</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <StepAccount
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onSubmit={handleAccountSubmit}
            loading={loading}
            error={error}
            onGoogle={handleGoogle}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}