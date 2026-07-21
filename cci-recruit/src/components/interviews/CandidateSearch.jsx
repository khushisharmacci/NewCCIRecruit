import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant";

// Simple custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function CandidateSearch({ value, onSelect, error }) {
  const { companyId } = useTenant();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef(null);

  const debouncedQuery = useDebounce(query, 300);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates", companyId, debouncedQuery],
    queryFn: async () => {
      let q = supabase
        .from("candidates")
        .select("*")
        .eq("company_id", companyId)
        .order("full_name")
        .limit(20);

      // Perform server-side search matching name, email, or phone
      if (debouncedQuery.trim()) {
        q = q.or(`full_name.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%,phone.ilike.%${debouncedQuery}%`);
      }

      const { data, error } = await q;

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Filter out candidates with empty or placeholder names
  const validCandidates = candidates.filter(
    (c) =>
      c.full_name &&
      c.full_name.trim() !== "" &&
      !c.full_name.toLowerCase().startsWith("noemail")
  );

  const filtered = validCandidates.slice(0, 8);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
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
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
            {(value.full_name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{value.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{value.email}{value.phone ? ` · ${value.phone}` : ""}</p>
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
            placeholder="Search candidate by name, email, or phone..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}
      {open && !value && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">No candidates found</div>
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
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {(c.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}