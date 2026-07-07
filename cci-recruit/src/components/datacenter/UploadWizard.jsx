import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileSpreadsheet, Loader2, ChevronRight,
  CheckCircle, AlertCircle, RefreshCw, X, Eye, FolderPlus, ArrowRight, Table2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import ColumnMapper from "@/components/datacenter/ColumnMapper";

// ─── Entity Field Definitions ─────────────────────────────────────────────────
const ENTITY_FIELDS = {
  Candidate: {
  required: [
    "full_name",
    "email",
    "phone",
  ],

  optional: [
    "row_order",
    "experience_years",
    "current_company",
    "current_ctc",
    "expected_ctc",
    "location",
    "academics",
    "source",
    "sourced_by",
    "hr",
    "linkedin",
    "sent_on",
    "position",
    "remarks",
  ],

  labels: {
    row_order: "SR.NO.",
    full_name: "Candidate Name",
    email: "Email ID",
    phone: "Contact Number",
    experience_years: "Experience (Yrs)",
    current_company: "Current Org",
    current_ctc: "Current CTC",
    expected_ctc: "Expected CTC",
    location: "Location",
    academics: "Academics",
    source: "Source",
    sourced_by: "Sourced By",
    hr: "HR",
    linkedin: "LinkedIn Profile Link",
    sent_on: "Sent On",
    position: "Position",
    remarks: "Remarks",
  },

  defaults: {
    status: "Applied",
  },
  },
  Client: {
    required: ["name"],
    optional: ["industry", "contact_person", "contact_email", "contact_phone", "address", "notes"],
    labels: { name: "Company Name", industry: "Industry", contact_person: "Contact Person", contact_email: "Email", contact_phone: "Phone", address: "Address", notes: "Notes" },
    defaults: { status: "Active" }
  },
  Lead: {
    required: ["company_name", "contact_person"],
    optional: ["email", "phone", "value", "source", "notes"],
    labels: { company_name: "Company", contact_person: "Contact", email: "Email", phone: "Phone", value: "Value", source: "Source", notes: "Notes" },
    defaults: { stage: "New Lead" }
  },
  Position: {
    required: ["title"],
    optional: ["client_name", "department", "experience_min", "experience_max", "skills_required", "location", "salary_min", "salary_max", "description", "openings"],
    labels: { title: "Job Title", client_name: "Client", department: "Department", experience_min: "Min Exp", experience_max: "Max Exp", skills_required: "Skills Required", location: "Location", salary_min: "Min Salary", salary_max: "Max Salary", description: "Description", openings: "Openings" },
    defaults: { status: "Open", openings: 1 }
  },
  RevenueRecord: {
    required: ["client_name", "amount", "date"],
    optional: ["recruiter_name", "candidate_name", "type", "invoice_number"],
    labels: { client_name: "Client", amount: "Amount", date: "Date", recruiter_name: "Recruiter", candidate_name: "Candidate", type: "Type", invoice_number: "Invoice #" },
    defaults: { status: "Pending", type: "Placement Fee" }
  },
  TeamGroup: {
    required: ["name"],
    optional: ["lead_name", "department", "members", "description"],
    labels: { name: "Team Name", lead_name: "Team Lead", department: "Department", members: "Members", description: "Description" },
    defaults: {}
  }
};

const NUMERIC_FIELDS = ["row_order", "experience_years", "expected_s", "salary_min", "salary_max", "experience_min", "experience_max", "openings", "amount", "value"];

// ─── File Parsing (client-side) ──────────────────────────────────────────────
function parseFile(file) {
  return new Promise((resolve, reject) => {
    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read file"));

    if (isCSV) {
      reader.onload = (e) => {
        Papa.parse(e.target.result, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const hdrs = results.meta.fields || [];
            const rows = results.data.map((row) => {
              const clean = {};
              hdrs.forEach((h) => { clean[h] = row[h] != null ? String(row[h]) : ""; });
              return clean;
            });
            resolve({ headers: hdrs, rows, sheets: ["Sheet1"] });
          },
          error: reject
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, {
    type: "array",
    cellDates: true,
});

const workbookSheets = [];

for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];

    const raw = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
    });

    if (raw.length === 0) {
        workbookSheets.push({
            name: sheetName,
            columns: [],
            rows: [],
        });
        continue;
    }

    const columns = raw[0]
        .map((h) => String(h ?? "").trim())
        .filter(Boolean);

    const rows = raw
        .slice(1)
        .filter((r) => r.some((c) => c !== "" && c != null))
        .map((r) => {
            const obj = {};

            columns.forEach((column, index) => {
                const value = r[index];

                obj[column] =
                    value instanceof Date
                        ? value.toISOString().split("T")[0]
                        : value != null
                        ? String(value)
                        : "";
            });

            return obj;
        });

    workbookSheets.push({
        name: sheetName,
        columns,
        rows,
    });
}


        resolve({
    headers:
        workbookSheets[0]?.columns ?? [],

    rows:
        workbookSheets[0]?.rows ?? [],

    sheets: workbookSheets,
});
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

