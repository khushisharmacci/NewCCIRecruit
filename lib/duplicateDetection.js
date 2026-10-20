import { supabase } from "@/lib/supabase";

// Duplicate detection logic with priority: email, phone, linkedin, full_name+current_company
export async function findExistingCandidate(candidate) {
  if (!candidate) return null;

  // 1. Email
  if (candidate.email) {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("email", candidate.email)
      .limit(1);

    if (error) throw error;
    if (data && data.length) return data[0];
  }

  // 2. Phone
  if (candidate.phone) {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("phone", candidate.phone)
      .limit(1);

    if (error) throw error;
    if (data && data.length) return data[0];
  }

  // 3. LinkedIn
  if (candidate.linkedin) {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("linkedin", candidate.linkedin)
      .limit(1);

    if (error) throw error;
    if (data && data.length) return data[0];
  }

  // 4. Full name + current company (case-insensitive)
  if (candidate.full_name && candidate.current_company) {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .ilike("full_name", candidate.full_name)
      .ilike("current_company", candidate.current_company)
      .limit(1);

    if (error) throw error;
    if (data && data.length) return data[0];
  }

  return null;
}
