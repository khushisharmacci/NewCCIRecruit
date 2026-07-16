import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [history, setHistory] = useState([]);

  const pushToHistory = (currentRows) => {
    setHistory((prev) => [...prev.slice(-19), JSON.parse(JSON.stringify(currentRows))]);
  };

  const undo = useCallback(async () => {
    if (history.length === 0) return;

    const prevRows = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRows(prevRows);

    await saveSpreadsheet(prevRows);

    queryClient.invalidateQueries({ queryKey: ["spreadsheet", fileId] });
    queryClient.invalidateQueries({ queryKey: ["candidates"] });
    toast.success("Action undone");
  }, [history, fileId, queryClient]);

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

    if (nameCol) {
      const seen = new Set();
      loadedRows = loadedRows.filter((row) => {
        const name = String(row[nameCol] || "").trim().toLowerCase();
        if (!name) return true;
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
    }

    if (srNoCol) {
      loadedRows.sort((a, b) => {
        const valA = parseInt(String(a[srNoCol] ?? "").replace(/[^0-9]/g, ""), 10);
        const valB = parseInt(String(b[srNoCol] ?? "").replace(/[^0-9]/g, ""), 10);

        const numA = isNaN(valA) ? 999999 : valA;
        const numB = isNaN(valB) ? 999999 : valB;

        return numA - numB;
      });

      let counter = 1;
      loadedRows.forEach((row) => {
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
    pushToHistory(rows);

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

      if (row) {
        const field = mapHeaderToField(columnName);

        if (row._candidate_id) {
          if (field === "full_name" && (!value || String(value).trim() === "")) {
            await supabase
              .from("client_submissions")
              .delete()
              .eq("candidate_id", row._candidate_id);

            await supabase
              .from("interviews")
              .delete()
              .eq("candidate_id", row._candidate_id);

            await supabase
              .from("candidates")
              .delete()
              .eq("id", row._candidate_id);

            row._candidate_id = null;
          } else {
            const candidateUpdate = {};

            Object.entries(row).forEach(([colName, colVal]) => {
              if (["__id", "_candidate_id", "_row_id", "spreadsheet_id"].includes(colName)) return;

              const f = mapHeaderToField(colName);
              if (f && colVal !== undefined && colVal !== null) {
                let cleanedVal = colVal;
                if (["experience_years", "expected_ctc", "current_ctc", "expected_salary"].includes(f)) {
                  const cleaned = String(colVal).replace(/[^0-9.]/g, "");
                  const num = parseFloat(cleaned);
                  cleanedVal = isNaN(num) ? null : num;
                } else if (["sent_on", "candidate_date"].includes(f)) {
                  const str = String(colVal).trim();
                  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
                    const [day, month, year] = str.split(/[-/]/);
                    cleanedVal = `${year}-${month}-${day}`;
                  } else if (!str) {
                    cleanedVal = null;
                  } else {
                    cleanedVal = str;
                  }
                } else {
                  cleanedVal = typeof colVal === "string" ? colVal.trim() : colVal;
                }
                candidateUpdate[f] = cleanedVal;
              }
            });

            if (Object.keys(candidateUpdate).length > 0) {
              const { error } = await supabase
                .from("candidates")
                .update(candidateUpdate)
                .eq("id", row._candidate_id);

              if (error) console.error("Error updating candidate from sheet row:", error);
            }
          }
        } else {
          // Create candidate profile ONLY if they just typed a non-empty name
          if (field === "full_name" && value && String(value).trim() !== "") {
            const { data: inserted, error } = await supabase
              .from("candidates")
              .insert({
                data_file_id: fileId,
                company_id: companyId,
                full_name: String(value).trim(),
                email: `noemail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@placeholder.local`,
                phone: "",
                status: "Applied",
                location: "",
              })
              .select()
              .single();

            if (error) {
              console.error("Error inserting candidate on name entry:", error);
            } else if (inserted) {
              row._candidate_id = inserted.id;

              // Sync any other fields that were already filled in this row
              const candidateUpdate = {};
              Object.entries(row).forEach(([colName, colVal]) => {
                if (["__id", "_candidate_id", "_row_id", "spreadsheet_id"].includes(colName)) return;

                const f = mapHeaderToField(colName);
                if (f && f !== "full_name" && colVal !== undefined && colVal !== null && String(colVal).trim() !== "") {
                  let cleanedVal = colVal;
                  if (["experience_years", "expected_ctc", "current_ctc", "expected_salary"].includes(f)) {
                    const cleaned = String(colVal).replace(/[^0-9.]/g, "");
                    const num = parseFloat(cleaned);
                    cleanedVal = isNaN(num) ? null : num;
                  } else if (["sent_on", "candidate_date"].includes(f)) {
                    const str = String(colVal).trim();
                    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
                      const [day, month, year] = str.split(/[-/]/);
                      cleanedVal = `${year}-${month}-${day}`;
                    } else if (!str) {
                      cleanedVal = null;
                    } else {
                      cleanedVal = str;
                    }
                  } else {
                    cleanedVal = typeof colVal === "string" ? colVal.trim() : colVal;
                  }
                  candidateUpdate[f] = cleanedVal;
                }
              });

              if (Object.keys(candidateUpdate).length > 0) {
                await supabase
                  .from("candidates")
                  .update(candidateUpdate)
                  .eq("id", inserted.id);
              }
            }
          }
        }
      }

      await saveSpreadsheet(updated);

      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["spreadsheet", fileId] });
    }, 600);
  }

  const addRow = useMutation({
    mutationFn: async () => {
      pushToHistory(rows);

      const blank = {};
      columns.forEach((column) => {
        blank[column] = "";
      });
      blank.__id = crypto.randomUUID();
      blank._candidate_id = null; // Do not insert profile in database until a name is typed
      blank.spreadsheet_id = fileId;

      const updated = [...rows, blank];
      setRows(updated);
      await saveSpreadsheet(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["spreadsheet", fileId],
      });
    }
  });

  const deleteRows = useMutation({
    mutationFn: async () => {
      if (!selectedRows.length) return;

      pushToHistory(rows);

      const rowsToDelete = rows.filter((row) => selectedRows.includes(row.__id));
      const candidateIds = rowsToDelete.map(r => r._candidate_id).filter(Boolean);

      if (candidateIds.length > 0) {
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
        (row) => !selectedRows.includes(row.__id)
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

      const mappings = {};
      columns.forEach((col) => {
        const field = mapHeaderToField(col);
        if (field) mappings[col] = field;
      });

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
            } else if (["sent_on", "candidate_date"].includes(field)) {
              const str = String(val).trim();
              if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
                const [day, month, year] = str.split(/[-/]/);
                candidateData[field] = `${year}-${month}-${day}`;
              } else if (!str) {
                candidateData[field] = null;
              } else {
                candidateData[field] = str;
              }
            } else {
              candidateData[field] = typeof val === "string" ? val.trim() : val;
            }
          }
        });

        const checkName = candidateData.full_name ? String(candidateData.full_name).trim() : "";
        const checkEmail = candidateData.email ? String(candidateData.email).trim() : "";
        const checkPhone = candidateData.phone ? String(candidateData.phone).trim() : "";

        if (!checkName && !checkEmail && !checkPhone) continue;
        if (!checkName) continue;

        let existingCandidate = null;
        let isNewLink = false;

        if (row._candidate_id) {
          existingCandidate = dbCandidateMap[row._candidate_id] || null;
        }

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
    undo,
    canUndo: history.length > 0,
  };
}