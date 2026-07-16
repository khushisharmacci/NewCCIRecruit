import {
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SpreadsheetToolbar({
  search,
  setSearch,
  rows,
  saving,
  addRow,
  deleteRows,
  selectedRows,
  exportCSV,
  syncToCandidates,
  undo,
  canUndo,
}) {
  return (
    <div className="border-b border-slate-700 bg-[#1b2940]">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-3 h-4 w-4 text-slate-400"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spreadsheet..."
              className="
                pl-10
                w-72
                bg-[#22324b]
                border-slate-600
                text-white
                placeholder:text-slate-400
              "
            />
          </div>

          <Button
            variant="outline"
            onClick={undo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4 mr-2"/>
            Undo
          </Button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            {rows.length} Rows
          </span>

          {saving && (
            <span className="text-sm text-blue-400">
              Saving...
            </span>
          )}

          <Button
            onClick={() => addRow.mutate()}
          >
            <Plus className="mr-2 h-4 w-4"/>
            Add Row
          </Button>

          <Button
            variant="outline"
            disabled={!selectedRows.length}
            onClick={() => {
              if (
                window.confirm(
                  `Delete ${selectedRows.length} selected rows?`
                )
              ) {
                deleteRows.mutate();
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4"/>
            Delete
          </Button>

          <Button
            variant="outline"
            onClick={() => syncToCandidates.mutate()}
            disabled={syncToCandidates.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncToCandidates.isPending ? "animate-spin" : ""}`}/>
            Sync to Candidates
          </Button>

          <Button
            variant="outline"
            onClick={exportCSV}
          >
            <Download className="mr-2 h-4 w-4"/>
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}