import { supabase } from "@/lib/supabase";
import { updateCandidateSpreadsheet } from "./candidateSync";

/**
 * Automatically maps spreadsheet headers to candidate database fields
 */
export function autoDetectMappings(columns) {
  const mappings = {};
  if (!columns || !Array.isArray(columns)) return mappings;

  columns.forEach(col => {
    const normalized = col.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
    
    if (/name|full\s*name|candidate\s*name/i.test(normalized)) {
      mappings[col] = "full_name";
    } else if (/email|e\s*mail|email\s*id/i.test(normalized)) {
      mappings[col] = "email";
    } else if (/phone|contact|mobile|phone\s*number|mobile\s*number/i.test(normalized)) {
      mappings[col] = "phone";
    } else if (/location|city|address/i.test(normalized)) {
      mappings[col] = "location";
    } else if (/position|role|job\s*title|designation/i.test(normalized)) {
      mappings[col] = "position";
    } else if (/remark|note|discussion|comment/i.test(normalized)) {
      mappings[col] = "notes";
    }
  });

  return mappings;
}

/**
 * Finds the spreadsheet column representing remarks/notes
 */
export function findRemarksColumn(columns) {
  if (!columns || !Array.isArray(columns)) return null;
  
  const exactMatches = ["remarks", "remark", "notes", "note", "discussion notes", "discussion", "comments", "comment"];
  for (const match of exactMatches) {
    const found = columns.find(col => col && col.toLowerCase().trim() === match);
    if (found) return found;
  }
  
  for (const col of columns) {
    if (!col) continue;
    const lower = col.toLowerCase();
    if (lower.includes("remark") || lower.includes("note") || lower.includes("discussion") || lower.includes("comment")) {
      return col;
    }
  }
  
  return null;
}

async function loadSpreadsheet(spreadsheetId) {
  const { data, error } = await supabase
    .from("data_files")
    .select("id, columns, rows_data")
    .eq("id", spreadsheetId)
    .single();

  if (error) throw error;

  return {
    ...data,
    columns: data.columns || [],
    rows:
      typeof data.rows_data === "string"
        ? JSON.parse(data.rows_data || "[]")
        : data.rows_data || [],
  };
}

async function saveSpreadsheet(fileId, rows) {
  const { error } = await supabase
    .from("data_files")
    .update({
      rows_data: rows,
    })
    .eq("id", fileId);

  if (error) throw error;
}

function buildSpreadsheetRow(columns, log, candidate) {
  const spreadsheetFields = log.spreadsheet_fields || {};
  const mappings = autoDetectMappings(columns);
  
  const row = {};

  columns.forEach((column) => {
    row[column] = "";
  });

  // 1. Map values directly matching dynamic spreadsheet fields
  Object.entries(spreadsheetFields).forEach(([header, value]) => {
    if (columns.includes(header)) {
      row[header] = value || "";
    }
  });

  // 2. Fallback to candidate fields if columns were not explicitly submitted in spreadsheetFields
  Object.entries(mappings).forEach(([column, candidateField]) => {
    if (!row[column] && candidate[candidateField]) {
      row[column] = candidate[candidateField];
    }
  });

  row.__id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  row._candidate_id = candidate.id;

  return row;
}

export async function appendCandidateRow(log, candidate) {
  if (!log.spreadsheet_id) {
    throw new Error("Missing spreadsheet.");
  }

  const sheet = await loadSpreadsheet(log.spreadsheet_id);

  const row = buildSpreadsheetRow(
    sheet.columns,
    log,
    candidate
  );

  row._row_id = sheet.rows.length + 1;

  sheet.rows.push(row);

  await saveSpreadsheet(sheet.id, sheet.rows);

  await updateCandidateSpreadsheet(
    candidate.id,
    sheet.id
  );

  return row;
}

export async function updateCandidateRemarks(
  candidate,
  remarks
) {
  if (!candidate.data_file_id) return;

  const sheet = await loadSpreadsheet(candidate.data_file_id);

  const remarksColumn = findRemarksColumn(sheet.columns);
  if (!remarksColumn) return;

  const index = sheet.rows.findIndex(
    (r) => String(r._candidate_id) === String(candidate.id)
  );

  if (index === -1) return;

  sheet.rows[index][remarksColumn] = remarks || "";

  await saveSpreadsheet(sheet.id, sheet.rows);
}