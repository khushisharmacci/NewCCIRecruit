import { supabase } from "@/lib/supabase";
import { createOrGetCandidate } from "./candidateSync";
import {
  appendCandidateRow,
  updateCandidateRemarks,
} from "./spreadsheetSync";

/**
 * Main Call Log Sync
 *
 * Existing Candidate:
 *   -> Finds Candidate and updates spreadsheet remarks column in their respective spreadsheet
 *
 * New Candidate:
 *   -> Create/Verify Candidate in 'candidates' table
 *   -> Append row details to 'data_files' rows_data
 */
export async function syncCallLog(log) {
  if (!log) return null;

  // Existing Candidate Flow
  if (log.candidate_id) {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, data_file_id")
      .eq("id", log.candidate_id)
      .single();

    if (candidate && candidate.data_file_id) {
      await updateCandidateRemarks(candidate, log.discussion_notes);
    }
    return;
  }

  // New Candidate Flow
  const candidate = await createOrGetCandidate(log);

  if (log.spreadsheet_id) {
    await appendCandidateRow(log, candidate);
  }

  return candidate;
}