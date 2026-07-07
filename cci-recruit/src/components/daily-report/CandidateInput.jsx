import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, UserPlus } from "lucide-react";

export default function CandidateInput({ value, candidateId, candidates, onChange, error }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  const suggestions = !candidateId
  ? candidates
      .filter((c) => {
        if (!value.trim()) return true;

        const search = value.toLowerCase();

        return (
          (c.full_name || "").toLowerCase().includes(search) ||
          (c.email || "").toLowerCase().includes(search) ||
          (c.phone || "").includes(value)
        );
      })
      .slice(0, 6)
  : [];

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (e) => {
    onChange(e.target.value, "");
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const selectCandidate = (candidate) => {
    onChange(candidate.full_name, candidate.id);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectCandidate(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const showExistingBadge = !!candidateId;
  const showNewBadge = !candidateId && value.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Type a name or select existing candidate"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        className={cn(error && "border-red-500", (showExistingBadge || showNewBadge) && "pr-20")}
      />
      {showExistingBadge && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 flex items-center gap-1 pointer-events-none">
          <Check className="h-3 w-3" /> Existing
        </span>
      )}
      {showNewBadge && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 flex items-center gap-1 pointer-events-none">
          <UserPlus className="h-3 w-3" /> New
        </span>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCandidate(c)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between border-b border-border last:border-0",
                highlightedIndex === idx && "bg-accent"
              )}
            >
              <span className="font-medium text-foreground truncate">{c.full_name}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">{c.phone || c.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}