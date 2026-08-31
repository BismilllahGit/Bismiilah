"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/loading-block";
import {
  Plus,
  Calculator,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock,
  Printer,
  CheckCircle2,
  Edit,
} from "lucide-react";
import { computeBOQTotals } from "@/lib/boq-calculations";
import { BOQSettingsPanel } from "./BOQSettingsPanel";
import { BOQMilestonesPanel } from "./BOQMilestonesPanel";
import { BOQSectionsDesktopView } from "./BOQSectionsDesktopView";
import { BOQSectionsMobileView } from "./BOQSectionsMobileView";
import { TemplatePickerSheet } from "./TemplatePickerSheet";
import type {
  Prisma,
  BOQ,
  BOQPaymentMilestone,
  BOQGroup,
  Item,
  WorkerType,
  BusinessProfile,
  Project,
  Client,
} from "@prisma/client";
import type { GroupTotal } from "@/lib/queries/boq-queries";

// --- BOQ UI TYPES ---
//
// These describe the actual JSON shape this component receives from
// GET /api/projects/[id]/boq (src/lib/queries/boq-queries.ts ->
// getEnrichedProjectBOQ), NOT the raw Prisma model types verbatim:
//   - Decimal fields the server explicitly runs through Number()
//     (quantity, rate, amount, targetBudget) arrive as `number`.
//   - Decimal fields left untouched server-side (cgstRate, sgstRate,
//     executedQuantity, executedAmount, milestone percentage/amount)
//     serialize to `string` over JSON (Prisma's Decimal#toJSON() returns
//     a string).
//   - DateTime fields serialize to an ISO `string`, not a `Date`.
//   - Editable numeric fields (quantity/rate/amount) can also hold a raw
//     `string` locally between a keystroke (onChange, `e.target.value`)
//     and the numeric coercion that happens on blur (see handleItemBlur/
//     handleItemChange) — hence `string | number`.

export type BOQLineItemUI = Omit<
  Prisma.BOQLineItemGetPayload<{
    include: {
      item: { select: { id: true; name: true; unit: true } };
      workerType: { select: { id: true; name: true } };
    };
  }>,
  "quantity" | "rate" | "amount" | "executedQuantity" | "executedAmount"
> & {
  quantity: number | string | null;
  rate: number | string | null;
  amount: number | string;
  executedQuantity: string;
  executedAmount: string;
  // Added server-side by computeActualsForBOQ (src/lib/queries/boq-queries.ts)
  estimatedQuantity?: number | null;
  estimatedAmount?: number;
  actualQuantity?: number | null;
  actualAmount?: number | null;
  isOverBudgetByCost?: boolean;
  isOverBudgetByQuantity?: boolean;
  isOverBudget?: boolean;
  isTrackedMaterialLine?: boolean;
  // Added client-side by computeBOQTotals (src/lib/boq-calculations.ts)
  computedAmount?: number;
};

export type BOQSectionUI = Omit<
  Prisma.BOQSectionGetPayload<{
    include: {
      group: { select: { id: true; name: true; sortOrder: true } };
      lineItems: {
        include: {
          item: { select: { id: true; name: true; unit: true } };
          workerType: { select: { id: true; name: true } };
        };
      };
    };
  }>,
  "lineItems"
> & {
  lineItems: BOQLineItemUI[];
  // Added server-side by computeBOQRollups / computeActualsForBOQ
  subtotal?: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
  estimatedQuantity?: number | null;
  actualQuantity?: number | null;
  isOverBudgetByCost?: boolean;
  isOverBudgetByQuantity?: boolean;
  isOverBudget?: boolean;
  hasTrackedItems?: boolean;
  // Added client-side by computeBOQTotals (src/lib/boq-calculations.ts)
  computedSubtotal?: number;
};

