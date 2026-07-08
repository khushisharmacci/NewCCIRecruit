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

        setColumns(data.columns ?? []);
        setRows(
    (data.rows_data ?? []).map((row) => ({
        __id: row.__id ?? crypto.randomUUID(),
        ...row,
    }))
);
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
            if (field) {
                // If they erase the name (or candidate name becomes empty)
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
                    let cleanedValue = value;
                    if (field === "experience_years" || field === "expected_salary") {
                        const cleaned = String(value).replace(/[^0-9.]/g, "");
                        const num = parseFloat(cleaned);
                        cleanedValue = isNaN(num) ? null : num;
                    }

                    const { error } = await supabase
                        .from("candidates")
                        .update({ [field]: cleanedValue })
                        .eq("id", row._candidate_id);

                    if (error) console.error("Error updating candidate:", error);
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

      const aliases = {
        full_name: ["Name", "Candidate Name", "Full Name"],
        email: ["Email", "Email ID", "Email Address"],
        phone: ["Phone", "Contact Number", "Mobile", "Mobile Number"],
        current_company: ["Company", "Current Company", "Current Org"],
        position: ["Position", "Position Title", "Job Title"],
        notes: ["Remarks", "Notes"],
        status: ["Status"],
        experience_years: [
          "Experience",
          "Experience (Yrs)",
          "Years of Experience",
        ],
        location: ["Location"],
      };

      // Find the mapped column headers
      const mappings = {};
      columns.forEach((col) => {
        for (const [field, names] of Object.entries(aliases)) {
          if (names.some((name) => name.toLowerCase() === col.toLowerCase())) {
            mappings[col] = field;
            break;
          }
        }
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
            if (field === "experience_years" || field === "expected_salary") {
              const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
              candidateData[field] = isNaN(num) ? null : num;
            } else {
              candidateData[field] = val;
            }
          }
        });

        // Ensure required fields
        if (!candidateData.full_name) continue;

        let existingCandidate = null;
        let isNewLink = false;

        if (row._candidate_id) {
          existingCandidate = dbCandidateMap[row._candidate_id] || null;
        }

        // Search by email or phone if not linked by ID yet
        if (!existingCandidate && candidateData.email && !candidateData.email.includes("placeholder.local")) {
          existingCandidate = dbCandidates?.find((c) => c.email?.toLowerCase() === candidateData.email.toLowerCase()) || null;
          if (existingCandidate) isNewLink = true;
        }

        if (!existingCandidate && candidateData.phone) {
          existingCandidate = dbCandidates?.find((c) => String(c.phone) === String(candidateData.phone)) || null;
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
          if (!candidateData.status) {
            candidateData.status = "Applied";
          }

          // Insert new candidate
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

      // Update file rows_data in Supabase
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
      queryClient.invalidateQueries({
        queryKey: ["spreadsheet", fileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
      if (result.created === 0 && result.updated === 0) {
        alert("All candidates are already in sync.");
      } else {
        alert(`Sync completed successfully!\nCreated: ${result.created} new candidates\nUpdated: ${result.updated} existing candidates.`);
      }
    },
    onError: (err) => {
      alert(`Sync failed: ${err.message}`);
    }
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
