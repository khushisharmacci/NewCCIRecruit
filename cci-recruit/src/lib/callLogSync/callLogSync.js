import { supabase } from "@/lib/supabase";

/**
 * Generates a unique row id for spreadsheet rows.
 */
function generateRowId() {
  return `row_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}

/**
 * Try to find candidate.
 */
async function findCandidate(log) {
  if (log.candidate_id) {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", log.candidate_id)
      .maybeSingle();

    return data;
  }

  if (log.phone_number) {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("phone", log.phone_number)
      .maybeSingle();

    if (data) return data;
  }

  const emailField = Object.entries(log.spreadsheet_fields || {}).find(
    ([key]) => key.toLowerCase().includes("email")
  );

  if (emailField?.[1]) {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("email", emailField[1])
      .maybeSingle();

    if (data) return data;
  }

  return null;
}

/**
 * Convert spreadsheet fields into candidate payload.
 */
function buildCandidate(log) {
  const payload = {
    full_name: log.person_name,
    phone: log.phone_number,
    current_company: log.company_name,
    position: log.position_title,
    remarks: log.discussion_notes,
    notes: log.discussion_notes,
    spreadsheet_id: log.spreadsheet_id,
  };

  Object.entries(log.spreadsheet_fields || {}).forEach(([header, value]) => {
    const h = header.toLowerCase();

    if (h.includes("email")) payload.email = value;

    if (h.includes("experience"))
      payload.experience_years = value;

    if (h.includes("current ctc"))
      payload.current_ctc = value;

    if (h.includes("expected ctc"))
      payload.expected_ctc = value;

    if (h.includes("linkedin"))
      payload.linkedin = value;

    if (h.includes("location"))
      payload.location = value;

    if (h.includes("academics"))
      payload.academics = value;

    if (h.includes("current org"))
      payload.current_company = value;

    if (h.includes("current company"))
      payload.current_company = value;

    if (h === "remarks")
      payload.remarks = value;

    if (h.includes("source"))
      payload.source = value;

    if (h.includes("sent on"))
      payload.sent_on = value;

    if (h.includes("sourced by"))
      payload.sourced_by = value;

    if (h === "hr")
      payload.hr = value;

    if (h.includes("updated by"))
      payload.updated_by = value;

    if (h.includes("spoken by"))
      payload.spoken_by = value;

    if (h.includes("candidate date"))
      payload.candidate_date = value;
  });

  return payload;
}

/**
 * Create or update candidate.
 */
async function saveCandidate(log) {
  const payload = buildCandidate(log);

  const existing = await findCandidate(log);

  if (existing) {
    const { data, error } = await supabase
      .from("candidates")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  if (!payload.email) {
    payload.email =
      `placeholder_${Date.now()}@placeholder.local`;
  }

  if (!payload.status)
    payload.status = "Applied";

  const { data, error } = await supabase
    .from("candidates")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Existing candidate
 * only update remarks later.
 */
function isExisting(log) {
  return !!log.candidate_id;
}

/**
 * Main function.
 */
export async function syncCallLog(log) {
  const candidate = await saveCandidate(log);

  return {
    candidate,
    rowId:
      candidate.spreadsheet_row_id ||
      generateRowId(),
    isExisting: isExisting(log),
  };
}