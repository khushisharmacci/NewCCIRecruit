import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { mapHeaderToField } from "@/lib/syncService";

export default function useSpreadsheet(fileId) {
  const queryClient = useQueryClient();
  const { companyId } = useTenant();

  const [search, setSearch] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortColumn, setSortColumn] = useState("full_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["spreadsheet", fileId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("data_files")
                .select("columns, rows_data")
                .eq("id", fileId)
                .single();

            if (error) throw error;

            return data;
        },
    });

            useEffect(() => {
    if (!data) return;

    const cols = data.columns ?? [];
    setColumns(cols);
    
    let loadedRows = (data.rows_data ?? []).map((row) => ({
      __id: row.__id ?? crypto.randomUUID(),
      ...row,
    }));

    // Find the Candidate Name column (now including "candidate")
    const nameAliases = ["candidate name", "name", "full name", "candidate", "candidate full name"];
    const nameCol = cols.find(
      (col) => nameAliases.includes(col.toLowerCase())
    );
    
    const srNoCol = cols.find(
      (col) =>
        col.toLowerCase() === "sr no" ||
        col.toLowerCase() === "sr. no" ||
        col.toLowerCase() === "sr.no."
    );

    // 1. De-duplicate rows by Candidate Name
    if (nameCol) {
      const seen = new Set();
      loadedRows = loadedRows.filter((row) => {
        const name = String(row[nameCol] || "").trim().toLowerCase();
        if (!name) return true; // Keep empty rows
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
    }

    // 2. Sort rows numerically by their original SR.NO. values
    if (srNoCol) {
      loadedRows.sort((a, b) => {
        const valA = parseInt(String(a[srNoCol] ?? "").replace(/[^0-9]/g, ""), 10);
        const valB = parseInt(String(b[srNoCol] ?? "").replace(/[^0-9]/g, ""), 10);
        
        const numA = isNaN(valA) ? 999999 : valA;
        const numB = isNaN(valB) ? 999999 : valB;
        
        return numA - numB;
      });

      // 3. Re-assign sequential SR.NO. values (1, 2, 3...)
      let counter = 1;
      loadedRows.forEach((row) => {
        // Check if the row contains any valid candidate data
        const hasData = Object.keys(row).some(
          (k) =>
            !["__id", "_candidate_id", "spreadsheet_id", srNoCol].includes(k) &&
            String(row[k] || "").trim() !== ""
        );
        if (hasData) {
          row[srNoCol] = String(counter++);
        } else {
          row[srNoCol] = "";
        }
      });
    }

    setRows(loadedRows);

    // 4. Save the clean, de-duplicated and sorted rows back to the database
    if (data.rows_data && loadedRows.length !== data.rows_data.length) {
      saveSpreadsheet(loadedRows);
    }
  }, [data]);

    const filteredRows = useMemo(() => {
        if (!search) return rows;

        return rows.filter((row) =>
            Object.values(row)
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [rows, search]);

    async function saveSpreadsheet(updatedRows = rows) {
        setSaving(true);

        const { error } = await supabase
            .from("data_files")
            .update({
                rows_data: updatedRows,
            })
            .eq("id", fileId);

        setSaving(false);

        if (error) console.error(error);
    }

          async function updateCell(rowId, columnName, value) {
    const updated = rows.map((row) =>
        row.__id === rowId
            ? {
                  ...row,
                  [columnName]: value,
              }
            : row
    );

    setRows(updated);

    clearTimeout(window.sheetSave);

    window.sheetSave = setTimeout(async () => {
        const row = updated.find((r) => r.__id === rowId);
        
        // Find if this row is linked to a candidate
        if (row && row._candidate_id) {
            const field = mapHeaderToField(columnName);
            
            // If they erase the name (or candidate name becomes empty), delete candidate
            if (field === "full_name" && (!value || String(value).trim() === "")) {
                // Delete linked records first to prevent foreign key errors
                await supabase
                    .from("client_submissions")
                    .delete()
                    .eq("candidate_id", row._candidate_id);

                await supabase
                    .from("interviews")
                    .delete()
                    .eq("candidate_id", row._candidate_id);

                // Delete candidate record
                await supabase
                    .from("candidates")
                    .delete()
                    .eq("id", row._candidate_id);
                
                // Remove candidate link from the row
                row._candidate_id = null;
            } else {
                // Otherwise, build update payload from the ENTIRE row data
                const candidateUpdate = {};
                
                Object.entries(row).forEach(([colName, colVal]) => {
                    // Ignore internal row properties
                    if (["__id", "_candidate_id", "_row_id", "spreadsheet_id"].includes(colName)) return;
                    
                    const f = mapHeaderToField(colName);
                    if (f && colVal !== undefined && colVal !== null) {
                        let cleanedVal = colVal;
                        if (["experience_years", "expected_ctc", "current_ctc", "expected_salary"].includes(f)) {
                            const cleaned = String(colVal).replace(/[^0-9.]/g, "");
                            const num = parseFloat(cleaned);
                            cleanedVal = isNaN(num) ? null : num;
                        }
                        candidateUpdate[f] = cleanedVal;
                    }
                });

                // Update candidate in Supabase with the entire row payload
                if (Object.keys(candidateUpdate).length > 0) {
                    const { error } = await supabase
                        .from("candidates")
                        .update(candidateUpdate)
                        .eq("id", row._candidate_id);

                    if (error) console.error("Error updating candidate from sheet row:", error);
                }
            }
        }

        await saveSpreadsheet(updated);

        queryClient.invalidateQueries({
            queryKey: ["candidates"],
        });
        queryClient.invalidateQueries({
            queryKey: ["spreadsheet", fileId],
        });
    }, 600);
}

    const addRow = useMutation({
        mutationFn: async () => {
            const { data: inserted, error } = await supabase
                .from("candidates")
                .insert({
                    data_file_id: fileId,
                    company_id: companyId,
                    full_name: "",
                    email: `noemail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@placeholder.local`,
                    phone: "",
                    status: "Applied",
                    location: "",
                })
                .select()
                .single();

            if (error) throw error;

            const blank = {};
            columns.forEach((column) => {
                blank[column] = "";
            });
            blank.__id = crypto.randomUUID();
            blank._candidate_id = inserted.id;
            blank.spreadsheet_id = fileId;

            const updated = [...rows, blank];
            setRows(updated);
            await saveSpreadsheet(updated);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["spreadsheet", fileId],
            });
            queryClient.invalidateQueries({
                queryKey: ["candidates"],
            });
        }
    });

    const deleteRows = useMutation({
    mutationFn: async () => {
      if (!selectedRows.length) return;

      const rowsToDelete = rows.filter((_, index) => selectedRows.includes(index));
      const candidateIds = rowsToDelete.map(r => r._candidate_id).filter(Boolean);

      if (candidateIds.length > 0) {
        // Delete linked records first to prevent foreign key errors
        await supabase
          .from("client_submissions")
          .delete()
          .in("candidate_id", candidateIds);

        await supabase
          .from("interviews")
          .delete()
          .in("candidate_id", candidateIds);

        const { error } = await supabase
          .from("candidates")
          .delete()
          .in("id", candidateIds);

        if (error) throw error;
      }

      const updated = rows.filter(
          (_, index) => !selectedRows.includes(index)
      );

      setRows(updated);
      setSelectedRows([]);

      await saveSpreadsheet(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["spreadsheet", fileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
    }
  });

    const syncToCandidates = useMutation({
    mutationFn: async () => {
      // 1. Fetch file
      const { data: file, error: fileError } = await supabase
        .from("data_files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (fileError) throw fileError;

      const rows =
        typeof file.rows_data === "string"
          ? JSON.parse(file.rows_data || "[]")
          : file.rows_data || [];

      const columns = file.columns || [];

      // Find the mapped column headers using central mapHeaderToField
      const mappings = {};
      columns.forEach((col) => {
        const field = mapHeaderToField(col);
        if (field) mappings[col] = field;
      });

      // Fetch existing candidates for comparison
      const { data: dbCandidates, error: dbError } = await supabase
        .from("candidates")
        .select("*")
        .eq("data_file_id", fileId);

      if (dbError) throw dbError;

      const dbCandidateMap = {};
      dbCandidates?.forEach((c) => {
        dbCandidateMap[c.id] = c;
      });

      const updatedRows = [...rows];
      let created = 0;
      let updated = 0;

      for (let i = 0; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        
        // Extract candidate fields from row
        const candidateData = {
          company_id: companyId,
          data_file_id: fileId,
        };

        Object.entries(mappings).forEach(([col, field]) => {
          const val = row[col];
          if (val !== undefined && val !== null && val !== "") {
            if (["experience_years", "expected_ctc", "current_ctc", "expected_salary", "row_order"].includes(field)) {
              const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
              candidateData[field] = isNaN(num) ? null : num;
            } else if (field === "sent_on") {
              const str = String(val).trim();
              if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
                const [day, month, year] = str.split(/[-/]/);
                candidateData[field] = `${year}-${month}-${day}`;
              } else {
                candidateData[field] = val;
              }
            } else {
              // Trim all strings to prevent spacing duplication issues
              candidateData[field] = typeof val === "string" ? val.trim() : val;
            }
          }
        });

        // Ensure we ignore empty candidate rows
        const checkName = candidateData.full_name ? String(candidateData.full_name).trim() : "";
        const checkEmail = candidateData.email ? String(candidateData.email).trim() : "";
        const checkPhone = candidateData.phone ? String(candidateData.phone).trim() : "";

        if (!checkName && !checkEmail && !checkPhone) continue;
        if (!checkName) continue; // Candidate must have a name to be synchronized

        let existingCandidate = null;
        let isNewLink = false;

        if (row._candidate_id) {
          existingCandidate = dbCandidateMap[row._candidate_id] || null;
        }

        // Search by email or phone if not linked by ID yet
        if (!existingCandidate && candidateData.email && !candidateData.email.includes("placeholder.local")) {
          const cleanEmail = candidateData.email.trim().toLowerCase();
          existingCandidate = dbCandidates?.find((c) => c.email?.trim().toLowerCase() === cleanEmail) || null;
          if (existingCandidate) isNewLink = true;
        }

        if (!existingCandidate && candidateData.phone) {
          const cleanPhone = candidateData.phone.trim();
          existingCandidate = dbCandidates?.find((c) => String(c.phone).trim() === cleanPhone) || null;
          if (existingCandidate) isNewLink = true;
        }

        if (existingCandidate) {
          // Compare fields to see if anything actually changed
          let hasChanges = isNewLink;
          
          if (!hasChanges) {
            for (const [key, val] of Object.entries(candidateData)) {
              if (key === "company_id" || key === "data_file_id") continue;
              const dbVal = existingCandidate[key];
              const normVal = val === undefined || val === null ? "" : String(val).trim();
              const normDbVal = dbVal === undefined || dbVal === null ? "" : String(dbVal).trim();
              if (normVal !== normDbVal) {
                hasChanges = true;
                break;
              }
            }
          }

          if (hasChanges) {
            const { error } = await supabase
              .from("candidates")
              .update(candidateData)
              .eq("id", existingCandidate.id);

            if (error) console.error("Error updating candidate in sync:", error);
            updated++;
          }
          
          if (row._candidate_id !== existingCandidate.id) {
            row._candidate_id = existingCandidate.id;
            row.spreadsheet_id = fileId;
          }
        } else {
          // Assign defaults only for new candidates
          if (!candidateData.email) {
            candidateData.email = `noemail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@placeholder.local`;
          }

          const { data: inserted, error } = await supabase
            .from("candidates")
            .insert([candidateData])
            .select()
            .single();

          if (error) {
            console.error("Error inserting candidate in sync:", error);
          } else if (inserted) {
            row._candidate_id = inserted.id;
            row.spreadsheet_id = fileId;
            created++;
          }
        }
      }

      const { error: fileUpdateError } = await supabase
        .from("data_files")
        .update({
          rows_data: updatedRows,
          imported_count: (file.imported_count || 0) + created,
        })
        .eq("id", fileId);

      if (fileUpdateError) throw fileUpdateError;

      return { created, updated };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["spreadsheet", fileId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success(
        `Sync complete! Created ${result.created} and updated ${result.updated} candidates.`
      );
    },
    onError: (err) => {
      console.error("Sync to candidates failed:", err);
      toast.error("Synchronization failed.");
    },
  });

  function exportCSV() {
    // Basic CSV export using current visible rows
    const csvRows = [Object.keys(rows[0] || {}).join(",")];
    for (const r of rows) {
      csvRows.push(Object.values(r).map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","));
    }

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ("spreadsheet_" + fileId + ".csv").replace(/[^a-z0-9_.-]/gi, "_");
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    search,
    setSearch,
    columns,
    rows,
    filteredRows,
    isLoading,
    error,
    refetch,
    sortColumn,
    sortDirection,
    setSelectedRows,
    selectedRows,
    updateCell,
    addRow,
    deleteRows,
    exportCSV,
    saving,
    syncToCandidates,
  };
}