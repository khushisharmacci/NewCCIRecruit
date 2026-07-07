import { useEffect, useState } from "react";
import { normalize } from "@/lib/duplicateDetection/utils";
import { findCandidateDuplicate } from "@/lib/duplicateDetection/supabaseQueries";

export default function useDuplicateCheck(
  entity,
  values,
  currentId = null
) {
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState({
    exactMatch: null,
    possibleMatches: [],
    hasDuplicate: false,
  });

  useEffect(() => {
    if (entity !== "candidates") return;

    const timer = setTimeout(async () => {
      try {
        const hasSearchField =
          values.email ||
          values.phone ||
          values.linkedin ||
          values.full_name;

        if (!hasSearchField) {
          setResult({
            exactMatch: null,
            possibleMatches: [],
            hasDuplicate: false,
          });
          return;
        }

        setLoading(true);

        const duplicate = await findCandidateDuplicate(
  values,
  currentId
);

setResult(duplicate);
      } catch (err) {
        console.error("Duplicate check failed", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    entity,
    values.email,
    values.phone,
    values.linkedin,
    values.full_name,
    values.current_company,
  ]);

  return {
    loading,
    ...result,
  };
}