// The post-computation shape `computeBOQTotals`'s `computedSections` output
// actually has (src/lib/boq-calculations.ts): every section unconditionally
// gets `computedSubtotal`, and every line item unconditionally gets
// `computedAmount` — so both are required here, unlike on BOQSectionUI/
// BOQLineItemUI (which stay optional to also cover pre-computation state,
// e.g. `localSections` before `computeBOQTotals` has run over it).
export type ComputedBOQSectionUI = Omit<
  BOQSectionUI,
  "lineItems" | "computedSubtotal"
> & {
  computedSubtotal: number;
  lineItems: (Omit<BOQLineItemUI, "computedAmount"> & {
    computedAmount: number;
  })[];
};

// The full "current" BOQ payload (BOQ scalars + rollup/actuals totals).
type BOQCurrentUI = Omit<
  BOQ,
  "targetBudget" | "cgstRate" | "sgstRate" | "createdAt" | "approvedAt"
> & {
  targetBudget: number | null;
  cgstRate: string;
  sgstRate: string;
  createdAt: string;
  approvedAt: string | null;
  sections: BOQSectionUI[];
  groupTotals: GroupTotal[];
  grandTotal: number;
  totalMaterialCost: number;
  totalLabourCost: number;
  totalOtherCost: number;
  totalProjectCost: number;
  isTargetBudgetExceeded: boolean;
  totalItemsOverBudget: number;
};

// Version-history summary entries ("allVersions").
type BOQVersionSummaryUI = Pick<BOQ, "id" | "versionNumber" | "status"> & {
  targetBudget: number | null;
  createdAt: string;
  approvedAt: string | null;
};

// Payment milestones, as returned by GET .../milestones (raw Prisma model —
// Decimal/Date fields aren't converted server-side, so they're `string` over JSON).
export type BOQMilestoneUI = Omit<
  BOQPaymentMilestone,
  "targetDate" | "percentage" | "amount"
> & {
  targetDate: string | null;
  percentage: number | string;
  amount: number | string;
};

// `projectData` prop shape, as constructed by page.tsx's server component.
type ProjectWithClientUI = Omit<Project, "agreedValue"> & {
  agreedValue: number | null;
  client: Client | null;
};

interface BOQEditorProps {
  projectId: string;
  projectData?: ProjectWithClientUI | null;
}

