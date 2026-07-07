import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Building2, Upload, ChevronRight, ChevronLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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

function FileUploadField({ label, required, onChange, value }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>
      <label className="flex items-center gap-3 h-10 px-3 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
        <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground truncate">{value ? value.name : "Click to upload file"}</span>
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
    </div>);

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
        <div className="space-y-1.5">
          <Label>Company Name <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. Career Connect India Pvt. Ltd." value={company.name} onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
    </div>);

}

// --- Main Register ---
export default function Register() {
  // account | confirm_email | company_type | company
  const [step, setStep] = useState("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState({ name: "", address: "", phone: "" });
  const [files, setFiles] = useState({});

const handleGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error(error);
    setError(error.message);
  }
};

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {setError("Passwords do not match");return;}
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

console.log("Signup result", data);

setStep("confirm_email");

console.log("Signup result", data);

setStep("confirm_email");
console.log("SIGNUP DATA", data);
console.log("SIGNUP USER", data?.user);
console.log("SIGNUP SESSION", data?.session);

if (error) throw error;

setStep("otp");
    } catch (err) {setError(err.message || "Registration failed");}
    setLoading(false);
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      setStep("company_type");
    } catch (err) {setError(err.message || "Invalid verification code");}
    setLoading(false);
  };

  const handleResend = async () => {
    try {
      await supabase.auth.resend({
  type: "signup",
  email,
});
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {setError(err.message || "Failed to resend code");}
  };

  const handleRoleChoice = (choice) => {
  setIsCeo(choice);

  if (choice) {
    setStep("company");
  } else {
    window.location.href = "/pending";
  }
};

  const uploadFile = async () => {
      if (step === "confirm_email") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-md bg-card rounded-2xl border p-8">
          <ConfirmEmailStep email={email} />
        </div>
      </div>
    );
  }
  return null;
};

  const handleCompanySetup = async () => {
  toast({
    title: "Not migrated yet",
    description: "Company onboarding is still being migrated to Supabase.",
  });

  return;
};

  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Mail className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Verify your email</h1>
            <p className="text-muted-foreground mt-2">We sent a 6-digit code to {email}</p>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8 space-y-4">
            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              <button onClick={handleResend} className="text-primary font-medium hover:underline">Resend</button>
            </p>
          </div>
        </div>
      </div>);

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
          <div className="space-y-3">
            <button
              onClick={() => handleRoleChoice(true)}
              className="w-full bg-card rounded-2xl border-2 border-primary p-6 text-left hover:bg-primary/5 transition-colors">
              
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
              className="w-full bg-card rounded-2xl border border-border p-6 text-left hover:bg-muted/50 transition-colors">
              
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
      </div>);

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
              company={company} setCompany={setCompany}
              files={files} setFiles={setFiles}
              onNext={handleCompanySetup}
              onBack={() => setStep("company_type")}
              loading={loading} error={error} />
            
          </div>
        </div>
      </div>);

  }

  // Step: account
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <UserPlus className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-[hsl(var(--card))]">Create your account</h1>
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
    </div>);

}