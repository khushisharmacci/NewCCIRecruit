import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Users, Building2, Handshake, Briefcase, DollarSign, Brain, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const categories = [
{ label: "Candidates", icon: Users, color: "text-blue-400", queryKey: "candidates", entity: "Candidate", fields: ["full_name", "email", "skills", "current_company"], route: "/candidates" },
{ label: "Companies", icon: Building2, color: "text-violet-400", queryKey: "clients", entity: "Client", fields: ["name", "industry", "contact_person"], route: "/companies" },
{ label: "Leads", icon: Handshake, color: "text-amber-400", queryKey: "leads", entity: "Lead", fields: ["company_name", "contact_person", "stage"], route: "/crm" },
{ label: "Positions", icon: Briefcase, color: "text-emerald-400", queryKey: "positions", entity: "Position", fields: ["title", "client_name", "location"], route: "/candidates" }];


function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark className="bg-amber-500/20 text-amber-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef(null);

  const { data: candidates = [] } = useQuery({
  queryKey: ["candidates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});
  const { data: clients = [] } = useQuery({
  queryKey: ["clients"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});
  const { data: leads = [] } = useQuery({
  queryKey: ["leads"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*");

    if (error) throw error;

    return data || [];
  },
});
  const { data: positions = [] } = useQuery({
  queryKey: ["positions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*");

    if (error) throw error;

    return data || [];
  }
});

  const dataMap = { candidates, clients, leads, positions };

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {e.preventDefault();setOpen(true);}
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);else
    {setQuery("");setAiMode(false);setAiResult("");}
  }, [open]);

  const isNaturalLanguage = query.length > 20 || /\b(show|find|list|who|with|more than|less than|interviewed|last|month|year|ago|has|from)\b/i.test(query);

  const handleSearch = async () => {
    if (!query.trim() || !isNaturalLanguage) return;
    setAiLoading(true);setAiMode(true);
    const context = `Candidates: ${candidates.slice(0, 20).map((c) => `${c.full_name} (${c.skills}, ${c.experience_years}y, ${c.status}, ${c.location})`).join("; ")}`;
    const handleSearch = async () => {
  setAiMode(true);
  setAiResult(
    "AI Search is temporarily disabled while migrating from Base44 to Supabase."
  );
};
    setAiResult(typeof res === "string" ? res : res?.response || res?.text || JSON.stringify(res) || "No results found.");
    setAiLoading(false);
  };

  const results = query.trim().length < 2 ? [] : categories.flatMap((cat) => {
    const items = dataMap[cat.queryKey] || [];
    return items.
    filter((item) => cat.fields.some((f) => item[f]?.toLowerCase().includes(query.toLowerCase()))).
    slice(0, 4).
    map((item) => ({ cat, item, display: item[cat.fields[0]] || "", sub: item[cat.fields[1]] || "" }));
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted hover:text-foreground transition-colors text-sm text-muted-foreground bg-muted/50">
        
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search anything...</span>
        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs bg-background rounded border border-border">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="flex items-center border-b border-border px-4 gap-3">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {setQuery(e.target.value);setAiMode(false);setAiResult("");}}
              onKeyDown={(e) => e.key === "Enter" && isNaturalLanguage && handleSearch()}
              placeholder='Search candidates, companies, leads... or ask "Show Java devs with 5+ years"'
              className="border-0 shadow-none focus-visible:ring-0 h-14 text-base text-foreground" />
            
            {isNaturalLanguage && query.length > 2 &&
            <button
              onClick={handleSearch}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium shrink-0 hover:bg-primary/90 disabled:opacity-50">
              
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                Ask AI
              </button>
            }
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {aiMode ?
            <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">AI Answer</span>
                </div>
                {aiLoading ?
              <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Analyzing data...</span></div> :

              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aiResult}</p>
              }
              </div> :
            results.length > 0 ?
            <div className="p-2">
                {categories.map((cat) => {
                const catResults = results.filter((r) => r.cat.label === cat.label);
                if (!catResults.length) return null;
                return (
                  <div key={cat.label} className="mb-3">
                      <div className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide", cat.color)}>
                        <cat.icon className="h-3.5 w-3.5" />{cat.label}
                      </div>
                      {catResults.map(({ item, display, sub }, i) =>
                    <Link
                      key={i}
                      to={`${cat.route}${cat.label === "Candidates" ? `/${item.id}` : ""}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                      
                          <div>
                            <p className="text-sm font-medium text-foreground">{highlight(display, query)}</p>
                            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                          </div>
                          {item.status && <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">{item.status}</span>}
                        </Link>
                    )}
                    </div>);

              })}
              </div> :
            query.length >= 2 ?
            <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No results for "{query}"</p>
                {isNaturalLanguage && <p className="text-xs mt-1">Press Enter or click "Ask AI" for an AI-powered search</p>}
              </div> :

            <div className="p-5 space-y-2">
                <p className="text-xs font-medium px-1 mb-3 text-[hsl(var(--chart-3))]">QUICK LINKS</p>
                {categories.map((cat) =>
              <Link key={cat.label} to={cat.route} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <cat.icon className={cn("h-4 w-4", cat.color)} />
                    <span className="text-sm text-foreground">{cat.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{dataMap[cat.queryKey]?.length || 0} records</span>
                  </Link>
              )}
              </div>
            }
          </div>
        </DialogContent>
      </Dialog>
    </>);

}