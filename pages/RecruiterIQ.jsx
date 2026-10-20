import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import JDManagement from "@/components/jd/JDManagement";

async function callAI(prompt) {
  console.log("PROMPT RECEIVED:", prompt);

  const response = await fetch("/api/recruiter-iq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
    }),
  });

  const text = await response.text();

console.log("STATUS:", response.status);
console.log("RAW RESPONSE:", text);

if (!text) {
  throw new Error("API returned empty response");
}

const data = JSON.parse(text);

return data.result;
}

import { Brain, FileText, Search, Users, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function RecruiterIQ() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">JD Details</h1>
          <p className="text-muted-foreground text-sm">Generate comprehensive job descriptions</p>
        </div>
      </div>

      <Tabs defaultValue="jds" className="space-y-6">
        <TabsList className="bg-muted">
  <TabsTrigger value="jds" className="gap-2">
    <FileText className="h-4 w-4" />
    Job Descriptions
  </TabsTrigger>

  <TabsTrigger value="jd" className="gap-2">
    <Brain className="h-4 w-4" />
    JD Generator
  </TabsTrigger>
</TabsList>

        <TabsContent value="jds">
  <JDManagement />
</TabsContent>

<TabsContent value="jd">
  <JDGenerator />
</TabsContent>
      </Tabs>
    </div>);

}

function JDGenerator() {
  const [form, setForm] = useState({ title: "", experience: "", skills: "", industry: "", location: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
  console.log("Generate clicked");

  try {
    setLoading(true);

    const res = await callAI(`
Generate a comprehensive professional job description.

Job Title: ${form.title}
Experience: ${form.experience}
Skills: ${form.skills}
Industry: ${form.industry}
Location: ${form.location}

Include:
1. Role Summary
2. Key Responsibilities
3. Required Skills
4. Preferred Skills
5. Qualifications
6. Salary Range
7. SEO Keywords

Return in clean markdown format.
`);

    console.log("AI RESULT:", res);

setResult(res);

  } catch (err) {
    console.error("GENERATE ERROR:", err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Job Details</h3>
        <div className="space-y-3">
          <div><Label>Job Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior React Developer" /></div>
          <div><Label>Experience (Years)</Label><Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 5-8" /></div>
          <div><Label>Key Skills</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. React, TypeScript, Node.js" /></div>
          <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Technology" /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Remote / New York" /></div>
        </div>
        <Button onClick={generate} disabled={loading || !form.title} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Generating..." : "Generate Job Description"}
        </Button>
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Generated JD</h3>
        {result ?
        <div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{result}</ReactMarkdown></div> :

        <p className="text-muted-foreground text-sm text-center py-12">Fill in the details and generate a professional job description</p>
        }
      </div>
    </div>);

}

