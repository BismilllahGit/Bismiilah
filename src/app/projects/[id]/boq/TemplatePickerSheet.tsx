"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/loading-block";
import { EmptyState } from "@/components/ui/empty-state";
import { LayoutTemplate, ChevronDown, ChevronRight } from "lucide-react";

// Matches the shape GET /api/boq-templates returns (BOQTemplate with
// sections -> lineItems included) — only the fields this picker renders.
type PickerSection = {
  id: string;
  name: string;
  lineItems: { id: string }[];
};

type PickerTemplate = {
  id: string;
  name: string;
  category: string;
  sections: PickerSection[];
};

type TemplatePickerSheetProps =
  | {
      // Creates a brand new DRAFT BOQ from the template — used on the
      // "No Estimate Found" empty state, before any BOQ exists. Always
      // copies the whole template; section-level picking only applies to
      // "import" mode, where there's already a draft to add a few sections
      // to.
      mode: "create";
      projectId: string;
      onCreated: () => void | Promise<void>;
      onError: (message: string) => void;
    }
  | {
      // Appends the template's sections/items onto an already-open DRAFT
      // BOQ — used from the section-list footer while editing. Supports
      // importing the whole template or a hand-picked subset of sections.
      mode: "import";
      projectId: string;
      boqId: string;
      disabled?: boolean;
      triggerClassName?: string;
      onCreated: () => void | Promise<void>;
      onError: (message: string) => void;
    };

export function TemplatePickerSheet(props: TemplatePickerSheetProps) {
  const { mode, projectId, onCreated, onError } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [templates, setTemplates] = useState<PickerTemplate[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(
    null,
  );
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(
    new Set(),
  );

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/boq-templates");
      if (res.ok) setTemplates(await res.json());
      setFetched(true);
    } catch {
      onError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const resetSelection = () => {
    setExpandedTemplateId(null);
    setSelectedSectionIds(new Set());
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !fetched) loadTemplates();
    if (!next) resetSelection();
  };

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplateId((prev) => (prev === templateId ? null : templateId));
    setSelectedSectionIds(new Set());
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const applyImport = async (
    templateId: string,
    sectionIds: string[] | undefined,
  ) => {
    if (applyingId) return;
    setApplyingId(templateId);
    try {
      const url =
        mode === "import"
          ? `/api/projects/${projectId}/boq/${props.boqId}/import-template/${templateId}`
          : `/api/projects/${projectId}/boq/from-template/${templateId}`;
      const res = await fetch(url, {
        method: "POST",
        ...(sectionIds
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sectionIds }),
            }
          : {}),
      });
      if (res.ok) {
        setOpen(false);
        resetSelection();
        await onCreated();
      } else {
        const data = await res.json().catch(() => null);
        onError(
          data?.error ||
            (mode === "import"
              ? "Failed to import template"
              : "Failed to create BOQ from template"),
        );
      }
    } catch {
      onError(
        mode === "import"
          ? "Failed to import template"
          : "Failed to create BOQ from template",
      );
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          mode === "import" ? (
            <Button
              variant="outline"
              disabled={props.disabled}
              className={
                props.triggerClassName ??
                "border-dashed border-slate-400 font-bold bg-white hover:bg-slate-100 text-slate-700 shadow-sm h-10 px-6 disabled:opacity-50"
              }
            />
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="font-bold px-8 shadow-sm border-slate-300"
            />
          )
        }
      >
        <LayoutTemplate className="mr-2 h-4 w-4" />
        {mode === "import" ? "Import from Template" : "Start from Template"}
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>
            {mode === "import"
              ? "Import Sections from Template"
              : "Start BOQ from Template"}
          </SheetTitle>
          <SheetDescription>
            {mode === "import"
              ? "Import the whole template, or expand one to pick just the sections you need. New sections are appended after the ones already on this draft — quantities and rates start blank for you to fill in."
              : "Copies every section and item title from the template into a new draft — quantities and rates start blank for you to fill in."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {loading ? (
            <LoadingBlock />
          ) : templates.length === 0 ? (
            <div className="py-8 text-center">
              <EmptyState
                icon={LayoutTemplate}
                message="No templates yet."
                description="Create one in Settings → Templates first."
              />
            </div>
          ) : (
            templates.map((tpl) => {
              const itemCount = tpl.sections.reduce(
                (sum, s) => sum + s.lineItems.length,
                0,
              );
              const isExpanded = expandedTemplateId === tpl.id;
              const selectedCount = isExpanded ? selectedSectionIds.size : 0;
              const isBusy = applyingId === tpl.id;

              return (
                <div key={tpl.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex items-center gap-2">
                      {mode === "import" && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(tpl.id)}
                          className="shrink-0 text-slate-400 hover:text-slate-700"
                          aria-label={
                            isExpanded ? "Collapse sections" : "Pick sections"
                          }
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {tpl.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {tpl.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tpl.sections.length} section
                            {tpl.sections.length === 1 ? "" : "s"}, {itemCount}{" "}
                            item{itemCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={applyingId !== null}
                      onClick={() => applyImport(tpl.id, undefined)}
                    >
                      {isBusy && !selectedCount
                        ? "Applying…"
                        : mode === "import"
                          ? "Use All"
                          : "Use"}
                    </Button>
                  </div>

                  {mode === "import" && isExpanded && (
                    <div className="border-t bg-slate-50 p-3 space-y-2">
                      {tpl.sections.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          This template has no sections.
                        </p>
                      ) : (
                        tpl.sections.map((sec) => (
                          <label
                            key={sec.id}
                            className="flex items-center gap-2 text-sm bg-white border rounded-md px-2 py-1.5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSectionIds.has(sec.id)}
                              onChange={() => toggleSection(sec.id)}
                              className="h-4 w-4 shrink-0"
                            />
                            <span className="flex-1 truncate">{sec.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {sec.lineItems.length} item
                              {sec.lineItems.length === 1 ? "" : "s"}
                            </span>
                          </label>
                        ))
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={selectedCount === 0 || applyingId !== null}
                        onClick={() =>
                          applyImport(tpl.id, Array.from(selectedSectionIds))
                        }
                      >
                        {isBusy && selectedCount
                          ? "Importing…"
                          : selectedCount === 0
                            ? "Select sections to import"
                            : `Import ${selectedCount} Selected Section${selectedCount === 1 ? "" : "s"}`}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
