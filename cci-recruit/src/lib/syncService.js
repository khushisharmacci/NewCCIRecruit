/**
 * Central synchronization service for Spreadsheet ↔ Candidates ↔ Call Logs.
 * Handles two-way sync, duplicate detection, field mapping, and remarks sync.
 */
import { supabase } from "@/lib/supabase";

// ─── Field Mapping ─────────────────────────────────────────────────────────
// Maps candidate entity fields to common spreadsheet column header aliases.
const FIELD_ALIASES = {
  row_order: ["sr.no.", "sr no", "sr. no", "s.no.", "s. no", "s no", "serial number"],
  full_name: ["candidate name", "name", "full name", "candidate", "candidate full name"],
  email: ["email", "email id", "mail", "email address"],
  phone: ["contact number", "phone", "phone number", "mobile", "contact", "mobile number", "contact no"],
  current_company: ["current organization", "current company", "company", "organization", "current org"],
  current_job_role: ["current role", "role", "designation", "current designation"],
  skills: ["skills", "key skills", "skillset", "primary skills"],
  experience_years: ["experience", "total experience", "exp", "experience (yrs)", "total exp"],
  expected_ctc: ["expected ctc", "expected salary", "expected ctc (lakhs)", "expected ctc (lpa)"],
  location: ["location", "city", "current location", "current city"],
  source: ["source", "sourced from", "sourcing channel"],
  position: ["position", "position title", "job title", "role applied for", "position applied for"],
  notes: ["notes", "comments", "remarks/comments", "remarks/notes"],
  remarks: ["remarks by sir", "remarks"],
  status: ["status", "candidate status"],
  assigned_to: ["recruiter", "assigned to", "recruiter name", "assigned recruiter"],
  linkedin: ["linkedin", "linkedin profile link", "linkedin link"],
  academics: ["academics", "education", "qualification"],
  current_ctc: ["current fixed ctc", "current ctc", "fixed ctc", "ctc"],
  sourced_by: ["sourced by", "sourced_by"],
  hr: ["hr", "hr name", "hr recruiter"],
  sent_on: ["sent on", "sent_on", "date sent", "submission date"],
  updated_by: ["updated by", "updated_by"],
  spoken_by: ["spoken by", "spoken_by"],
  candidate_date: ["candidate date", "candidate_date"],
};

/**
 * Map a single spreadsheet column header to a candidate entity field.
 */
export function mapHeaderToField(header) {
  const normalized = String(header).toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
}

/**
 * Auto-detect mappings for a set of spreadsheet columns.
 * Returns { [headerName]: candidateField } for matched columns.
 */
export function autoDetectMappings(columns) {
  const mappings = {};
  columns.forEach((col) => {
    const field = mapHeaderToField(col);
    if (field) mappings[col] = field;
  });
  return mappings;
}

/**
 * Get the spreadsheet column that maps to a given candidate field.
 */
export function getColumnForField(field, columns) {
  const mappings = autoDetectMappings(columns);
  return Object.entries(mappings).find(([, f]) => f === field)?.[0] || null;
}

// ─── Row ID Generation ──────────────────────────────────────────────────────
export function generateRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Duplicate Detection ───────────────────────────────────────────────────
/**
 * Find a duplicate candidate by name, phone, or email.
 * Returns the existing candidate or null.
 */
export async function findDuplicateCandidate(name, phone, email) {
  if (email && !email.includes("placeholder.local")) {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (data?.length) return data[0];
  }

  if (phone) {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("phone", phone)
      .limit(1);

    if (data?.length) return data[0];
  }

  if (name) {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("full_name", name);

    if (data?.length) {
      if (phone) {
        const exact = data.find(c => c.phone === phone);
        if (exact) return exact;
      }

      if (!phone && !email) return data[0];
    }
  }

  return null;
} 

// ─── Spreadsheet Row ↔ Candidate Sync ───────────────────────────────────────

