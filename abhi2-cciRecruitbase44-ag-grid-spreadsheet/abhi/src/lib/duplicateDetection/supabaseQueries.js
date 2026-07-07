import { supabase } from "@/lib/supabase";

export async function searchCandidatesForDuplicates(data) {
  const filters = [];

  if (data.email) {
    filters.push(`email.eq.${data.email}`);
  }

  if (data.phone) {
    filters.push(`phone.eq.${data.phone}`);
  }

  if (data.linkedin) {
    filters.push(`linkedin.eq.${data.linkedin}`);
  }

  if (data.full_name && data.current_company) {
    filters.push(
      `and(full_name.eq.${data.full_name},current_company.eq.${data.current_company})`
    );
  }

  if (!filters.length) {
    return [];
  }

  const { data: rows, error } = await supabase
    .from("candidates")
    .select("*")
    .or(filters.join(","));

  if (error) {
    throw error;
  }

  return rows || [];
}
import { normalize } from "./utils";

export async function findCandidateDuplicate(values, currentId = null) {
  const rows = await searchCandidatesForDuplicates(values);

  const filtered = currentId
    ? rows.filter((row) => row.id !== currentId)
    : rows;

  let exact = null;
  const possible = [];

  filtered.forEach((candidate) => {
    const emailMatch =
      normalize(candidate.email) === normalize(values.email);

    const phoneMatch =
      normalize(candidate.phone) === normalize(values.phone);

    const linkedinMatch =
      normalize(candidate.linkedin) === normalize(values.linkedin);

    if (emailMatch || phoneMatch || linkedinMatch) {
      exact = candidate;
      return;
    }

    const nameMatch =
      normalize(candidate.full_name) ===
      normalize(values.full_name);

    const companyMatch =
      normalize(candidate.current_company) ===
      normalize(values.current_company);

    if (nameMatch && companyMatch) {
      possible.push(candidate);
    }
  });

  return {
    exactMatch: exact,
    possibleMatches: possible,
    hasDuplicate: !!exact || possible.length > 0,
  };
}