// ─── Step indicator ──────────────────────────────────────────────────────────
const STEPS = [
  { key: "folder", label: "Folder" },
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Map" },
  { key: "preview", label: "Preview" },
  { key: "done", label: "Done" }
];

function StepBar({ current }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-5">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
            i < idx ? "bg-emerald-500 text-white" :
            i === idx ? "bg-primary text-primary-foreground" :
            "bg-muted text-muted-foreground"
          )}>
            {i < idx ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn("hidden sm:inline text-xs", i === idx ? "font-medium text-foreground" : "text-muted-foreground")}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────
export default function UploadWizard({
  folders,
  onDone,
  onCreateFolder,
  queryClient,
  editingFile,
}) {
  const { stampRecord, companyId } = useTenant();
  const [step, setStep] = useState("folder");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [entity, setEntity] = useState("Candidate");

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [allRows, setAllRows] = useState([]);

  const [mappings, setMappings] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const entityDef = ENTITY_FIELDS[entity];
  

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const folder = await onCreateFolder(newFolderName.trim());
    setSelectedFolder(folder);
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const handleFileDrop = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setParseError(null);
    setParsing(true);
    try {
      const { headers: h, rows: r, sheets: s } = await parseFile(f);
      if (h.length === 0) throw new Error("No column headers found. Make sure row 1 contains column names.");
      setHeaders(h);
      setAllRows(r);
      setSheets(s);
      setMappings({});
      setCustomFields([]);
      toast.success(`Parsed ${r.length.toLocaleString()} rows · ${h.length} columns`);
    } catch (err) {
      setParseError(err.message || "Failed to parse file");
      toast.error(err.message || "Failed to parse file");
    }
    setParsing(false);
  }, []);

 