export async function syncRowToCandidate(row, dataFile, tenantFilter, stampRecord) {
  const columns = typeof dataFile.columns === "string" ? JSON.parse(dataFile.columns || "[]") : (dataFile.columns || []);
  const mappings = autoDetectMappings(columns);

  const candidateData = {};
  Object.entries(mappings).forEach(([header, field]) => {
    const val = row[header];
    if (val !== undefined && val !== null) {
      const strVal = String(val).trim();
      
      // Filter out whitespace-only strings
      if (strVal === "") {
        if (["experience_years", "expected_ctc", "current_ctc", "expected_salary", "row_order", "sent_on", "candidate_date"].includes(field)) {
          candidateData[field] = null;
        } else {
          candidateData[field] = "";
        }
        return;
      }

      if (["experience_years", "expected_ctc", "current_ctc", "expected_salary", "row_order"].includes(field)) {
        const num = parseFloat(strVal.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) candidateData[field] = num;
      } else if (field === "sent_on" || field === "candidate_date") {
        if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(strVal)) {
          const [day, month, year] = strVal.split(/[-/]/);
          candidateData[field] = `${year}-${month}-${day}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
          candidateData[field] = strVal;
        } else {
          candidateData[field] = null;
        }
      } else {
        candidateData[field] = val;
      }
    }
  });

  // Ensure required fields
  if (!candidateData.full_name) return { candidate: null, row };
  if (!candidateData.email) candidateData.email = `noemail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@placeholder.local`;
  if (!candidateData.status) candidateData.status = "Applied";
  if (!candidateData.source) candidateData.source = "Direct";

  // Check for duplicate
  const existing = await findDuplicateCandidate(
    candidateData.full_name,
    candidateData.phone,
    candidateData.email,
    tenantFilter
  );

  const rowId = row._row_id || generateRowId();

  if (existing) {
    // Update existing candidate
    const { data: updated, error } = await supabase
      .from("candidates")
      .update({
        ...candidateData,
        data_file_id: dataFile.id,
        spreadsheet_id: dataFile.id,
        spreadsheet_row_id: rowId,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return { candidate: updated, row: { ...row, _row_id: rowId, _candidate_id: updated.id } };
  }

  // Create new candidate
  const { data: newCandidate, error } = await supabase
    .from("candidates")
    .insert([stampRecord ? stampRecord({
      ...candidateData,
      data_file_id: dataFile.id,
      spreadsheet_id: dataFile.id,
      spreadsheet_row_id: rowId,
    }) : {
      ...candidateData,
      data_file_id: dataFile.id,
      spreadsheet_id: dataFile.id,
      spreadsheet_row_id: rowId,
    }])
    .select()
    .single();

  if (error) throw error;
  return { candidate: newCandidate, row: { ...row, _row_id: rowId, _candidate_id: newCandidate.id } };
}

/**
 * Create or update a spreadsheet row from a candidate.
 * Returns { rows, row_id } - the full updated rows array and the row ID.
 */
export function syncCandidateToRow(candidate, dataFile) {
  const columns = JSON.parse(dataFile.columns || "[]");
  const mappings = autoDetectMappings(columns);
  let rows = [];
  try { rows = JSON.parse(dataFile.rows_data || "[]"); } catch { rows = []; }

  // Find existing row by _candidate_id or _row_id
  let rowIdx = rows.findIndex((r) =>
    (r._candidate_id && r._candidate_id === candidate.id) ||
    (candidate.spreadsheet_row_id && r._row_id === candidate.spreadsheet_row_id)
  );

  const rowData = {};
  columns.forEach((col) => {
    const field = mappings[col];
    if (field && candidate[field] !== undefined && candidate[field] !== null) {
      rowData[col] = String(candidate[field]);
    } else {
      rowData[col] = rowIdx >= 0 ? (rows[rowIdx][col] || "") : "";
    }
  });

  rowData._row_id = rowIdx >= 0 ? (rows[rowIdx]._row_id || generateRowId()) : generateRowId();
  rowData._candidate_id = candidate.id;

  if (rowIdx >= 0) {
    rows[rowIdx] = rowData;
  } else {
    rows.push(rowData);
  }

  return { rows, row_id: rowData._row_id };
}

// ─── Save Spreadsheet ───────────────────────────────────────────────────────
/**
 * Save rows back to a DataFile entity.
 */
export async function saveSpreadsheetRows(dataFileID, rows) {
  const { data, error } = await supabase
    .from("data_files")
    .update({
      rows_data: rows,
      row_count: rows.filter((r) => !r._row_id || !String(r._row_id).startsWith("__deleted")).length,
    })
    .eq("id", dataFileID)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Remarks Synchronization ────────────────────────────────────────────────
/**
 * Sync remarks/notes across Candidate, Spreadsheet, and optionally Call Log.
 * This is the single source of truth for remarks.
 */
export async function syncRemarks({ candidateId, remarks, spreadsheetId, spreadsheetRowId, callLogId }) {
  const updates = [];

  // Update candidate notes
  if (candidateId) {
    updates.push(
      supabase
        .from("candidates")
        .update({ notes: remarks })
        .eq("id", candidateId)
    );
  }

  // Update spreadsheet remarks column
  if (spreadsheetId) {
    try {
      const { data: dataFile, error: fileError } = await supabase
        .from("data_files")
        .select("*")
        .eq("id", spreadsheetId)
        .single();

      if (!fileError && dataFile) {
        const columns = typeof dataFile.columns === "string" ? JSON.parse(dataFile.columns || "[]") : dataFile.columns || [];
        const remarksCol = getColumnForField("notes", columns);
        if (remarksCol) {
          let rows = [];
          try {
            rows = typeof dataFile.rows_data === "string" ? JSON.parse(dataFile.rows_data || "[]") : dataFile.rows_data || [];
          } catch {
            rows = [];
          }
          const rowIdx = rows.findIndex((r) =>
            (spreadsheetRowId && String(r._row_id) === String(spreadsheetRowId)) ||
            (candidateId && r._candidate_id === candidateId)
          );
          if (rowIdx >= 0) {
            rows[rowIdx][remarksCol] = remarks;
            updates.push(
              supabase
                .from("data_files")
                .update({ rows_data: rows })
                .eq("id", spreadsheetId)
            );
          }
        }
      }
    } catch (err) {
      console.error("Error syncing remarks to spreadsheet:", err);
    }
  }

  // Update call log discussion notes
  if (callLogId) {
    updates.push(
      supabase
        .from("daily_report_call_logs")
        .update({ discussion_notes: remarks })
        .eq("id", callLogId)
    );
  }

  await Promise.all(updates);
}

// ─── Full Import Sync ───────────────────────────────────────────────────────
/**
 * Process all rows in a spreadsheet and sync them to candidates.
 * Used during import or manual "Sync to Candidates" action.
 *
 * @returns { created, updated, failed }
 */
export async function syncSpreadsheetToCandidates(dataFile, tenantFilter, stampRecord) {
  const columns = typeof dataFile.columns === "string" ? JSON.parse(dataFile.columns || "[]") : (dataFile.columns || []);
  let rows = [];
  try {
    rows = typeof dataFile.rows_data === "string" ? JSON.parse(dataFile.rows_data || "[]") : (dataFile.rows_data || []);
  } catch {
    rows = [];
  }

  let created = 0, updated = 0, failed = 0;
  const BATCH = 25;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async (row) => {
      try {
        const result = await syncRowToCandidate(row, dataFile, tenantFilter, stampRecord);
        if (result.candidate) {
          // Update the row with linking data
          Object.assign(row, result.row);
          if (result.candidate.created_at === result.candidate.updated_at) {
            created++;
          } else {
            updated++;
          }
        } else {
          failed++;
        }
      } catch (err) {
        console.error("Row sync failed:", err);
        failed++;
      }
    }));
  }

  // Save updated rows back to spreadsheet with _row_id and _candidate_id
  await saveSpreadsheetRows(dataFile.id, rows);

  return { created, updated, failed, total: rows.length };
}