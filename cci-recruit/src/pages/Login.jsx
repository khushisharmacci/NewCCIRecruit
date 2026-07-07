import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Building2, Shield, Eye, EyeOff, ChevronDown } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

function LogoHeader() {
  return (
    <div className="flex flex-col items-center mb-8">
      <img
        src="/ccilogo.jpeg"
        alt="CCI Logo"
        className="h-16 w-16 object-contain rounded-2xl mb-3 shadow-md"
      />
      <h1 className="text-2xl font-bold text-foreground">cciRecruit</h1>
      <p className="text-muted-foreground text-sm mt-0.5">Career Connect India — Recruitment Platform</p>
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState("company"); // "company" | "platform"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Platform login secret trigger: click the CCI logo 5 times
  const [logoClicks, setLogoClicks] = useState(0);
  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setMode("platform");
      setLogoClicks(0);
      setEmail("");
      setPassword("");
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Check if profile exists in public.recruiters
      const { data: recruiter, error: lookupError } = await supabase
        .from("recruiters")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (!recruiter) {
        // Logged in but profile was not set up. Redirect to company onboarding.
        window.location.href = `/register?step=company_type&email=${encodeURIComponent(email)}`;
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to log in.");
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      },
    });

    if (error) {
      console.error(error);
      setError(error.message);
    }
  };

  if (mode === "platform") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(224,71%,6%)] px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-purple-600 flex items-center justify-center mb-3 shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
            <p className="text-purple-300 text-sm mt-0.5">Career Connect India — Internal Access Only</p>
          </div>
          <div className="bg-[hsl(224,50%,10%)] rounded-2xl border border-purple-900/50 p-8 shadow-xl">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-900/30 border border-purple-700/40 mb-6">
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="text-xs text-purple-300">Restricted access — CCI administrators only</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="email" autoFocus placeholder="admin@careerconnectindia.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-[hsl(224,50%,8%)] border-purple-900/60 text-white placeholder:text-slate-600 focus:border-purple-500" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-12 bg-[hsl(224,50%,8%)] border-purple-900/60 text-white placeholder:text-slate-600 focus:border-purple-500" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 font-medium bg-purple-600 hover:bg-purple-700 text-white">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Authenticating...</> : "Sign In to Platform"}
              </Button>
            </form>
          </div>
          <p className="text-center mt-6">
            <button onClick={() => {setMode("company");setError("");}} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              ← Back to Company Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Company Login
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[hsl(224,71%,10%)] p-10">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <img
              src="/ccilogo.jpeg"
              alt="CCI Logo"
              className="h-10 w-10 rounded-xl object-contain cursor-pointer"
              onClick={handleLogoClick}
            />
            <span className="text-white font-bold text-lg">cciRecruit</span>
          </div>
          <h2 className="text-white text-3xl font-bold leading-tight">
            Smarter Recruitment.<br />Faster Hiring.
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed">
            The all-in-one recruitment platform built for modern teams. Manage candidates, track pipelines, and close hires faster with AI-powered tools.
          </p>
          <div className="mt-10 space-y-3">
            {["CEO & Executive Dashboard", "AI-Powered Resume Analysis", "Attendance & HR Management", "Real-time Recruitment Pipeline"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                <span className="text-slate-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-700/50 pt-6">
          <p className="text-slate-500 text-xs">© 2026 Career Connect India. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <LogoHeader />
          </div>

          <div className="mb-8">
            <h2 className="font-bold text-foreground text-3xl">Welcome back!</h2>
            <p className="mt-1 text-sm text-accent">Sign in to your company account</p>
          </div>

          <Button variant="outline" className="w-full h-12 text-sm font-medium mb-5 bg-secondary text-foreground border-border" onClick={handleGoogle}>
            <GoogleIcon className="w-5 h-5 mr-2" /> Continue with Google
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">or sign in with email</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 text-destructive-foreground border border-destructive/30 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email / Username</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-12" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm mt-6 text-muted-foreground">
            New company?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">Register here</Link>
          </p>

          {/* Role badges */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">All roles supported</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["CEO", "Super Admin", "Admin", "Team Lead", "Recruiter", "Employee"].map((r) => (
                <span key={r} className="px-2.5 py-1 text-xs rounded-full bg-secondary text-secondary-foreground border border-border">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}