"use client";

import { useState, useEffect } from "react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { TemplateTree } from "./TemplateTree";
import { TemplateGroupsPanel } from "./TemplateGroupsPanel";
import type {
  Prisma,
  BOQGroup,
  BOQTemplate,
  BOQTemplateSection,
  BOQTemplateLineItem,
} from "@prisma/client";

// --- TEMPLATE UI TYPES ---
//
// These describe the actual JSON shape this page receives from
// GET /api/boq-templates (src/app/api/boq-templates/route.ts):
// `sections: { include: { group: true, lineItems: true } }`. Unlike BOQ
// (Task 7's BOQSectionUI/BOQLineItemUI), the template model has no
// Decimal fields — title/name/category/groupId/sortOrder are all
// String/Int — so no Decimal-to-string JSON-boundary conversion is
// needed. One JSON-boundary conversion DOES apply here though: `createdAt`
// (a DateTime field, on both BOQTemplate and the nested BOQGroup) arrives
// as an ISO `string` over JSON, not a `Date` — same as Task 7's
// BOQCurrentUI handles for BOQ's own DateTime fields (see the `createdAt:
// string` override below). There's also no client-side computed/derived
// field analogous to BOQ's computedSubtotal/computedAmount, so no
// post-computation "required fields" variant is needed here either.
// No further relations to include here (BOQTemplateLineItem's only
// relation is the back-reference to its section), so the plain model
// type is the exact fetch shape — unlike Task 7's BOQLineItemUI, which
// needed a GetPayload<{include: ...}> for its `item`/`workerType` joins.
export type BOQTemplateLineItemUI = BOQTemplateLineItem;

export type BOQTemplateSectionUI = Omit<
  Prisma.BOQTemplateSectionGetPayload<{
    include: { group: true; lineItems: true };
  }>,
  "group" | "lineItems"
> & {
  // `group.createdAt` is a DateTime field — see JSON-boundary note above.
  group: Omit<BOQGroup, "createdAt"> & { createdAt: string };
  lineItems: BOQTemplateLineItemUI[];
};

// The full template object as returned by GET/POST /api/boq-templates.
export type BOQTemplateUI = Omit<
  Prisma.BOQTemplateGetPayload<{
    include: { sections: { include: { group: true; lineItems: true } } };
  }>,
  "sections" | "createdAt"
> & {
  // `createdAt` is a DateTime field — see JSON-boundary note above.
  createdAt: string;
  sections: BOQTemplateSectionUI[];
};

