# Implementation Plan: Bidirectional Candidate ↔ Spreadsheet Sync

This document outlines the changes required to synchronize candidates between the **Candidates Page** and the **Data Center Spreadsheet Viewer**, satisfying Supabase Row Level Security (RLS) policies.

---

## Change 1: src/pages/Candidates.jsx

### Updates Required:
1. **Fix `updateMutation` payload**: Clean up the redundant/broken `current_job_role` logic.
2. **Stamp newly created/updated candidates**: Stamp the candidate data with the current tenant's `company_id` using the destructured `stampRecord` helper before mutations run.
3. **Invalidate spreadsheet queries**: Add cache invalidations so that changes in the Candidates list update the open spreadsheet.

### Code Diffs:

```diff
@@ -66,23 +66,26 @@
   const createMutation = useMutation({
   mutationFn: async (data) => {
     console.log("SAVING CANDIDATE:", data);

     const { data: inserted, error } = await supabase
       .from("candidates")
       .insert([data])
       .select();

     console.log("INSERTED:", inserted);
     console.log("SUPABASE ERROR:", error);

     if (error) throw error;
   },

   onSuccess: () => {
     queryClient.invalidateQueries({
       queryKey: ["candidates"],
     });
+    queryClient.invalidateQueries({
+      queryKey: ["spreadsheet"],
+    });

     setDialogOpen(false);
   },
 });
```

```diff
@@ -90,18 +90,19 @@
   const updateMutation = useMutation({
     mutationFn: async ({ id, data }) => {
-  const payload = {
-    ...data,
-    current_job_role: data.current_job_role
-  };
-
-  delete payload.current_job_role;
-
-  const { error } = await supabase
-    .from("candidates")
-    .update(payload)
-    .eq("id", id);
-
-  if (error) throw error;
-},
-    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["candidates"] });setDialogOpen(false);setEditCandidate(null);}
+  const { error } = await supabase
+    .from("candidates")
+    .update(data)
+    .eq("id", id);
+
+  if (error) throw error;
+},
+    onSuccess: () => {
+      queryClient.invalidateQueries({ queryKey: ["candidates"] });
+      queryClient.invalidateQueries({ queryKey: ["spreadsheet"] });
+      setDialogOpen(false);
+      setEditCandidate(null);
+    }
   });
```

```diff
@@ -109,11 +110,15 @@
   const deleteMutation = useMutation({
     mutationFn: async (id) => {
   const { error } = await supabase
     .from("candidates")
     .delete()
     .eq("id", id);

   if (error) throw error;
 },
-    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["candidates"] });setDeleteId(null);}
+    onSuccess: () => {
+      queryClient.invalidateQueries({ queryKey: ["candidates"] });
+      queryClient.invalidateQueries({ queryKey: ["spreadsheet"] });
+      setDeleteId(null);
+    }
   });
```

```diff
@@ -162,9 +162,10 @@
 const handleSave = (data) => {
+  const stamped = stampRecord(data);
   if (editCandidate) {
-    updateMutation.mutate({ id: editCandidate.id, data });
+    updateMutation.mutate({ id: editCandidate.id, data: stamped });
   } else {
-    createMutation.mutate(data);
+    createMutation.mutate(stamped);
   }
 };
```

---

## Change 2: src/components/spreadsheet/useSpreadsheet.js

### Updates Required:
1. **Import `useTenant`**: Import `useTenant` from `@/lib/tenant` and call it to get `companyId`.
2. **Stamp Spreadsheet Add Row**: Add `company_id: companyId` and set default status to `"Applied"` when inserting spreadsheet rows into the `candidates` table.
3. **Invalidate candidates query**: Call query cache invalidation for `["candidates"]` inside `updateCell`, `addRow`, and `deleteRows` onSuccess handlers.

### Code Diffs:

```diff
@@ -5,9 +5,11 @@
   useQueryClient,
 } from "@tanstack/react-query";
 import { supabase } from "@/lib/supabase";
+import { useTenant } from "@/lib/tenant";
 
 export default function useSpreadsheet(fileId) {
   const queryClient = useQueryClient();
+  const { companyId } = useTenant();
 
   const [search, setSearch] = useState("");
```

```diff
@@ -85,6 +87,9 @@
     if (error) return;

     queryClient.invalidateQueries({
       queryKey: ["spreadsheet", fileId],
     });
+    queryClient.invalidateQueries({
+      queryKey: ["candidates"],
+    });
   }
```

```diff
@@ -97,14 +100,15 @@
   const addRow = useMutation({
     mutationFn: async () => {
       const { error } = await supabase
         .from("candidates")
         .insert({
           data_file_id: fileId,
+          company_id: companyId,
           full_name: "",
           email: "",
           phone: "",
-          status: "",
+          status: "Applied",
           location: "",
         });

       if (error) throw error;
     },
```

```diff
@@ -113,6 +113,9 @@
     onSuccess() {
       queryClient.invalidateQueries({
         queryKey: ["spreadsheet", fileId],
       });
+      queryClient.invalidateQueries({
+        queryKey: ["candidates"],
+      });
     },
   });
```

```diff
@@ -128,6 +128,9 @@
       queryClient.invalidateQueries({
         queryKey: ["spreadsheet", fileId],
       });
+      queryClient.invalidateQueries({
+        queryKey: ["candidates"],
+      });
     },
   });
```

---

## DB Migration Note (If applicable)
If you have pre-existing candidate rows created without `company_id`, they will violate Row Level Security policies and hide themselves. Run this SQL query in your Supabase SQL Editor to restore visibility of those rows:

```sql
UPDATE public.candidates
SET company_id = 'YOUR_COMPANY_UUID_HERE'
WHERE company_id IS NULL;
```
