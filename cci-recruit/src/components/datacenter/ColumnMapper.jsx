import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import {
  Zap, CheckCircle, Plus, Save, FolderOpen, X, AlertCircle,
  ArrowRight, GripVertical, ChevronDown, Lightbulb, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Normalize for fuzzy matching ──────────────────────────────────────────────
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

// ─── Score a match between a spreadsheet header and a field key/label ──────────
function matchScore(header, fieldKey, fieldLabel) {
  const hn = norm(header);
  const fk = norm(fieldKey);
  const fl = norm(fieldLabel || "");
  if (!hn) return 0;

  // Exact match
  if (hn === fk || hn === fl) return 100;
  // Contains
  if (hn.includes(fk) && fk.length > 2) return 85;
  if (fk.includes(hn) && hn.length > 2) return 80;
  if (fl && hn.includes(fl) && fl.length > 3) return 75;
  if (fl && fl.includes(hn) && hn.length > 3) return 70;
  // Word overlap
  const hWords = new Set(hn.split(/\s+/));
  const fWords = new Set([...fk.split(/\s+/), ...fl.split(/\s+/)]);
  const overlap = [...hWords].filter((w) => fWords.has(w) && w.length > 2);
  if (overlap.length > 0) return 60 + overlap.length * 5;
  // First word partial
  const hFirst = hn.split(/\s+/)[0] || "";
  const fFirst = fk.split(/\s+/)[0] || "";
  if (hFirst.length > 2 && fFirst.length > 2 && (hFirst.startsWith(fFirst) || fFirst.startsWith(hFirst)))
    return 50;
  return 0;
}

// ─── Auto-detect best matches ──────────────────────────────────────────────────
function autoDetect(headers, entityDef, existingMappings = {}) {
  const allFields = [...entityDef.required, ...entityDef.optional];
  const scores = {};

  headers.forEach((header) => {
    let best = { field: null, score: 0 };
    allFields.forEach((field) => {
      const s = matchScore(header, field, entityDef.labels[field]);
      if (s > best.score) best = { field, score: s };
    });
    scores[header] = best;
  });

  // Build initial mappings (only high-confidence + not already mapped)
  const usedFields = new Set(Object.values(existingMappings).filter(Boolean));
  const autoMappings = { ...existingMappings };

  // Sort headers by score descending, prioritize unmapped
  const sorted = [...headers].sort((a, b) => (scores[b]?.score || 0) - (scores[a]?.score || 0));

  sorted.forEach((header) => {
    if (autoMappings[header] !== undefined) return; // Already mapped
    const best = scores[header];
    if (best && best.score >= 60 && !usedFields.has(best.field)) {
      autoMappings[header] = best.field;
      usedFields.add(best.field);
    } else {
      autoMappings[header] = null;
    }
  });

  return { mappings: autoMappings, scores };
}

// ─── Sample preview helper ─────────────────────────────────────────────────────
function sampleValues(rows, header, count = 3) {
  return rows
    .slice(0, 10)
    .map((r) => r[header])
    .filter((v) => v && String(v).trim())
    .slice(0, count);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ColumnMapper({
  headers,
  allRows,
  entity,
  entityDef,
  initialMappings,
  onMappingsChange,
  onBack,
  onContinue,
}) {
  const queryClient = useQueryClient();
  const { stampRecord, companyId } = useTenant();

  const [mappings, setMappings] = useState(initialMappings || {});
  const [scores, setScores] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [showNewField, setShowNewField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldFor, setNewFieldFor] = useState(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Load existing templates
  const { data: templates = [] } = useQuery({
    queryKey: ["mapping-templates", entity, companyId],
    queryFn: async () => {
  const { data, error } = await supabase
    .from("mapping_templates")
    .select("*")
    .eq("entity_type", entity)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
},
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data) => {
  const { data: result, error } = await supabase
    .from("mapping_templates")
    .insert([
      {
        ...data,
        company_id: companyId,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return result;
},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-templates"] });
      toast.success("Template saved!");
      setShowSaveTemplate(false);
    },
  });

  // Re-run auto-detect when entity changes
  const runAutoDetect = useCallback(() => {
    const { mappings: auto, scores: s } = autoDetect(headers, entityDef);
    setMappings(auto);
    setScores(s);
    setCustomFields([]);
  }, [headers, entityDef]);

  // Initialize on mount or when headers/entity changes
  useEffect(() => {
    if (initialMappings && Object.keys(initialMappings).length > 0) {
      const { scores: s } = autoDetect(headers, entityDef, initialMappings);
      setScores(s);
      setMappings(initialMappings);
    } else {
      runAutoDetect();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of changes
  const updateMappings = (newMappings) => {
    setMappings(newMappings);
    onMappingsChange?.(newMappings);
  };

  const setMapping = (header, value) => {
    const updated = { ...mappings, [header]: value };
    updateMappings(updated);
  };

  // Create custom field
  const handleCreateCustomField = () => {
    if (!newFieldName.trim() || !newFieldFor) return;
    const fieldKey = newFieldName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const label = newFieldName.trim();
    setCustomFields((prev) => [...prev, { key: fieldKey, label }]);
    setMapping(newFieldFor, fieldKey);
    setNewFieldName("");
    setNewFieldFor(null);
    setShowNewField(false);
    toast.success(`Custom field "${label}" created`);
  };

  // Load template
  const loadTemplate = (template) => {
    try {
      const saved = JSON.parse(template.mappings);
      // Merge saved mappings with current headers (some headers may be different)
      const merged = { ...mappings };
      headers.forEach((h) => {
        if (saved[h] !== undefined) merged[h] = saved[h];
      });
      // Load custom fields from template
      const customKeys = Object.values(saved).filter(
        (v) =>
          v &&
          !entityDef.required.includes(v) &&
          !entityDef.optional.includes(v)
      );
      if (customKeys.length > 0) {
        const unique = [...new Set(customKeys)];
        setCustomFields(unique.map((k) => ({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) })));
      }
      updateMappings(merged);
      toast.success(`Template "${template.name}" loaded`);
    } catch {
      toast.error("Failed to load template");
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    await saveTemplateMutation.mutateAsync({
      name: templateName.trim(),
      entity_type: entity,
      mappings: JSON.stringify(mappings),
      description: templateDesc.trim() || undefined,
    });
    setTemplateName("");
    setTemplateDesc("");
    setSavingTemplate(false);
  };

    const handleContinue = () => {
    const finalMappings = { ...mappings };
    const finalCustomFields = [...customFields];

    headers.forEach((header) => {
      // If the column header is not mapped to any field, map it as a custom field
      if (!finalMappings[header]) {
        let fieldKey = header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
        if (!fieldKey) {
          fieldKey = "custom_field";
        }

        // Ensure key uniqueness so it doesn't clash with system or other custom fields
        let uniqueKey = fieldKey;
        let counter = 1;
        while (
          entityDef.required.includes(uniqueKey) ||
          entityDef.optional.includes(uniqueKey) ||
          finalCustomFields.some((cf) => cf.key === uniqueKey)
        ) {
          uniqueKey = `${fieldKey}_${counter}`;
          counter++;
        }

        finalCustomFields.push({ key: uniqueKey, label: header });
        finalMappings[header] = uniqueKey;
      }
    });

    onContinue(finalMappings, finalCustomFields);
  };

  // Count mapped
  const mappedCount = Object.values(mappings).filter(Boolean).length;
  const missingRequired = entityDef.required.filter(
    (f) => !Object.values(mappings).includes(f)
  );

  // Build all available target fields (system + custom)
  const allTargetFields = [
    ...entityDef.required.map((f) => ({ key: f, label: entityDef.labels[f], required: true })),
    ...entityDef.optional.map((f) => ({ key: f, label: entityDef.labels[f], required: false })),
    ...customFields.map((f) => ({ key: f.key, label: f.label, required: false, custom: true })),
  ];

  return (
    <div className="space-y-4">
      {/* Header with template controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Map Columns → {entity} Fields</h3>
          <p className="text-sm text-muted-foreground">
            {headers.length} columns · {allRows.length.toLocaleString()} rows —{" "}
            <span className="text-amber-300">{mappedCount} mapped</span>
          </p>
        </div>
        <div className="flex gap-2">
          {/* Template dropdown */}
          {templates.length > 0 && (
            <Select onValueChange={(id) => {
              const t = templates.find((tp) => tp.id === id);
              if (t) loadTemplate(t);
            }}>
              <SelectTrigger className="h-8 text-xs gap-1 w-36">
                <FolderOpen className="h-3.5 w-3.5" />
                <SelectValue placeholder="Load template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={runAutoDetect}
          >
            <Zap className="h-3.5 w-3.5" /> Auto-detect
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={() => setShowSaveTemplate(true)}
            disabled={mappedCount === 0}
          >
            <Save className="h-3.5 w-3.5" /> Save Template
          </Button>
        </div>
      </div>

      {/* Mapping list */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {headers.map((header) => {
          const score = scores[header]?.score || 0;
          const isAuto = score >= 60 && mappings[header] === scores[header]?.field;
          const samples = sampleValues(allRows, header, 3);

          return (
            <div
              key={header}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
                mappings[header]
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/20 border-border hover:border-primary/30"
              )}
            >
              {/* Source column info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 opacity-30 group-hover:opacity-60 transition-opacity" />
                  <p className="text-sm font-medium text-foreground truncate">{header}</p>
                  {isAuto && (
                    <Badge className="bg-amber-500/15 text-amber-300 text-[10px] gap-0.5 py-0">
                      <Lightbulb className="h-2.5 w-2.5" /> Auto
                    </Badge>
                  )}
                </div>
                {samples.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-6 truncate">
                    e.g. {samples.map((v, i) => (
                      <span key={i}>
                        <span className="text-foreground/60 font-mono">{String(v).substring(0, 30)}</span>
                        {i < samples.length - 1 && <span className="text-border">, </span>}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

              {/* Target field dropdown */}
              <div className="flex-1 min-w-0">
                <Select
                  value={mappings[header] || "__skip__"}
                  onValueChange={(v) => {
                    if (v === "__custom__") {
                      setNewFieldFor(header);
                      setShowNewField(true);
                    } else {
                      setMapping(header, v === "__skip__" ? null : v);
                    }
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "h-8 text-xs",
                      mappings[header] && "border-primary/40 text-foreground"
                    )}
                  >
                    <SelectValue placeholder="— Skip column —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="__skip__">
                      <span className="text-muted-foreground">— Skip column —</span>
                    </SelectItem>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Required
                    </div>
                    {entityDef.required.map((f) => (
                      <SelectItem key={f} value={f}>
                        <span className="flex items-center gap-1.5">
                          {entityDef.labels[f]}
                          <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                        </span>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Optional
                    </div>
                    {entityDef.optional.map((f) => (
                      <SelectItem key={f} value={f}>
                        {entityDef.labels[f]}
                      </SelectItem>
                    ))}
                    {customFields.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Custom
                        </div>
                        {customFields.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            <span className="flex items-center gap-1.5">
                              {f.label}
                              <Badge className="bg-purple-500/15 text-purple-300 text-[9px] py-0">custom</Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    <SelectItem value="__custom__">
                      <span className="flex items-center gap-1.5 text-primary">
                        <Plus className="h-3 w-3" /> Create new field...
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status indicator */}
              {mappings[header] && entityDef.required.includes(mappings[header]) && (
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              )}
              {mappings[header] && customFields.find((f) => f.key === mappings[header]) && (
                <Badge className="bg-purple-500/15 text-purple-300 text-[10px] shrink-0">new</Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Missing required warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-300">Missing required fields</p>
            <p className="text-amber-300/70 text-xs mt-0.5">
              {missingRequired.map((f) => entityDef.labels[f]).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="gap-2" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={handleContinue}
          disabled={mappedCount === 0}
        >
          Preview & Import <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Create Custom Field Dialog ─────────────────────────────────── */}
      <Dialog open={showNewField} onOpenChange={setShowNewField}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Map <strong className="text-foreground">{newFieldFor}</strong> to a new
              custom field in <strong className="text-foreground">{entity}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label>Field Name</Label>
              <Input
                autoFocus
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="e.g. Visa Status, Notice Period"
                onKeyDown={(e) => e.key === "Enter" && handleCreateCustomField()}
              />
              <p className="text-[10px] text-muted-foreground">
                This creates a custom field specific to {entity} records
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewField(false);
                  setNewFieldName("");
                  setNewFieldFor(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateCustomField}
                disabled={!newFieldName.trim()}
              >
                Create & Map
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Save Template Dialog ────────────────────────────────────────── */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Mapping Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input
                autoFocus
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder='e.g. "Client import - standard"'
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="What this template is for..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || savingTemplate}
              >
                {savingTemplate ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}