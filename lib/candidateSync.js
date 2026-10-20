import { supabase } from "@/lib/supabase";
import { mapRowToCandidate } from "@/lib/spreadsheetMapping";
import { findExistingCandidate } from "@/lib/duplicateDetection";

// Sync an array of spreadsheet rows to the candidates table.
// rows: array of objects that include at least an 'id' or 'row_id' to identify the spreadsheet row
export async function syncRowsToCandidates(fileId, rows) {
  if (!rows || !rows.length) return {};

  const mapping = {};

  for (const row of rows) {
    try {
      // Map spreadsheet row to candidate fields
      const candidatePayload = mapRowToCandidate(row);

      // Always include data_file_id so the candidate can be linked
      candidatePayload.data_file_id = fileId;

      // Try to find existing candidate
      const existing = await findExistingCandidate(candidatePayload);

      if (existing) {
        // Merge payload: do not overwrite with undefined values
        const merged = { ...existing, ...candidatePayload };

        // Remove id fields to avoid updating primary key
        delete merged.id;

        const { error } = await supabase
          .from("candidates")
          .update(merged)
          .eq("id", existing.id);

        if (error) throw error;

        mapping[row._rowTempId || row.id || row.row_id || JSON.stringify(row)] = existing.id;
      } else {
        // Insert new candidate
        const insertPayload = candidatePayload;
        // Set defaults for required fields if necessary
        const { data, error } = await supabase
          .from("candidates")
          .insert(insertPayload)
          .select();

        if (error) throw error;

        const newCandidate = data && data[0];
        mapping[row._rowTempId || row.id || row.row_id || JSON.stringify(row)] = newCandidate?.id;
      }
    } catch (err) {
      console.error("syncRowsToCandidates error for row", row, err);
      // Continue with other rows; do not throw to avoid partial failures blocking entire batch
    }
  }

  return mapping;
}

export async function createOrUpdateCandidateFromCallLog(callLogPayload, fileId) {
  // callLogPayload contains arbitrary fields mapped from dynamic spreadsheet form
  const candidatePayload = mapRowToCandidate(callLogPayload);
  candidatePayload.data_file_id = fileId;

  const existing = await findExistingCandidate(candidatePayload);

  if (existing) {
    const merged = { ...existing, ...candidatePayload };
    delete merged.id;

    const { error } = await supabase
      .from("candidates")
      .update(merged)
      .eq("id", existing.id);

    if (error) throw error;

    return existing.id;
  } else {
    const { data, error } = await supabase
      .from("candidates")
      .insert(candidatePayload)
      .select();

    if (error) throw error;

    return data && data[0]?.id;
  }
}