//==================================================================================
const handleImport = async () => {
  console.log("=== HANDLE IMPORT STARTED ===");
let success = 0;
let failed = 0;
  setImporting(true);

  if (!file) {
    toast.error("No file selected.");
    setImporting(false);
    return;
  }
const tableMap = {
  Candidate: "candidates",
  Client: "clients",
  Lead: "leads",
  Position: "positions",
  RevenueRecord: "revenue_records",
  TeamGroup: "team_groups",
};

const tableName = tableMap[entity];

if (!tableName) {
  toast.error(`Unknown entity: ${entity}`);
  setImporting(false);
  return;
}
  try {
    // Save uploaded spreadsheet metadata

    const { data: dataFile, error: fileError } = await supabase
      .from("data_files")
      .insert([
        {
          company_id: companyId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          original_filename: file.name,
          folder_id: selectedFolder?.id ?? null,
          folder_name: selectedFolder?.name ?? null,
          entity_type: entity,
          row_count: allRows.length,
          column_count: headers.length,
          columns: headers,
          rows_data: allRows.slice(0, 10000),
          worksheets: sheets,
          imported_count: 0,
          sync_status: "processing",
          size_bytes: file.size ?? 0,
        },
      ])
      .select()
      .single();

    if (fileError) throw fileError;

    const spreadsheetRows = [];

    const BATCH_SIZE = 50;

    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (row) => {
          const record = {
            ...entityDef.defaults,
          };

          const customData = {};

          Object.entries(mappings).forEach(([header, field]) => {
            if (!field) return;

            if (row[header] === undefined) return;

            if (row[header] === "") return;

            const value = row[header];

            let converted = value;

if (NUMERIC_FIELDS.includes(field)) {
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  converted = cleaned ? Number(cleaned) : null;
}
// Convert DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
if (field === "sent_on" && value) {
  const str = String(value).trim();

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    const [day, month, year] = str.split(/[-/]/);
    converted = `${year}-${month}-${day}`;
  }
}
            if (customFields.find((cf) => cf.key === field)) {
              customData[field] = converted;
            } else {
              record[field] = converted;
            }
          });

          if (
  Object.keys(customData).length &&
  entityDef.optional.includes("remarks")
) {
  record.remarks = record.remarks
    ? record.remarks +
      "\n\nCustom Fields:\n" +
      JSON.stringify(customData, null, 2)
    : "Custom Fields:\n" +
      JSON.stringify(customData, null, 2);
}

           record.company_id = companyId;

           if (entity === "Candidate") {
           record.data_file_id = dataFile.id;
           record.spreadsheet_id = dataFile.id;
          }

          try {
            const { data: inserted, error } = await supabase
  .from(tableName)
  .insert([record])
  .select()
  .single();

if (error) throw error;

console.log("INSERT RECORD", record);

if (error) {
  console.error("SUPABASE INSERT ERROR:", error);
  throw error;
}

            success++;
            if (entity === "Candidate") {
              spreadsheetRows.push({
             __id: crypto.randomUUID(),

             ...row,

             _candidate_id: inserted.id,
              spreadsheet_id: dataFile.id,
});
  
}
          } catch (err) {
  console.error("=================================");
  console.error("IMPORT FAILED");
  console.error("Row Number:", i + batch.indexOf(row) + 2);

  console.log("TABLE:", tableName);
  console.log("RECORD:", record);
  console.log("ROW:", row);

  console.error("MESSAGE:", err.message);
  console.error("DETAILS:", err.details);
  console.error("HINT:", err.hint);
  console.error("CODE:", err.code);

  failed++;

  // TEMPORARY: stop on first error so we can see it
  throw err;
}
        })
      );
    }

    const { error: updateError } = await supabase
    .from("data_files")
    .update({
        imported_count: success,
        sync_status: failed === 0 ? "synced" : "error",

        rows_data: spreadsheetRows,
    })
    .eq("id", dataFile.id);

    if (updateError) {
      console.error(updateError);
    }

    queryClient.invalidateQueries();

    setImportResult({
      success,
      failed,
      total: allRows.length,
    });

    setStep("done");

    toast.success(
      `${success.toLocaleString()} records imported successfully!`
    );
  } catch (err) {
    console.error("IMPORT FAILED:", err);

    toast.error(err.message || "Import failed.");
  }

  setImporting(false);
};

  const handleMappingContinue = (finalMappings, finalCustomFields) => {
    setMappings(finalMappings);
    setCustomFields(finalCustomFields);
    setStep("preview");
  };

  // ── STEP: Folder ──────────────────────────────────────────────────────────
  if (step === "folder") return (
    <div className="space-y-5">
      <StepBar current="folder" />
      <div>
        <h3 className="text-lg font-semibold text-foreground">Choose Destination Folder</h3>
        <p className="text-sm text-muted-foreground mt-1">Organize your file into a folder before uploading</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedFolder(null)}
          className={cn("p-3 rounded-xl border-2 text-left transition-all", selectedFolder === null ? "border-primary bg-primary/5" : "border-dashed border-border hover:border-primary/40 bg-card")}>
          <p className="font-medium text-sm text-muted-foreground">Root (No Folder)</p>
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolder(folder)}
            className={cn("p-3 rounded-xl border-2 text-left transition-all", selectedFolder?.id === folder.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card")}>
            <p className="font-medium text-foreground text-sm">{folder.name}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center p-3 bg-muted/30 rounded-lg border border-border">
        <FolderPlus className="h-4 w-4 shrink-0 text-accent" />
        <Input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Create new folder..."
          className="h-8 text-sm flex-1 border-0 shadow-none focus-visible:ring-0 p-0"
          onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} />
        <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>
          {creatingFolder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Sync data into entity</Label>
        <Select value={entity} onValueChange={(v) => { setEntity(v); setMappings({}); setCustomFields([]); }}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(ENTITY_FIELDS).map((e) => (
              <SelectItem key={e} value={e}>{e === "RevenueRecord" ? "Revenue Records" : e === "TeamGroup" ? "Teams" : e + "s"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button className="w-full gap-2" onClick={() => setStep("upload")}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );

  // ── STEP: Upload ───────────────────────────────────────────────────────────
  if (step === "upload") return (
    <div className="space-y-5">
      <StepBar current="upload" />
      <div>
        <h3 className="text-lg font-semibold text-foreground">Upload Spreadsheet</h3>
        <p className="text-sm text-muted-foreground">XLSX, XLS, CSV — any column structure. Parsed instantly in your browser.</p>
      </div>

      <label
        className={cn(
          "flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-2xl cursor-pointer transition-all group",
          parseError ? "border-red-400 bg-red-500/5" :
          file && !parsing && headers.length > 0 ? "border-emerald-400 bg-emerald-500/5" :
          "border-border hover:bg-muted/30 hover:border-primary/50"
        )}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}>
        {parsing ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <span className="text-sm font-medium text-foreground">Parsing file...</span>
            <span className="text-xs text-muted-foreground mt-1">Reading rows and columns</span>
          </>
        ) : file && headers.length > 0 ? (
          <>
            <CheckCircle className="h-10 w-10 text-emerald-400 mb-3" />
            <span className="text-sm font-semibold text-foreground">{file.name}</span>
            <span className="text-xs text-emerald-400 mt-1 font-medium">{allRows.length.toLocaleString()} rows · {headers.length} columns detected</span>
            <span className="text-xs text-muted-foreground mt-1">Click to replace file</span>
          </>
        ) : parseError ? (
          <>
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <span className="text-sm font-semibold text-red-400">Parse Error</span>
            <span className="text-xs text-red-300 mt-1 text-center px-4">{parseError}</span>
            <span className="text-xs text-muted-foreground mt-2">Click to try another file</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium text-muted-foreground">Click to upload or drag & drop</span>
            <span className="text-xs text-muted-foreground mt-1">XLSX · XLS · CSV — Any column format</span>
          </>
        )}
        <input type="file" className="hidden" accept=".xlsx,.csv,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); e.target.value = ""; }} />
      </label>

      {file && sheets.length > 1 && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
          <Table2 className="h-4 w-4 shrink-0" />
          This file has {sheets.length} sheets. Currently reading:
<strong className="text-foreground">
    {sheets[0].name}
</strong>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setStep("folder")}><X className="h-4 w-4" /> Back</Button>
        <Button
          className="flex-1 gap-2"
          onClick={() => setStep("mapping")}
          disabled={!file || parsing || headers.length === 0}>
          Map Columns <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // ── STEP: Mapping ──────────────────────────────────────────────────────────
  if (step === "mapping") return (
    <div className="space-y-4">
      <StepBar current="mapping" />
      <ColumnMapper
        headers={headers}
        allRows={allRows}
        entity={entity}
        entityDef={entityDef}
        initialMappings={mappings}
        onMappingsChange={setMappings}
        onBack={() => setStep("upload")}
        onContinue={handleMappingContinue}
      />
    </div>
  );

  // ── STEP: Preview ──────────────────────────────────────────────────────────
  if (step === "preview") {
    const mappedEntries = Object.entries(mappings).filter(([, v]) => v);
    const previewRows = allRows.slice(0, 15);

    return (
      <div className="space-y-4">
        <StepBar current="preview" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Data Preview</h3>
          <p className="text-sm text-muted-foreground">{allRows.length.toLocaleString()} total rows · showing first {previewRows.length}</p>
        </div>

        <div className="overflow-auto rounded-xl border border-border max-h-64">
          <table className="w-max min-w-full text-xs">
            <thead className="sticky top-0 bg-primary z-10">
              <tr>
                <th className="px-2 py-2 text-left font-semibold w-8 border-r border-primary/30 text-primary-foreground">#</th>
                {headers.map((h) => (
                  <th key={h} className={cn("px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-primary/30 last:border-r-0 text-primary-foreground", !mappings[h] && "opacity-50")}>
                    {h}
                    {mappings[h] && <span className="ml-1 text-amber-300 text-xs">→ {entityDef.labels[mappings[h]] || mappings[h]}</span>}
                    {!mappings[h] && <span className="ml-1 text-white/40 text-xs">skip</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {previewRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-2 py-1.5 text-muted-foreground font-mono border-r border-border/40">{i + 1}</td>
                  {headers.map((h) => (
                    <td key={h} className={cn("px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate border-r border-border/40 last:border-r-0 text-foreground", !mappings[h] && "text-muted-foreground/50")}>
                      {row[h] || <span className="text-muted-foreground/30">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">{mappedEntries.length} columns</strong> will be imported into <strong className="text-foreground">{entity}</strong>.{" "}
            {headers.length - mappedEntries.length > 0 && <span>{headers.length - mappedEntries.length} columns will be skipped.</span>}
            {customFields.length > 0 && <span className="text-purple-300"> Including {customFields.length} custom field(s).</span>}
          </span>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setStep("mapping")}><RefreshCw className="h-4 w-4" /> Adjust Mapping</Button>
          <Button className="flex-1 gap-2" onClick={() => {
  console.log("IMPORT BUTTON CLICKED");
  handleImport();
}} disabled={importing}>
            {importing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importing {allRows.length.toLocaleString()} rows...</>
            ) : (
              <><Upload className="h-4 w-4" /> Import {allRows.length.toLocaleString()} Records</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── STEP: Done ─────────────────────────────────────────────────────────────
  if (step === "done" && importResult) return (
    <div className="py-8 flex flex-col items-center gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-emerald-400" />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">Import Complete!</p>
        <p className="text-muted-foreground mt-1">
          <span className="text-emerald-400 font-semibold">{importResult.success.toLocaleString()}</span> records imported successfully
        </p>
        {importResult.failed > 0 && (
          <p className="text-red-400 text-sm mt-1">{importResult.failed} records failed to import</p>
        )}
        {selectedFolder && (
          <p className="text-sm text-muted-foreground mt-2">Saved to folder: <strong className="text-foreground">{selectedFolder.name}</strong></p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={onDone} variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Upload Another</Button>
        <Button onClick={() => { onDone(); }} className="gap-2"><Table2 className="h-4 w-4" /> View Data</Button>
      </div>
    </div>
  );

  return null;
}