import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";

export default function EmployeeSelector({
  users = [],
  selected,
  onSelect,
}) {
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((user) => {
    const query = search.toLowerCase();

    return (
      (user.full_name || "").toLowerCase().includes(query) ||
      (user.email || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 font-semibold">
        Select Employee
      </h3>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          className="pl-9"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-80 space-y-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No employees found
          </p>
        ) : (
          filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                selected?.id === user.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  selected?.id === user.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                {(user.full_name || user.email || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.full_name || "Unknown"}
                </p>

                <p
                  className={cn(
                    "truncate text-xs",
                    selected?.id === user.id
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {ROLE_LABELS?.[user.role] ||
                    user.role ||
                    "Employee"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}