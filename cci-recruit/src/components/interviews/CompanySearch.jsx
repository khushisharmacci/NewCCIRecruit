import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Search, X, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CompanySearch({ value, onSelect, error }) {
  
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef(null);

  const { data: clients = [] } = useQuery({
  queryKey: ["clients"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) throw error;

    return data || [];
  },
});

  const filtered = query.trim()
    ? clients.filter(c => (c.name || "").toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : clients.slice(0, 8);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (c) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && highlight >= 0) { e.preventDefault(); handleSelect(filtered[highlight]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {value ? (
        <div className={cn("flex items-center gap-2 p-2.5 rounded-md border bg-muted/30", error && "border-red-500")}>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{value.name}</p>
            {value.industry && <p className="text-xs text-muted-foreground truncate">{value.industry}</p>}
          </div>
          <button type="button" onClick={() => onSelect(null)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className={cn("pl-9", error && "border-red-500")}
            placeholder="Search company by name..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}
      {open && !value && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">No companies found</div>
          ) : (
            filtered.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => handleSelect(c)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                  highlight === idx ? "bg-accent" : "hover:bg-muted/50"
                )}
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  {c.industry && <p className="text-xs text-muted-foreground truncate">{c.industry}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}