export default function BOQEditor({
  projectId,
  // Accepted for interface parity with page.tsx's caller; not read here.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectData,
}: BOQEditorProps) {
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false); // Global interaction lock for stability
  const [boqData, setBoqData] = useState<{
    current: BOQCurrentUI | null;
    allVersions: BOQVersionSummaryUI[];
  }>({ current: null, allVersions: [] });
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const [boqGroups, setBoqGroups] = useState<BOQGroup[]>([]);
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [milestones, setMilestones] = useState<BOQMilestoneUI[]>([]);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);


  const currentBOQ = boqData.current;
  const isDraft = currentBOQ?.status === "DRAFT";

  // Local state for the entire BOQ grid to enable live calculations
  const [localSections, setLocalSections] = useState<BOQSectionUI[]>([]);
  const [localSettings, setLocalSettings] = useState({
    targetBudget: "",
    cgstRate: "9",
    sgstRate: "9",
    note: "",
    termsOverride: "",
  });

  const showStatus = (
    text: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  const fetchAllData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const versionQuery = selectedVersion ? `?version=${selectedVersion}` : "";
      const [boqRes, groupsRes, itemsRes, workersRes, profileRes] =
        await Promise.all([
          fetch(`/api/projects/${projectId}/boq${versionQuery}`),
          fetch("/api/boq-groups"),
          fetch("/api/items"),
          fetch("/api/worker-types"),
          fetch("/api/business-profile"),
        ]);

      const boqJson = boqRes.ok
        ? await boqRes.json()
        : { current: null, allVersions: [] };
      setBoqData(boqJson);
      if (groupsRes.ok) setBoqGroups(await groupsRes.json());
      if (itemsRes.ok) setItemsList(await itemsRes.json());
      if (workersRes.ok) setWorkerTypes(await workersRes.json());
      if (profileRes.ok) setBusinessProfile(await profileRes.json());

      if (boqJson.current) {
        setLocalSettings({
          targetBudget: boqJson.current.targetBudget?.toString() || "",
          cgstRate: boqJson.current.cgstRate?.toString() || "9",
          sgstRate: boqJson.current.sgstRate?.toString() || "9",
          note: boqJson.current.note || "",
          termsOverride: boqJson.current.termsOverride || "",
        });

        const flattened: BOQSectionUI[] =
          boqJson.current.sections?.map((s: BOQSectionUI) => ({
            ...s,
            lineItems:
              s.lineItems ||
              // `categories` predates the current group-based BOQ hierarchy
              // and no longer exists on BOQSection in schema.prisma (the
              // migration that introduced it has since been reverted) —
              // this branch is unreachable dead code under the real
              // current API shape. Preserved as-is (not deleted) since
              // removing it would be a behavior decision outside this
              // task's typing-only scope; narrow local cast keeps `any`
              // out of the type surface.
              (
                s as { categories?: { lineItems: BOQLineItemUI[] }[] }
              ).categories?.flatMap((c) => c.lineItems) ||
              [],
          })) || [];
        setLocalSections(flattened);

        const msRes = await fetch(
          `/api/projects/${projectId}/boq/${boqJson.current.id}/milestones`,
        );
        if (msRes.ok) setMilestones(await msRes.json());
      }
    } catch (err) {
      console.error("Error loading BOQ data:", err);
      if (!isBackground) showStatus("Failed to load BOQ data", "error");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: triggers this component's standard fetch-on-mount pattern
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedVersion]);

  // --- LOCAL LIVE CALCULATIONS ---
  const { totals, computedSections } = useMemo(
    () =>
      computeBOQTotals(
        localSections,
        localSettings.cgstRate,
        localSettings.sgstRate,
      ),
    [localSections, localSettings.cgstRate, localSettings.sgstRate],
  );

  // --- ACTIONS ---
  const handleSettingsChange = (field: string, value: string) =>
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  const handleSettingsBlur = async (field: string, value: string) => {
    if (!currentBOQ || !isDraft) return;
    try {
      await fetch(`/api/boq/${currentBOQ.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]:
            value === ""
              ? null
              : field.includes("Rate") || field === "targetBudget"
                ? Number(value)
                : value,
        }),
      });
    } catch {
      showStatus("Failed to save setting", "error");
    }
  };

  const handleAddSection = async () => {
    if (!currentBOQ || !isDraft || isMutating) return;
    if (boqGroups.length === 0) {
      showStatus(
        "No BOQ Groups exist yet. Add one in Settings → Templates before adding a section.",
        "error",
      );
      return;
    }
    setIsMutating(true);
    try {
      const res = await fetch("/api/boq/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boqId: currentBOQ.id,
          name: "New Section",
          groupId: boqGroups[0]?.id,
        }),
      });
      if (res.ok) await fetchAllData(true);
    } catch {
    } finally {
      setIsMutating(false);
    }
  };

  const handleSectionChange = (
    sectionId: string,
    field: string,
    value: string,
  ) =>
    setLocalSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s)),
    );
  const handleSectionBlur = async (
    sectionId: string,
    field: string,
    value: string,
  ) => {
    if (!isDraft) return;
    try {
      await fetch(`/api/boq/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {}
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!isDraft || isMutating) return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/boq/sections/${sectionId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchAllData(true);
    } catch {
    } finally {
      setIsMutating(false);
    }
  };

  const handleReorderSection = async (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    if (!isDraft || isMutating) return;
    setIsMutating(true);

    try {
      const idx = localSections.findIndex((s) => s.id === sectionId);
      if (
        idx < 0 ||
        (direction === "up" && idx === 0) ||
        (direction === "down" && idx === localSections.length - 1)
      ) {
        setIsMutating(false);
        return;
      }
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;

      const newSections = [...localSections];
      const temp = newSections[idx];
      newSections[idx] = newSections[swapIdx];
      newSections[swapIdx] = temp;

      // Force completely explicit array-index-based sort orders to heal DB ties
      newSections[idx].sortOrder = idx;
      newSections[swapIdx].sortOrder = swapIdx;
      setLocalSections(newSections);

      await Promise.all([
        fetch(`/api/boq/sections/${newSections[idx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newSections[idx].sortOrder }),
        }),
        fetch(`/api/boq/sections/${newSections[swapIdx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newSections[swapIdx].sortOrder }),
        }),
      ]);
      await fetchAllData(true);
    } catch {
      await fetchAllData(true);
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!currentBOQ || !isDraft || isMutating) return;
    setIsMutating(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/boq/${currentBOQ.id}/milestones`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageName: "New Stage",
            targetDate: new Date().toISOString(),
            percentage: 10,
            sortOrder: milestones.length,
          }),
        },
      );
      if (res.ok) await fetchAllData(true);
    } catch {
      showStatus("Failed to add milestone", "error");
    } finally {
      setIsMutating(false);
    }
  };

  const handleMilestoneChange = (
    milestoneId: string,
    field: string,
    value: string,
  ) =>
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, [field]: value } : m)),
    );
  const handleMilestoneBlur = async (
    milestoneId: string,
    field: string,
    value: string,
  ) => {
    if (!isDraft) return;
    try {
      const payload =
        field === "percentage" || field === "sortOrder" ? Number(value) : value;
      await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: payload }),
      });
      fetchAllData(true);
    } catch {
      showStatus("Failed to update milestone", "error");
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!isDraft || isMutating) return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchAllData(true);
    } catch {
    } finally {
      setIsMutating(false);
    }
  };

  const handleReorderMilestone = async (
    milestoneId: string,
    direction: "up" | "down",
  ) => {
    if (!isDraft || isMutating) return;
    setIsMutating(true);

    try {
      const idx = milestones.findIndex((m: BOQMilestoneUI) => m.id === milestoneId);
      if (
        idx < 0 ||
        (direction === "up" && idx === 0) ||
        (direction === "down" && idx === milestones.length - 1)
      ) {
        setIsMutating(false);
        return;
      }
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;

      const newMilestones = [...milestones];
      const temp = newMilestones[idx];
      newMilestones[idx] = newMilestones[swapIdx];
      newMilestones[swapIdx] = temp;

      // Ensure explicit and distinct values
      newMilestones[idx].sortOrder = idx;
      newMilestones[swapIdx].sortOrder = swapIdx;
      setMilestones(newMilestones);

      await Promise.all([
        fetch(`/api/milestones/${newMilestones[idx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newMilestones[idx].sortOrder }),
        }),
        fetch(`/api/milestones/${newMilestones[swapIdx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newMilestones[swapIdx].sortOrder }),
        }),
      ]);
      await fetchAllData(true);
    } catch {
      await fetchAllData(true);
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddLineItem = async (sectionId: string) => {
    if (!isDraft || isMutating) return;
    setIsMutating(true);
    try {
      const res = await fetch("/api/boq/line-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          title: "New Item",
          lineType: "CALCULATED",
          quantity: 1,
          rate: 0,
        }),
      });
      if (res.ok) await fetchAllData(true);
    } catch {
    } finally {
      setIsMutating(false);
    }
  };

  const handleItemChange = (
    sectionId: string,
    itemId: string,
    field: string,
    value: string,
  ) => {
    setLocalSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lineItems: s.lineItems.map((li: BOQLineItemUI) =>
            li.id === itemId ? { ...li, [field]: value } : li,
          ),
        };
      }),
    );
  };

  const handleItemBlur = async (
    itemId: string,
    field: string,
    value: string,
  ) => {
    if (!isDraft && field !== "executedQuantity" && field !== "executedAmount")
      return;
    try {
      let payload: Record<string, string | number> = { [field]: value };
      if (
        [
          "quantity",
          "rate",
          "amount",
          "executedQuantity",
          "executedAmount",
        ].includes(field)
      ) {
        payload = { [field]: value === "" ? 0 : Number(value) };
      }
      await fetch(`/api/boq/line-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!isDraft || isMutating) return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/boq/line-items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchAllData(true);
    } catch {
    } finally {
      setIsMutating(false);
    }
  };

  const handleReorderItem = async (
    sectionId: string,
    itemId: string,
    direction: "up" | "down",
  ) => {
    if (!isDraft || isMutating) return;
    setIsMutating(true);

    try {
      const sectionIdx = localSections.findIndex((s) => s.id === sectionId);
      if (sectionIdx < 0) {
        setIsMutating(false);
        return;
      }
      const section = localSections[sectionIdx];

      const idx = section.lineItems.findIndex(
        (li: BOQLineItemUI) => li.id === itemId,
      );
      if (
        idx < 0 ||
        (direction === "up" && idx === 0) ||
        (direction === "down" && idx === section.lineItems.length - 1)
      ) {
        setIsMutating(false);
        return;
      }
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;

      const newItems = [...section.lineItems];
      const temp = newItems[idx];
      newItems[idx] = newItems[swapIdx];
      newItems[swapIdx] = temp;

      // Ensure explicit index assignments
      newItems[idx].sortOrder = idx;
      newItems[swapIdx].sortOrder = swapIdx;

      setLocalSections((prev) => {
        const newSections = [...prev];
        newSections[sectionIdx] = { ...section, lineItems: newItems };
        return newSections;
      });

      await Promise.all([
        fetch(`/api/boq/line-items/${newItems[idx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newItems[idx].sortOrder }),
        }),
        fetch(`/api/boq/line-items/${newItems[swapIdx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newItems[swapIdx].sortOrder }),
        }),
      ]);
      await fetchAllData(true);
    } catch {
      await fetchAllData(true);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDownloadQuotation = async () => {
    if (!currentBOQ || isMutating) return;
    setExportingPdf(true);
    // Open the tab synchronously, inside the click handler, so browsers still
    // treat it as a direct result of the user gesture (avoids popup blockers)
    // — we point it at the PDF once it's ready below.
    const newTab = window.open("", "_blank");
    try {
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "boq",
          params: { projectId, boqId: currentBOQ.id },
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const fileNameMatch = disposition.match(/filename="?([^";]+)"?/);
        const fileName = fileNameMatch?.[1] || "boq.pdf";
        const blobUrl = window.URL.createObjectURL(blob);

        if (newTab) {
          newTab.location.href = blobUrl;
        } else {
          // Popup was blocked despite the synchronous open — fall back to
          // navigating the current tab.
          window.location.href = blobUrl;
        }

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Give the tab time to actually load the blob before freeing it.
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
      } else {
        newTab?.close();
      }
    } catch (err) {
      newTab?.close();
      throw err;
    } finally {
      setExportingPdf(false);
    }
  };

  const handleInitializeBOQ = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) fetchAllData();
    } finally {
      setLoading(false);
    }
  };

  const handleActivateBOQ = async () => {
    if (!currentBOQ || currentBOQ.status !== "DRAFT" || isMutating) return;
    if (!confirm("Activating will lock this BOQ as read-only. Proceed?"))
      return;
    setIsMutating(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/boq/${currentBOQ.id}/activate`,
        { method: "POST" },
      );
      if (res.ok) await fetchAllData();
    } catch {
    } finally {
      setIsMutating(false);
    }
  };

  // NEW EDIT/UNLOCK FUNCTIONALITY
  const handleUnlockBOQ = async () => {
    if (!currentBOQ || isDraft || isMutating) return;
    if (
      !confirm(
        "Unlocking will switch this active BOQ back to Draft mode for editing. Proceed?",
      )
    )
      return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/boq/${currentBOQ.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      if (res.ok) {
        await fetchAllData(true);
        showStatus("BOQ unlocked for editing", "success");
      } else {
        showStatus("Failed to unlock BOQ", "error");
      }
    } catch {
      showStatus("Failed to unlock BOQ", "error");
    } finally {
      setIsMutating(false);
    }
  };

  if (loading) return <LoadingBlock />;

  if (!currentBOQ) {
    return (
      <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-slate-50 border border-dashed rounded-xl m-4">
        <Calculator className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          No Estimate Found
        </h3>
        <p className="text-slate-500 mb-6 max-w-md">
          Initialize a new BOQ estimate for this project to start adding items,
          tracking budgets, and generating quotation PDFs.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            onClick={handleInitializeBOQ}
            size="lg"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-md"
          >
            <Plus className="mr-2 h-5 w-5" /> Initialize Blank BOQ
          </Button>
          <TemplatePickerSheet
            mode="create"
            projectId={projectId}
            onCreated={() => fetchAllData()}
            onError={(message) => showStatus(message, "error")}
          />
        </div>
      </div>
    );
  }

  // Calculate missing field validations
  let hasMissingFields = false;
  let missingFieldsCount = 0;
  computedSections.forEach((s) =>
    s.lineItems.forEach((li: BOQLineItemUI) => {
      if (
        !li.title?.trim() ||
        (li.lineType === "CALCULATED" && (!li.quantity || !li.rate))
      ) {
        hasMissingFields = true;
        missingFieldsCount++;
      }
    }),
  );

  const totalMilestonePercentage = milestones.reduce(
    (sum, m) => sum + Number(m.percentage || 0),
    0,
  );
  const isMilestoneInvalid =
    milestones.length > 0 && Math.abs(totalMilestonePercentage - 100) > 0.01;

  const sectionsHandlers = {
    handleSectionChange,
    handleSectionBlur,
    handleDeleteSection,
    handleReorderSection,
    handleAddSection,
    handleItemChange,
    handleItemBlur,
    handleDeleteItem,
    handleReorderItem,
    handleAddLineItem,
  };

  return (
    <div className="space-y-6 pb-20 w-full overflow-x-hidden">
      {/* STATUS TOAST */}
      {statusMsg && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded shadow-lg font-bold text-sm text-white ${statusMsg.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm mx-4 xl:mx-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Project Estimate (BOQ)
            </h2>
            <Badge
              variant={isDraft ? "secondary" : "default"}
              className={`px-2.5 py-0.5 font-bold uppercase tracking-widest text-xs ${isDraft ? "bg-amber-100 text-amber-800 border-amber-300" : currentBOQ.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-200 text-slate-600"}`}
            >
              {isDraft ? (
                <Unlock className="w-3 h-3 mr-1 inline-block" />
              ) : (
                <Lock className="w-3 h-3 mr-1 inline-block" />
              )}
              {currentBOQ.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
            Version {currentBOQ.versionNumber}{" "}
            <span className="text-slate-300">•</span> Created{" "}
            {new Date(currentBOQ.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {boqData.allVersions.length > 1 && (
            <div className="flex items-center mr-2 border-r pr-4">
              <span className="hidden sm:block text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">
                Version
              </span>
              <select
                className="bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 rounded px-2 py-1.5 focus:ring-2 focus:ring-slate-900 outline-none disabled:opacity-50"
                value={selectedVersion || currentBOQ.versionNumber}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
                disabled={isMutating}
              >
                {boqData.allVersions.map((v) => (
                  <option key={v.versionNumber} value={v.versionNumber}>
                    V{v.versionNumber} ({v.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleDownloadQuotation}
            disabled={exportingPdf || isMutating}
            className="font-semibold border-slate-300 flex-1 sm:flex-none disabled:opacity-50"
          >
            {exportingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}{" "}
            PDF
          </Button>

          {isDraft ? (
            <Button
              onClick={handleActivateBOQ}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex-1 sm:flex-none disabled:opacity-50"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Activate BOQ
            </Button>
          ) : (
            <Button
              onClick={handleUnlockBOQ}
              disabled={isMutating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex-1 sm:flex-none disabled:opacity-50"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit / Unlock BOQ
            </Button>
          )}
        </div>
      </div>

      {/* VALIDATION WARNINGS */}
      {(hasMissingFields || isMilestoneInvalid) && isDraft && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm mx-4 xl:mx-0">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">
                Pending Actions Required
              </h4>
              <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                {hasMissingFields && (
                  <li>
                    {missingFieldsCount} line item(s) are missing a Title,
                    Quantity, or Rate.
                  </li>
                )}
                {isMilestoneInvalid && (
                  <li>
                    Payment milestones sum to {totalMilestonePercentage}%, but
                    must exactly equal 100%.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* BOQ SETTINGS BAR */}
      <BOQSettingsPanel
        localSettings={localSettings}
        isDraft={isDraft}
        businessProfile={businessProfile}
        handleSettingsChange={handleSettingsChange}
        handleSettingsBlur={handleSettingsBlur}
      />

      {/* --- DESKTOP VIEW: FLUID SPACED TABLE (Visible only on xl screens) --- */}
      <BOQSectionsDesktopView
        computedSections={computedSections}
        isDraft={isDraft}
        isMutating={isMutating}
        isActive={currentBOQ?.status === "ACTIVE"}
        boqGroups={boqGroups}
        itemsList={itemsList}
        workerTypes={workerTypes}
        handlers={sectionsHandlers}
        importTemplateSlot={
          <TemplatePickerSheet
            mode="import"
            projectId={projectId}
            boqId={currentBOQ.id}
            disabled={isMutating}
            onCreated={() => fetchAllData(true)}
            onError={(message) => showStatus(message, "error")}
          />
        }
      />

      {/* --- MOBILE VIEW: CARD-BASED LAYOUT FOR ITEMS (Visible only on < xl screens) --- */}
      <BOQSectionsMobileView
        computedSections={computedSections}
        isDraft={isDraft}
        isMutating={isMutating}
        isActive={currentBOQ?.status === "ACTIVE"}
        boqGroups={boqGroups}
        itemsList={itemsList}
        workerTypes={workerTypes}
        handlers={sectionsHandlers}
        importTemplateSlot={
          <TemplatePickerSheet
            mode="import"
            projectId={projectId}
            boqId={currentBOQ.id}
            disabled={isMutating}
            triggerClassName="w-full border-dashed border-slate-400 font-bold bg-white hover:bg-slate-100 text-slate-700 h-12 shadow-sm disabled:opacity-50"
            onCreated={() => fetchAllData(true)}
            onError={(message) => showStatus(message, "error")}
          />
        }
      />

      {/* --- ROLLUP SUMMARY (GRAND TOTALS) --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-sm mx-4 md:ml-auto mt-6">
        <div className="bg-slate-800 px-4 py-2 text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Quotation Rollup
        </div>
        <div className="divide-y divide-slate-100 p-4 font-mono text-sm">
          <div className="flex justify-between py-1.5 font-bold text-slate-700">
            <span>Base Subtotal</span>
            <span>
              ₹
              {totals.grandTotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>CGST ({localSettings.cgstRate || 0}%)</span>
            <span>
              + ₹
              {totals.cgst.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>SGST ({localSettings.sgstRate || 0}%)</span>
            <span>
              + ₹
              {totals.sgst.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between py-3 mt-2 text-lg font-black text-slate-900 border-t-2 border-slate-900">
            <span>GRAND TOTAL</span>
            <span>
              ₹
              {totals.finalTotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="h-8"></div>

      {/* --- MILESTONES TABLE & MOBILE CARD VIEW --- */}
      <BOQMilestonesPanel
        milestones={milestones}
        isDraft={isDraft}
        isMutating={isMutating}
        handleAddMilestone={handleAddMilestone}
        handleMilestoneChange={handleMilestoneChange}
        handleMilestoneBlur={handleMilestoneBlur}
        handleDeleteMilestone={handleDeleteMilestone}
        handleReorderMilestone={handleReorderMilestone}
      />
    </div>
  );
}
