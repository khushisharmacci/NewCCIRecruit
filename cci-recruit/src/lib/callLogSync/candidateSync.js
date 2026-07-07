import { supabase } from "@/lib/supabase";
import { findExistingCandidate } from "@/lib/duplicateDetection";
import { autoDetectMappings } from "./spreadsheetSync";

/**
 * Converts Call Log + Spreadsheet Fields into a candidate object.
 */
function buildCandidate(log) {
  const spreadsheetFields = log.spreadsheet_fields || {};
  const columns = Object.keys(spreadsheetFields);
  const mappings = autoDetectMappings(columns);

  // Initialize base fields from the call log form
  const candidate = {
    company_id: log.company_id,
    full_name: log.person_name || "",
    phone: log.phone_number || "",
    position: log.position_title || null,
    notes: log.discussion_notes || null,
  };

  // Merge mapping values from spreadsheet_fields based on auto-detection
  Object.entries(spreadsheetFields).forEach(([columnHeader, value]) => {
    const candidateField = mappings[columnHeader];
    if (candidateField && value !== undefined && value !== "") {
      candidate[candidateField] = value;
    }
  });

  // Ensure default fallback values from log form inputs
  if (log.person_name) candidate.full_name = log.person_name;
  if (log.phone_number) candidate.phone = log.phone_number;
  if (log.position_title) candidate.position = log.position_title;
  if (log.discussion_notes) candidate.notes = log.discussion_notes;

  return candidate;
}

/**
 * Returns existing candidate if duplicate found.
 * Otherwise creates a new one.
 */
export async function createOrGetCandidate(log) {
  if (!log) throw new Error("Missing call log.");

  const candidate = buildCandidate(log);

  // Use the native async duplicate checker from your duplicateDetection.js
  const duplicate = await findExistingCandidate(candidate);

  if (duplicate) return duplicate;

  const { data, error } = await supabase
    .from("candidates")
    .insert(candidate)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Saves spreadsheet linkage (data_file_id) after candidate row creation.
 */
export async function updateCandidateSpreadsheet(
  candidateId,
  spreadsheetId
) {
  const { data, error } = await supabase
    .from("candidates")
    .update({
      data_file_id: spreadsheetId,
    })
    .eq("id", candidateId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Fetch candidate details.
 */
export async function getCandidate(candidateId) {
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (error) throw error;

  return data;
}