export default function TemplatesPage() {
  const {
    data: templatesData,
    loading: templatesLoading,
    refetch: refetchTemplates,
  } = useApiResource<BOQTemplateUI[]>("/api/boq-templates");
  const {
    data: groupsData,
    loading: groupsLoading,
    refetch: refetchGroups,
  } = useApiResource<BOQGroup[]>("/api/boq-groups?all=true");
  const loading = templatesLoading || groupsLoading;

  const [templates, setTemplates] = useState<BOQTemplateUI[]>([]);
  const [groups, setGroups] = useState<BOQGroup[]>([]);
  const [expandedTemplates, setExpandedTemplates] = useState<
    Record<string, boolean>
  >({});

  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs fetched data into locally-editable state for optimistic edits
    setTemplates(templatesData || []);
  }, [templatesData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs fetched data into locally-editable state for optimistic edits
    setGroups(groupsData || []);
  }, [groupsData]);

  const refetchAll = (opts?: { silent?: boolean }) => {
    refetchTemplates(opts);
    refetchGroups(opts);
  };

  const addTemplateMutation = useApiMutation<
    Record<string, unknown>,
    BOQTemplateUI
  >("POST");
  const templateMutation = useApiMutation<
    Record<string, unknown>,
    BOQTemplate
  >("PATCH");
  const deleteTemplateMutation = useApiMutation<undefined, void>("DELETE");

  const addSectionMutation = useApiMutation<
    Record<string, unknown>,
    BOQTemplateSection
  >("POST");
  const sectionMutation = useApiMutation<
    Record<string, unknown>,
    BOQTemplateSection
  >("PATCH");
  const deleteSectionMutation = useApiMutation<undefined, void>("DELETE");

  const addItemMutation = useApiMutation<
    Record<string, unknown>,
    BOQTemplateLineItem
  >("POST");
  const itemMutation = useApiMutation<
    Record<string, unknown>,
    BOQTemplateLineItem
  >("PATCH");
  const deleteItemMutation = useApiMutation<undefined, void>("DELETE");

  const addGroupMutation = useApiMutation<Record<string, unknown>, BOQGroup>(
    "POST",
  );
  const groupMutation = useApiMutation<Record<string, unknown>, BOQGroup>(
    "PATCH",
  );

  const toggleExpand = (id: string) => {
    setExpandedTemplates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- TEMPLATES ---
  const handleAddTemplate = async () => {
    try {
      const t = await addTemplateMutation.mutate("/api/boq-templates", {
        name: "New Template",
        category: "General",
      });
      setExpandedTemplates((prev) => ({ ...prev, [t.id]: true }));
      refetchAll({ silent: true });
    } catch {}
  };

  const handleTemplateChange = (id: string, field: string, value: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const handleTemplateBlur = async (
    id: string,
    field: string,
    value: string,
  ) => {
    try {
      await templateMutation.mutate(`/api/boq-templates/${id}`, {
        [field]: value,
      });
    } catch {}
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplateMutation.mutate(`/api/boq-templates/${id}`);
      refetchAll({ silent: true });
    } catch {}
  };

  // --- SECTIONS ---
  const handleAddSection = async (templateId: string) => {
    if (groups.filter((g) => g.isActive).length === 0)
      return alert("You need at least one active BOQ Group first.");
    // Non-null: the length check above already guarantees at least one
    // active group exists, so `find` here cannot return undefined.
    const firstActiveGroup = groups.find((g) => g.isActive)!;
    try {
      await addSectionMutation.mutate(
        `/api/boq-templates/${templateId}/sections`,
        {
          name: "New Section",
          groupId: firstActiveGroup.id,
        },
      );
      refetchAll({ silent: true });
    } catch {}
  };

  const handleSectionChange = (
    templateId: string,
    sectionId: string,
    field: string,
    value: string,
  ) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id === templateId) {
          return {
            ...t,
            sections: t.sections.map((s: BOQTemplateSectionUI) =>
              s.id === sectionId ? { ...s, [field]: value } : s,
            ),
          };
        }
        return t;
      }),
    );
  };

  const handleSectionBlur = async (
    sectionId: string,
    field: string,
    value: string,
  ) => {
    try {
      await sectionMutation.mutate(`/api/boq-template-sections/${sectionId}`, {
        [field]: value,
      });
    } catch {}
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSectionMutation.mutate(
        `/api/boq-template-sections/${sectionId}`,
      );
      refetchAll({ silent: true });
    } catch {}
  };

  const handleReorderSection = async (
    templateId: string,
    sectionId: string,
    direction: "up" | "down",
  ) => {
    // 1. Optimistic UI update (without mutating nested state references)
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        const idx = t.sections.findIndex(
          (s: BOQTemplateSectionUI) => s.id === sectionId,
        );
        if (idx < 0) return t;
        if (direction === "up" && idx === 0) return t;
        if (direction === "down" && idx === t.sections.length - 1) return t;

        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        const newSections = [...t.sections];

        // Deep copy to prevent React state mutation bugs
        const item1 = { ...newSections[idx] };
        const item2 = { ...newSections[swapIdx] };

        const tempSort = item1.sortOrder;
        item1.sortOrder = item2.sortOrder;
        item2.sortOrder = tempSort;

        newSections[idx] = item2;
        newSections[swapIdx] = item1;

        return { ...t, sections: newSections };
      }),
    );

    // 2. Fetch original target values for the API payload
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const idx = template.sections.findIndex(
      (s: BOQTemplateSectionUI) => s.id === sectionId,
    );
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentSection = template.sections[idx];
    const targetSection = template.sections[swapIdx];
    if (!targetSection || !currentSection) return;

    try {
      await Promise.all([
        sectionMutation.mutate(`/api/boq-template-sections/${sectionId}`, {
          sortOrder: targetSection.sortOrder,
        }),
        sectionMutation.mutate(
          `/api/boq-template-sections/${targetSection.id}`,
          { sortOrder: currentSection.sortOrder },
        ),
      ]);
      refetchAll({ silent: true }); // Silently syncs state in the background
    } catch {
      refetchAll({ silent: true });
    }
  };

  // --- ITEMS ---
  const handleAddItem = async (sectionId: string) => {
    try {
      await addItemMutation.mutate(
        `/api/boq-template-sections/${sectionId}/items`,
        { title: "New Item" },
      );
      refetchAll({ silent: true });
    } catch {}
  };

  const handleItemChange = (
    templateId: string,
    sectionId: string,
    itemId: string,
    value: string,
  ) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id === templateId) {
          return {
            ...t,
            sections: t.sections.map((s: BOQTemplateSectionUI) => {
              if (s.id === sectionId) {
                return {
                  ...s,
                  lineItems: s.lineItems.map((li: BOQTemplateLineItemUI) =>
                    li.id === itemId ? { ...li, title: value } : li,
                  ),
                };
              }
              return s;
            }),
          };
        }
        return t;
      }),
    );
  };

  const handleItemBlur = async (itemId: string, value: string) => {
    try {
      await itemMutation.mutate(`/api/boq-template-line-items/${itemId}`, {
        title: value,
      });
    } catch {}
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItemMutation.mutate(
        `/api/boq-template-line-items/${itemId}`,
      );
      refetchAll({ silent: true });
    } catch {}
  };

  const handleReorderItem = async (
    templateId: string,
    sectionId: string,
    itemId: string,
    direction: "up" | "down",
  ) => {
    // 1. Optimistic UI Update to fix lag (without mutating nested state references)
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: t.sections.map((s: BOQTemplateSectionUI) => {
            if (s.id !== sectionId) return s;
            const idx = s.lineItems.findIndex(
              (li: BOQTemplateLineItemUI) => li.id === itemId,
            );
            if (idx < 0) return s;
            if (direction === "up" && idx === 0) return s;
            if (direction === "down" && idx === s.lineItems.length - 1)
              return s;

            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            const newItems = [...s.lineItems];

            const item1 = { ...newItems[idx] };
            const item2 = { ...newItems[swapIdx] };

            const tempSort = item1.sortOrder;
            item1.sortOrder = item2.sortOrder;
            item2.sortOrder = tempSort;

            newItems[idx] = item2;
            newItems[swapIdx] = item1;

            return { ...s, lineItems: newItems };
          }),
        };
      }),
    );

    // 2. Fetch original target values for the API payload
    const template = templates.find((t) => t.id === templateId);
    const section = template?.sections.find(
      (s: BOQTemplateSectionUI) => s.id === sectionId,
    );
    if (!section) return;

    const idx = section.lineItems.findIndex(
      (li: BOQTemplateLineItemUI) => li.id === itemId,
    );
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentItem = section.lineItems[idx];
    const targetItem = section.lineItems[swapIdx];
    if (!targetItem || !currentItem) return;

    try {
      await Promise.all([
        itemMutation.mutate(`/api/boq-template-line-items/${itemId}`, {
          sortOrder: targetItem.sortOrder,
        }),
        itemMutation.mutate(`/api/boq-template-line-items/${targetItem.id}`, {
          sortOrder: currentItem.sortOrder,
        }),
      ]);
      refetchAll({ silent: true }); // Silently syncs state in the background
    } catch {
      refetchAll({ silent: true });
    }
  };

  // --- GROUPS ---
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      await addGroupMutation.mutate("/api/boq-groups", {
        name: newGroupName,
      });
      setNewGroupName("");
      refetchAll({ silent: true });
    } catch {
    } finally {
      setAddingGroup(false);
    }
  };

  const handleGroupChange = (id: string, value: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, name: value } : g)),
    );
  };

  const handleGroupBlur = async (id: string, value: string) => {
    try {
      await groupMutation.mutate(`/api/boq-groups/${id}`, { name: value });
    } catch {
      refetchAll({ silent: true });
    }
  };

  const handleToggleGroupActive = async (id: string, isActive: boolean) => {
    try {
      setGroups((prev) =>
        prev.map((g) => (g.id === id ? { ...g, isActive } : g)),
      );
      await groupMutation.mutate(`/api/boq-groups/${id}`, { isActive });
      refetchAll({ silent: true });
    } catch {
      refetchAll({ silent: true });
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
      </div>
    );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            BOQ Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage reusable structures for building estimates quickly.
          </p>
        </div>
        <Button
          onClick={handleAddTemplate}
          className="bg-blue-600 hover:bg-blue-700 font-bold"
        >
          <Plus className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <TemplateTree
          templates={templates}
          groups={groups}
          expandedTemplates={expandedTemplates}
          toggleExpand={toggleExpand}
          handlers={{
            handleTemplateChange,
            handleTemplateBlur,
            handleDeleteTemplate,
            handleAddSection,
            handleSectionChange,
            handleSectionBlur,
            handleDeleteSection,
            handleReorderSection,
            handleAddItem,
            handleItemChange,
            handleItemBlur,
            handleDeleteItem,
            handleReorderItem,
          }}
        />

        <TemplateGroupsPanel
          groups={groups}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          addingGroup={addingGroup}
          handleAddGroup={handleAddGroup}
          handleGroupChange={handleGroupChange}
          handleGroupBlur={handleGroupBlur}
          handleToggleGroupActive={handleToggleGroupActive}
        />
      </div>
    </div>
  );
}
