import { useState } from "react";
import { Mail, Phone, Clock, Book, MessageCircle, ChevronDown, ChevronUp, Send, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const faqs = [
{ q: "How do I add a new candidate?", a: "Go to the Candidates section, click 'Add Candidate', fill in the details and save. You can also import candidates in bulk from the Data Center." },
{ q: "How does the Resume AI analysis work?", a: "Open any candidate's detail page, upload their resume PDF or DOCX. The AI will extract their details and you can paste a Job Description to get a match score and missing skills report." },
{ q: "How do I track attendance?", a: "Go to Attendance in the sidebar. Click 'Check In' when you start work and 'Check Out' when done. The system automatically calculates total hours worked." },
{ q: "Can I export data to Excel?", a: "Yes — most pages have an Export button (top right) that lets you download as CSV, PDF, or print directly." },
{ q: "How do I manage multiple user roles?", a: "Admins can manage users via the Settings area. Roles include Super Admin, Admin, Senior Recruiter, Recruiter, and Employee — each with different permissions." },
{ q: "How do I create folders in the Data Center?", a: "Go to Data Center, click 'New Folder' and enter a name. You can then upload Excel/CSV files into it or create tables manually." }];


export default function Help() {
  const [openFaq, setOpenFaq] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
        <p className="text-muted-foreground text-sm">Get support and learn how to use cciRecruit</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
        { label: "Candidates Guide", icon: Book },
        { label: "Data Center Help", icon: HelpCircle },
        { label: "Attendance Help", icon: Clock },
        { label: "Contact Support", icon: MessageCircle }].
        map(({ label, icon: Icon }) =>
        <div key={label} className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-2 text-center cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
        )}
      </div>

      {/* Contact Cards */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" /> Contact Support
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Phone Support</p>
              <p className="text-sm text-blue-300 font-medium mt-1">9372684219</p>
              <p className="text-sm text-blue-300 font-medium">9819855065</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Email Support</p>
              <p className="text-xs text-emerald-300 font-medium mt-1 break-all">khushisharma.cci@gmail.com</p>
              <p className="text-xs text-emerald-300 font-medium break-all">mukesh@careerconnectindia.com</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Support Hours</p>
              <p className="text-sm text-amber-300 font-medium mt-1">Mon – Sat</p>
              <p className="text-sm text-amber-300">9:00 AM – 7:00 PM IST</p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Request Form */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" /> Send a Support Request
        </h3>
        {submitted ?
        <div className="text-center py-8">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Send className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="font-semibold text-foreground">Request Submitted!</p>
            <p className="text-sm text-muted-foreground mt-1">We'll get back to you within 24 hours.</p>
            <Button variant="outline" className="mt-4" onClick={() => setSubmitted(false)}>Send Another</Button>
          </div> :

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" required /></div>
            </div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What do you need help with?" required /></div>
            <div><Label>Message</Label>
              <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your issue in detail..."
              required
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            
            </div>
            <Button type="submit" className="gap-2"><Send className="h-4 w-4" /> Submit Request</Button>
          </form>
        }
      </div>

      {/* FAQ */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
        </h3>
        <div className="space-y-2">
          {faqs.map((faq, i) =>
          <div key={i} className="border border-border rounded-lg overflow-hidden">
              <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              
                <span className="text-sm font-medium text-foreground">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {openFaq === i &&
            <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3 bg-muted/30">
                  {faq.a}
                </div>
            }
            </div>
          )}
        </div>
      </div>

      {/* User Guide */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Book className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Platform Guide</h3>
            <p className="text-sm text-muted-foreground">Quick overview of all modules</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
          { t: "Getting Started", d: "Add candidates, import data from the Data Center, and use the Dashboard to track your pipeline." },
          { t: "RecruiterIQ (AI Tools)", d: "Generate JDs, screen resumes against requirements, create interview questions, and get AI insights." },
          { t: "Resume AI Analysis", d: "Upload a PDF/DOCX resume on a candidate's page and paste a JD to get a match score and missing skills." },
          { t: "Attendance Module", d: "Check in/out daily. View daily, weekly, and monthly productivity charts and filter attendance records." },
          { t: "CRM & Leads", d: "Track leads through your pipeline from contact to closure. Set follow-up reminders and deal values." },
          { t: "Analytics", d: "Real-time analytics on recruitment performance, conversion rates, pipeline health, and revenue metrics." }].
          map(({ t, d }) =>
          <div key={t} className="p-4 rounded-lg bg-muted/50">
              <h4 className="text-sm font-semibold text-foreground">{t}</h4>
              <p className="text-sm text-muted-foreground mt-1">{d}</p>
            </div>
          )}
        </div>
      </div>
    </div>);

}