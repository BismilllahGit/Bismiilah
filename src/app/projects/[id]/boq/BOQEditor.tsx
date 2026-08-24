"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Calculator,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock,
  Printer,
  Layers,
  Settings,
  CheckCircle2,
  Edit,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface BOQEditorProps {
  projectId: string;
  projectData?: any;
}

export default function BOQEditor({ projectId, projectData }: BOQEditorProps) {
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false); // Global interaction lock for stability
  const [boqData, setBoqData] = useState<{
    current: any | null;
    allVersions: any[];
  }>({ current: null, allVersions: [] });
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const [boqGroups, setBoqGroups] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [workerTypes, setWorkerTypes] = useState<any[]>([]);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const currentBOQ = boqData.current;
  const isDraft = currentBOQ?.status === "DRAFT";

  // Local state for the entire BOQ grid to enable live calculations
  const [localSections, setLocalSections] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState({
    targetBudget: "",
    cgstRate: "9",
    sgstRate: "9",
    note: "",
    termsOverride: "",
  });

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedVersion]);

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

        const flattened =
          boqJson.current.sections?.map((s: any) => ({
            ...s,
            lineItems:
              s.lineItems ||
              s.categories?.flatMap((c: any) => c.lineItems) ||
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

  const showStatus = (
    text: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  // --- LOCAL LIVE CALCULATIONS ---
  const { totals, computedSections } = useMemo(() => {
    let grandTotal = 0;
    const computedSecs = localSections.map((sec) => {
      let subtotal = 0;
      const computedItems = sec.lineItems.map((li: any) => {
        let amount = Number(li.amount || 0);
        if (li.lineType === "CALCULATED") {
          amount = Number(li.quantity || 0) * Number(li.rate || 0);
        }
        subtotal += amount;
        return { ...li, computedAmount: amount };
      });
      grandTotal += subtotal;
      return { ...sec, computedSubtotal: subtotal, lineItems: computedItems };
    });

    const cgst = grandTotal * (Number(localSettings.cgstRate || 0) / 100);
    const sgst = grandTotal * (Number(localSettings.sgstRate || 0) / 100);
    const finalTotal = grandTotal + cgst + sgst;

    return {
      computedSections: computedSecs,
      totals: { grandTotal, cgst, sgst, finalTotal },
    };
  }, [localSections, localSettings.cgstRate, localSettings.sgstRate]);

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
    } catch (e) {
      showStatus("Failed to save setting", "error");
    }
  };

  const handleAddSection = async () => {
    if (!currentBOQ || !isDraft || isMutating) return;
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
    } catch (e) {
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
    } catch (e) {}
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (
      !isDraft ||
      isMutating ||
      !confirm("Delete this section and all its items?")
    )
      return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/boq/sections/${sectionId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchAllData(true);
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      showStatus("Failed to add milestone", "error");
    } finally {
      setIsMutating(false);
    }
  };

  const handleMilestoneChange = (
    milestoneId: string,
    field: string,
    value: any,
  ) =>
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, [field]: value } : m)),
    );
  const handleMilestoneBlur = async (
    milestoneId: string,
    field: string,
    value: any,
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
    } catch (e) {
      showStatus("Failed to update milestone", "error");
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!isDraft || isMutating || !confirm("Delete this milestone?")) return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchAllData(true);
    } catch (e) {
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
      const idx = milestones.findIndex((m: any) => m.id === milestoneId);
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
    } catch (e) {
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
    } catch (e) {
    } finally {
      setIsMutating(false);
    }
  };

  const handleItemChange = (
    sectionId: string,
    itemId: string,
    field: string,
    value: any,
  ) => {
    setLocalSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lineItems: s.lineItems.map((li: any) =>
            li.id === itemId ? { ...li, [field]: value } : li,
          ),
        };
      }),
    );
  };

  const handleItemBlur = async (itemId: string, field: string, value: any) => {
    if (!isDraft && field !== "executedQuantity" && field !== "executedAmount")
      return;
    try {
      let payload = { [field]: value };
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
    } catch (e) {}
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!isDraft || isMutating || !confirm("Delete this line item?")) return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/boq/line-items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchAllData(true);
    } catch (e) {
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

      const idx = section.lineItems.findIndex((li: any) => li.id === itemId);
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
    } catch (e) {
      await fetchAllData(true);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDownloadQuotation = async () => {
    if (!currentBOQ || isMutating) return;
    setExportingPdf(true);
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
        const data = await res.json();
        if (data.url) window.open(data.url, "_blank");
      }
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
    } catch (e) {
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
    } catch (e) {
      showStatus("Failed to unlock BOQ", "error");
    } finally {
      setIsMutating(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
      </div>
    );

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
        <Button
          onClick={handleInitializeBOQ}
          size="lg"
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-md"
        >
          <Plus className="mr-2 h-5 w-5" /> Initialize Blank BOQ
        </Button>
      </div>
    );
  }

  // Calculate missing field validations
  let hasMissingFields = false;
  let missingFieldsCount = 0;
  computedSections.forEach((s) =>
    s.lineItems.forEach((li: any) => {
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

  // KEY FIX: Added min-w-0 to prevent native inputs from enforcing a minimum width and blowing out the layout
  const tableInputClass =
    "w-full min-w-0 bg-transparent outline-none px-2 py-1.5 focus:bg-white focus:ring-1 focus:ring-blue-500 hover:bg-slate-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const cardInputClass =
    "w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-3 py-2 text-sm outline-none transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass =
    "text-[10px] font-bold uppercase text-slate-500 mb-1 block tracking-wider";

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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mx-4 xl:mx-0">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" /> BOQ Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Target Budget (₹)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={localSettings.targetBudget}
              onChange={(e) =>
                handleSettingsChange("targetBudget", e.target.value)
              }
              onBlur={(e) => handleSettingsBlur("targetBudget", e.target.value)}
              disabled={!isDraft}
              className="font-mono bg-slate-50"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              CGST Rate (%)
            </label>
            <Input
              type="number"
              value={localSettings.cgstRate}
              onChange={(e) => handleSettingsChange("cgstRate", e.target.value)}
              onBlur={(e) => handleSettingsBlur("cgstRate", e.target.value)}
              disabled={!isDraft}
              className="bg-slate-50"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              SGST Rate (%)
            </label>
            <Input
              type="number"
              value={localSettings.sgstRate}
              onChange={(e) => handleSettingsChange("sgstRate", e.target.value)}
              onBlur={(e) => handleSettingsBlur("sgstRate", e.target.value)}
              disabled={!isDraft}
              className="bg-slate-50"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Internal Note
            </label>
            <Input
              type="text"
              placeholder="e.g. For client review"
              value={localSettings.note}
              onChange={(e) => handleSettingsChange("note", e.target.value)}
              onBlur={(e) => handleSettingsBlur("note", e.target.value)}
              disabled={!isDraft}
              className="bg-slate-50"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Terms & Conditions Override
          </label>
          <Textarea
            placeholder={
              businessProfile?.defaultTerms ||
              "Standard terms and conditions..."
            }
            value={localSettings.termsOverride}
            onChange={(e) =>
              handleSettingsChange("termsOverride", e.target.value)
            }
            onBlur={(e) => handleSettingsBlur("termsOverride", e.target.value)}
            disabled={!isDraft}
            className="min-h-[80px] text-sm bg-slate-50 resize-y"
          />
        </div>
      </div>

      {/* --- DESKTOP VIEW: FLUID SPACED TABLE (Visible only on xl screens) --- */}
      <div className="hidden xl:block bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto">
        {/* KEY FIX: Removed min-w-[1200px] entirely to force the table to stay strictly inside the container limit */}
        <Table className="w-full border-collapse text-sm">
          <TableHeader className="bg-slate-800 [&_th]:text-slate-200 [&_th]:font-bold [&_th]:border-r [&_th]:border-slate-700">
            <TableRow className="hover:bg-slate-800">
              <TableHead className="w-[40px] text-center p-2">S.No</TableHead>
              <TableHead className="w-[16%] p-2">
                Item Title / Description
              </TableHead>
              <TableHead className="w-[8%] p-2">Make</TableHead>
              <TableHead className="w-[7%] p-2 text-center">Type</TableHead>
              <TableHead className="w-[6%] p-2 text-right">Qty</TableHead>
              <TableHead className="w-[5%] p-2 text-center">Unit</TableHead>
              <TableHead className="w-[8%] p-2 text-right">Rate (₹)</TableHead>
              <TableHead className="w-[9%] p-2 text-right">
                Est. Amount
              </TableHead>
              <TableHead className="w-[11%] p-2">Material / Grade</TableHead>
              <TableHead className="w-[11%] p-2">Worker Type</TableHead>
              <TableHead className="w-[7%] p-2 text-right bg-blue-900/40 text-blue-200">
                Act. Qty
              </TableHead>
              <TableHead className="w-[9%] p-2 text-right bg-blue-900/40 text-blue-200">
                Act. Amount
              </TableHead>
              {isDraft && (
                <TableHead className="w-[40px] text-center p-2">
                  <Settings className="h-4 w-4 mx-auto text-slate-400" />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {computedSections.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isDraft ? 13 : 12}
                  className="text-center py-10 text-slate-500 italic"
                >
                  No sections added yet.
                </TableCell>
              </TableRow>
            ) : (
              computedSections.map((sec, sIdx) => (
                <React.Fragment key={sec.id}>
                  <TableRow className="bg-slate-100 hover:bg-slate-100 border-y-2 border-slate-300">
                    <TableCell
                      colSpan={isDraft ? 13 : 12}
                      className="p-3 align-middle"
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="h-5 w-5 text-slate-500" />
                        {isDraft ? (
                          <>
                            <input
                              className="font-bold text-base text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 rounded px-3 py-1.5 w-full max-w-[400px] shadow-sm"
                              value={sec.name}
                              onChange={(e) =>
                                handleSectionChange(
                                  sec.id,
                                  "name",
                                  e.target.value,
                                )
                              }
                              onBlur={(e) =>
                                handleSectionBlur(
                                  sec.id,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Section Name"
                            />
                            <select
                              className="text-xs bg-white border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 w-48 shadow-sm cursor-pointer"
                              value={sec.groupId || ""}
                              onChange={(e) => {
                                handleSectionChange(
                                  sec.id,
                                  "groupId",
                                  e.target.value,
                                );
                                handleSectionBlur(
                                  sec.id,
                                  "groupId",
                                  e.target.value,
                                );
                              }}
                            >
                              <option value="" disabled>
                                Select Group
                              </option>
                              {boqGroups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2 ml-4 border-l border-slate-300 pl-4">
                              <button
                                onClick={() =>
                                  handleReorderSection(sec.id, "up")
                                }
                                disabled={sIdx === 0 || isMutating}
                                className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 shadow-sm transition-colors"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleReorderSection(sec.id, "down")
                                }
                                disabled={
                                  sIdx === computedSections.length - 1 ||
                                  isMutating
                                }
                                className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 shadow-sm transition-colors"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSection(sec.id)}
                                disabled={isMutating}
                                className="p-1.5 bg-rose-50 border border-rose-100 rounded text-rose-500 hover:text-rose-700 ml-2 shadow-sm transition-colors disabled:opacity-30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-base text-slate-900">
                              {sec.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs font-semibold bg-white"
                            >
                              {sec.group?.name || "Uncategorized"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {sec.lineItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isDraft ? 13 : 12}
                        className="text-center py-6 text-slate-400 italic text-xs"
                      >
                        No items in this section.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sec.lineItems.map((li: any, lIdx: number) => {
                      const isCalc = li.lineType === "CALCULATED";
                      const missingData =
                        isCalc &&
                        (!li.quantity || !li.rate || !li.title?.trim());

                      return (
                        <TableRow
                          key={li.id}
                          className={`hover:bg-slate-50 transition-colors [&_td]:border-r [&_td]:border-slate-100 ${missingData ? "bg-amber-50/30" : ""}`}
                        >
                          <TableCell className="p-1.5 align-top">
                            {isDraft ? (
                              <input
                                className={`${tableInputClass} text-center text-xs font-bold w-full`}
                                value={li.itemNo ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "itemNo",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(
                                    li.id,
                                    "itemNo",
                                    e.target.value,
                                  )
                                }
                                placeholder="No."
                              />
                            ) : (
                              <div className="text-center font-bold text-slate-500 p-2">
                                {li.itemNo || "-"}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top max-w-0">
                            {isDraft ? (
                              <div className="flex flex-col w-full h-full gap-2">
                                <input
                                  className={`${tableInputClass} font-bold text-sm text-slate-900 w-full`}
                                  value={li.title ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Item Title"
                                />
                                <textarea
                                  className={`${tableInputClass} text-xs text-slate-600 min-h-[64px] resize-y w-full`}
                                  value={li.description ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Detailed description..."
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5 p-2 overflow-hidden w-full">
                                <span
                                  className="font-bold text-sm text-slate-900 truncate"
                                  title={li.title}
                                >
                                  {li.title}
                                </span>
                                {li.description && (
                                  <span
                                    className="text-xs text-slate-600 truncate"
                                    title={li.description}
                                  >
                                    {li.description}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top">
                            {isDraft ? (
                              <input
                                className={`${tableInputClass} text-xs w-full h-full`}
                                value={li.make ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "make",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(li.id, "make", e.target.value)
                                }
                                placeholder="Make"
                              />
                            ) : (
                              <div
                                className="p-2 text-xs truncate"
                                title={li.make}
                              >
                                {li.make || "-"}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top text-center">
                            {isDraft ? (
                              <select
                                className="w-full min-w-0 text-[10px] font-bold uppercase tracking-wider bg-slate-50 rounded border border-slate-200 outline-none p-2 focus:ring-1 focus:ring-blue-500 text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                                value={li.lineType}
                                onChange={(e) => {
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "lineType",
                                    e.target.value,
                                  );
                                  handleItemBlur(
                                    li.id,
                                    "lineType",
                                    e.target.value,
                                  );
                                }}
                              >
                                <option value="CALCULATED">CALC</option>
                                <option value="LUMP_SUM">LUMP</option>
                              </select>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase"
                              >
                                {li.lineType === "LUMP_SUM" ? "LUMP" : "CALC"}
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top">
                            {isDraft ? (
                              <input
                                type="number"
                                className={`${tableInputClass} text-right text-sm font-mono w-full ${!isCalc ? "opacity-30 cursor-not-allowed bg-slate-50" : ""}`}
                                value={
                                  li.quantity === 0 && !isCalc
                                    ? ""
                                    : (li.quantity ?? "")
                                }
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(
                                    li.id,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                disabled={!isCalc}
                                placeholder="0"
                              />
                            ) : (
                              <div className="p-2 text-right font-mono text-sm">
                                {isCalc
                                  ? Number(li.quantity).toLocaleString()
                                  : "-"}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top text-center">
                            {isDraft ? (
                              <input
                                className={`${tableInputClass} text-center text-xs font-semibold w-full ${!isCalc ? "opacity-30 cursor-not-allowed bg-slate-50" : ""}`}
                                value={li.unit ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(li.id, "unit", e.target.value)
                                }
                                disabled={!isCalc}
                                placeholder="Unit"
                              />
                            ) : (
                              <div className="p-2 text-xs text-center font-semibold">
                                {isCalc ? li.unit || "-" : "-"}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top">
                            {isDraft ? (
                              <input
                                type="number"
                                className={`${tableInputClass} text-right text-sm font-mono w-full ${!isCalc ? "opacity-30 cursor-not-allowed bg-slate-50" : ""}`}
                                value={
                                  li.rate === 0 && !isCalc
                                    ? ""
                                    : (li.rate ?? "")
                                }
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "rate",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(li.id, "rate", e.target.value)
                                }
                                disabled={!isCalc}
                                placeholder="0.00"
                              />
                            ) : (
                              <div className="p-2 text-right font-mono text-sm">
                                {isCalc
                                  ? Number(li.rate).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })
                                  : "-"}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top bg-slate-50/50">
                            {isDraft && !isCalc ? (
                              <input
                                type="number"
                                className={`${tableInputClass} text-right text-sm font-bold font-mono text-slate-900 w-full bg-white border border-slate-200 shadow-sm`}
                                value={li.amount ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(
                                    li.id,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                              />
                            ) : (
                              <div className="p-2 text-right font-mono text-sm font-bold text-slate-900">
                                {Number(li.computedAmount).toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top max-w-0">
                            {isDraft ? (
                              <div className="flex flex-col gap-2 w-full p-1">
                                <select
                                  className="w-full min-w-0 text-[11px] bg-slate-50 border border-slate-200 rounded outline-none p-1.5 focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                  value={li.itemId ?? ""}
                                  onChange={(e) => {
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "itemId",
                                      e.target.value,
                                    );
                                    handleItemBlur(
                                      li.id,
                                      "itemId",
                                      e.target.value,
                                    );
                                  }}
                                >
                                  <option value="">No material link...</option>
                                  {itemsList.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className={`${tableInputClass} text-[10px] font-bold uppercase tracking-wider !px-1.5 border-b border-dashed border-slate-300 w-full`}
                                  value={li.grade ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "grade",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "grade",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="GRADE / SPEC"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5 p-2 overflow-hidden w-full">
                                {li.item ? (
                                  <span
                                    className="text-[11px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded truncate inline-block max-w-full"
                                    title={li.item.name}
                                  >
                                    ✓ {li.item.name}
                                  </span>
                                ) : (
                                  <span className="text-[11px] italic text-slate-400">
                                    -
                                  </span>
                                )}
                                {li.grade && (
                                  <span
                                    className="text-[10px] font-bold uppercase text-slate-500 mt-0.5 truncate"
                                    title={li.grade}
                                  >
                                    {li.grade}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top max-w-0">
                            {isDraft ? (
                              <select
                                className="w-full min-w-0 text-[11px] bg-slate-50 border border-slate-200 rounded outline-none p-1.5 focus:ring-1 focus:ring-blue-500 mt-1 cursor-pointer disabled:opacity-50"
                                value={li.workerTypeId ?? ""}
                                onChange={(e) => {
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "workerTypeId",
                                    e.target.value,
                                  );
                                  handleItemBlur(
                                    li.id,
                                    "workerTypeId",
                                    e.target.value,
                                  );
                                }}
                              >
                                <option value="">No worker link...</option>
                                {workerTypes
                                  .filter((wt) => wt.isActive)
                                  .map((wt) => (
                                    <option key={wt.id} value={wt.id}>
                                      {wt.name}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <div className="p-2 overflow-hidden w-full">
                                {li.workerType ? (
                                  <span
                                    className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded truncate flex items-center gap-1 max-w-full"
                                    title={li.workerType.name}
                                  >
                                    👷 {li.workerType.name}
                                  </span>
                                ) : (
                                  <span className="text-[11px] italic text-slate-400">
                                    -
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top bg-blue-50/30">
                            {currentBOQ?.status === "ACTIVE" ? (
                              <input
                                type="number"
                                className={`${tableInputClass} text-right text-sm font-mono font-bold text-blue-700 w-full bg-white border border-blue-200 shadow-sm`}
                                value={li.executedQuantity ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "executedQuantity",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(
                                    li.id,
                                    "executedQuantity",
                                    e.target.value,
                                  )
                                }
                                placeholder="0"
                              />
                            ) : (
                              <div className="p-2 text-right font-mono text-sm font-bold text-blue-700 opacity-60">
                                {Number(li.executedQuantity).toLocaleString()}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-1.5 align-top bg-blue-50/30">
                            {currentBOQ?.status === "ACTIVE" ? (
                              <input
                                type="number"
                                className={`${tableInputClass} text-right text-sm font-mono font-bold text-blue-800 w-full bg-white border border-blue-200 shadow-sm`}
                                value={li.executedAmount ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "executedAmount",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(
                                    li.id,
                                    "executedAmount",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                              />
                            ) : (
                              <div className="p-2 text-right font-mono text-sm font-bold text-blue-800 opacity-60">
                                {Number(li.executedAmount).toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </div>
                            )}
                          </TableCell>

                          {isDraft && (
                            <TableCell className="p-1.5 align-middle">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <button
                                  onClick={() =>
                                    handleReorderItem(sec.id, li.id, "up")
                                  }
                                  disabled={lIdx === 0 || isMutating}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleReorderItem(sec.id, li.id, "down")
                                  }
                                  disabled={
                                    lIdx === sec.lineItems.length - 1 ||
                                    isMutating
                                  }
                                  className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(li.id)}
                                  disabled={isMutating}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 ml-1 bg-rose-50 rounded-full transition-colors disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}

                  <TableRow className="bg-slate-50 font-bold shadow-inner border-b border-slate-300">
                    <TableCell
                      colSpan={isDraft ? 7 : 7}
                      className="p-3 border-r border-slate-200 align-middle"
                    >
                      {isDraft ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddLineItem(sec.id)}
                          disabled={isMutating}
                          className="text-slate-700 hover:text-slate-900 font-semibold h-9 shadow-sm bg-white border-slate-300 px-4 disabled:opacity-50"
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      ) : (
                        <span className="text-xs uppercase tracking-wider text-slate-500 ml-2">
                          Section Quotation Subtotal
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-3 text-right font-mono text-sm text-slate-900 bg-slate-100/50">
                      ₹
                      {sec.computedSubtotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell
                      colSpan={isDraft ? 5 : 4}
                      className="bg-slate-100/50"
                    ></TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>

        {isDraft && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 sticky left-0">
            <Button
              variant="outline"
              onClick={handleAddSection}
              disabled={isMutating}
              className="border-dashed border-slate-400 font-bold bg-white hover:bg-slate-100 text-slate-700 shadow-sm h-10 px-6 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Section
            </Button>
          </div>
        )}
      </div>

      {/* --- MOBILE VIEW: CARD-BASED LAYOUT FOR ITEMS (Visible only on < xl screens) --- */}
      <div className="block xl:hidden mx-4 space-y-6">
        {computedSections.length === 0 ? (
          <div className="text-center py-8 text-slate-500 italic bg-white rounded-xl border border-dashed border-slate-300">
            No sections added yet.
          </div>
        ) : (
          computedSections.map((sec, sIdx) => (
            <div
              key={sec.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Section Header Card */}
              <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-slate-500 shrink-0" />
                  {isDraft ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input
                        className={cardInputClass}
                        value={sec.name ?? ""}
                        onChange={(e) =>
                          handleSectionChange(sec.id, "name", e.target.value)
                        }
                        onBlur={(e) =>
                          handleSectionBlur(sec.id, "name", e.target.value)
                        }
                        placeholder="Section Name"
                      />
                      <select
                        className="w-full text-sm bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-sm disabled:opacity-50"
                        value={sec.groupId ?? ""}
                        onChange={(e) => {
                          handleSectionChange(
                            sec.id,
                            "groupId",
                            e.target.value,
                          );
                          handleSectionBlur(sec.id, "groupId", e.target.value);
                        }}
                      >
                        <option value="" disabled>
                          Select Group
                        </option>
                        {boqGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-lg text-slate-900">
                        {sec.name}
                      </span>
                      <Badge variant="outline" className="text-xs bg-white">
                        {sec.group?.name || "Uncategorized"}
                      </Badge>
                    </div>
                  )}
                </div>

                {isDraft && (
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReorderSection(sec.id, "up")}
                        disabled={sIdx === 0 || isMutating}
                        className="p-2 text-slate-600 bg-white border border-slate-300 rounded shadow-sm disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReorderSection(sec.id, "down")}
                        disabled={
                          sIdx === computedSections.length - 1 || isMutating
                        }
                        className="p-2 text-slate-600 bg-white border border-slate-300 rounded shadow-sm disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteSection(sec.id)}
                      disabled={isMutating}
                      className="px-3 py-1.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded shadow-sm flex items-center disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete Section
                    </button>
                  </div>
                )}
              </div>

              {/* Section Line Items (Cards) */}
              <div className="p-3 bg-slate-50 space-y-4">
                {sec.lineItems.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-sm italic">
                    No items in this section.
                  </div>
                ) : (
                  sec.lineItems.map((li: any, lIdx: number) => {
                    const isCalc = li.lineType === "CALCULATED";

                    return (
                      <Card
                        key={li.id}
                        className="shadow-sm border border-slate-200"
                      >
                        <CardContent className="p-4 flex flex-col gap-4">
                          {/* Title Row */}
                          <div className="flex gap-3 items-start">
                            <div className="w-16 shrink-0">
                              <span className={labelClass}>S.No</span>
                              {isDraft ? (
                                <input
                                  className={`${cardInputClass} text-center font-bold`}
                                  value={li.itemNo ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "itemNo",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "itemNo",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="No."
                                />
                              ) : (
                                <div className="text-sm font-bold text-slate-600 py-2 text-center bg-slate-100 rounded">
                                  {li.itemNo || "-"}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <span className={labelClass}>Item Title</span>
                              {isDraft ? (
                                <input
                                  className={`${cardInputClass} font-bold text-slate-900`}
                                  value={li.title ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Item Title"
                                />
                              ) : (
                                <div
                                  className="text-base font-bold text-slate-900 py-1 truncate"
                                  title={li.title}
                                >
                                  {li.title}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <span className={labelClass}>Description</span>
                            {isDraft ? (
                              <textarea
                                className={`${cardInputClass} text-slate-600 min-h-[60px] resize-y`}
                                value={li.description ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(
                                    li.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="Detailed description..."
                              />
                            ) : (
                              <div
                                className="text-sm text-slate-600 truncate"
                                title={li.description}
                              >
                                {li.description || (
                                  <span className="italic opacity-50">
                                    No description
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Specifications Grid */}
                          <div className="grid grid-cols-2 gap-3 bg-slate-100/50 p-3 rounded-lg border border-slate-100">
                            <div>
                              <span className={labelClass}>Brand / Make</span>
                              {isDraft ? (
                                <input
                                  className={cardInputClass}
                                  value={li.make ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "make",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "make",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Make"
                                />
                              ) : (
                                <div className="text-sm font-semibold">
                                  {li.make || "-"}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className={labelClass}>Grade / Spec</span>
                              {isDraft ? (
                                <input
                                  className={cardInputClass}
                                  value={li.grade ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "grade",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "grade",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Spec"
                                />
                              ) : (
                                <div className="text-sm font-semibold">
                                  {li.grade || "-"}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className={labelClass}>Material Link</span>
                              {isDraft ? (
                                <select
                                  className={cardInputClass}
                                  value={li.itemId ?? ""}
                                  onChange={(e) => {
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "itemId",
                                      e.target.value,
                                    );
                                    handleItemBlur(
                                      li.id,
                                      "itemId",
                                      e.target.value,
                                    );
                                  }}
                                >
                                  <option value="">No material linked</option>
                                  {itemsList.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="text-sm font-semibold text-slate-800">
                                  {li.item?.name || "-"}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className={labelClass}>Worker Type</span>
                              {isDraft ? (
                                <select
                                  className={cardInputClass}
                                  value={li.workerTypeId ?? ""}
                                  onChange={(e) => {
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "workerTypeId",
                                      e.target.value,
                                    );
                                    handleItemBlur(
                                      li.id,
                                      "workerTypeId",
                                      e.target.value,
                                    );
                                  }}
                                >
                                  <option value="">No worker linked</option>
                                  {workerTypes
                                    .filter((wt) => wt.isActive)
                                    .map((wt) => (
                                      <option key={wt.id} value={wt.id}>
                                        {wt.name}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <div className="text-sm font-semibold text-slate-800">
                                  {li.workerType?.name || "-"}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pricing Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <span className={labelClass}>Pricing Type</span>
                              {isDraft ? (
                                <select
                                  className={cardInputClass}
                                  value={li.lineType ?? ""}
                                  onChange={(e) => {
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "lineType",
                                      e.target.value,
                                    );
                                    handleItemBlur(
                                      li.id,
                                      "lineType",
                                      e.target.value,
                                    );
                                  }}
                                >
                                  <option value="CALCULATED">
                                    Calculated (Qty × Rate)
                                  </option>
                                  <option value="LUMP_SUM">
                                    Lump Sum (Fixed)
                                  </option>
                                </select>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs w-max"
                                >
                                  {li.lineType === "LUMP_SUM"
                                    ? "LUMPSUM"
                                    : "CALCULATED"}
                                </Badge>
                              )}
                            </div>
                            <div>
                              <span className={labelClass}>Quantity</span>
                              {isDraft ? (
                                <input
                                  type="number"
                                  className={`${cardInputClass} font-mono text-right ${!isCalc ? "opacity-50 bg-slate-100" : ""}`}
                                  value={
                                    li.quantity === 0 && !isCalc
                                      ? ""
                                      : (li.quantity ?? "")
                                  }
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  disabled={!isCalc}
                                  placeholder="0"
                                />
                              ) : (
                                <div className="text-sm font-mono">
                                  {isCalc
                                    ? Number(li.quantity).toLocaleString()
                                    : "-"}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className={labelClass}>Unit</span>
                              {isDraft ? (
                                <input
                                  className={`${cardInputClass} text-center ${!isCalc ? "opacity-50 bg-slate-100" : ""}`}
                                  value={li.unit ?? ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  disabled={!isCalc}
                                  placeholder="UOM"
                                />
                              ) : (
                                <div className="text-sm text-center font-semibold">
                                  {isCalc ? li.unit || "-" : "-"}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className={labelClass}>Unit Rate (₹)</span>
                              {isDraft ? (
                                <input
                                  type="number"
                                  className={`${cardInputClass} font-mono text-right ${!isCalc ? "opacity-50 bg-slate-100" : ""}`}
                                  value={
                                    li.rate === 0 && !isCalc
                                      ? ""
                                      : (li.rate ?? "")
                                  }
                                  onChange={(e) =>
                                    handleItemChange(
                                      sec.id,
                                      li.id,
                                      "rate",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handleItemBlur(
                                      li.id,
                                      "rate",
                                      e.target.value,
                                    )
                                  }
                                  disabled={!isCalc}
                                  placeholder="0.00"
                                />
                              ) : (
                                <div className="text-sm font-mono font-bold">
                                  ₹{" "}
                                  {isCalc
                                    ? Number(li.rate).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                      })
                                    : "-"}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Est Amount & Execution - LIGHT MODE for Mobile */}
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mt-2">
                            <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                              Estimated Amount
                            </span>
                            {isDraft && !isCalc ? (
                              <input
                                type="number"
                                className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-3 py-2 text-lg font-bold font-mono outline-none text-right shadow-sm"
                                value={li.amount ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    sec.id,
                                    li.id,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handleItemBlur(
                                    li.id,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                              />
                            ) : (
                              <div className="text-right font-mono text-xl font-black text-slate-900">
                                ₹
                                {Number(li.computedAmount).toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </div>
                            )}

                            {currentBOQ?.status === "ACTIVE" && (
                              <div className="bg-blue-50 rounded p-3 mt-4 border border-blue-100">
                                <span className="text-[10px] uppercase text-blue-600 font-bold block mb-2 tracking-wider">
                                  Execution (Actuals)
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-[10px] uppercase text-slate-500">
                                      Actual Qty
                                    </span>
                                    <input
                                      type="number"
                                      className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded px-2 py-1.5 text-sm font-mono text-slate-900 outline-none mt-1 shadow-sm"
                                      value={li.executedQuantity ?? ""}
                                      onChange={(e) =>
                                        handleItemChange(
                                          sec.id,
                                          li.id,
                                          "executedQuantity",
                                          e.target.value,
                                        )
                                      }
                                      onBlur={(e) =>
                                        handleItemBlur(
                                          li.id,
                                          "executedQuantity",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Qty"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase text-slate-500">
                                      Actual ₹
                                    </span>
                                    <input
                                      type="number"
                                      className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded px-2 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none mt-1 text-right shadow-sm"
                                      value={li.executedAmount ?? ""}
                                      onChange={(e) =>
                                        handleItemChange(
                                          sec.id,
                                          li.id,
                                          "executedAmount",
                                          e.target.value,
                                        )
                                      }
                                      onBlur={(e) =>
                                        handleItemBlur(
                                          li.id,
                                          "executedAmount",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Amount"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Actions */}
                          {isDraft && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleReorderItem(sec.id, li.id, "up")
                                  }
                                  disabled={lIdx === 0 || isMutating}
                                  className="p-2 text-slate-600 bg-slate-100 rounded disabled:opacity-30"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleReorderItem(sec.id, li.id, "down")
                                  }
                                  disabled={
                                    lIdx === sec.lineItems.length - 1 ||
                                    isMutating
                                  }
                                  className="p-2 text-slate-600 bg-slate-100 rounded disabled:opacity-30"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                              </div>
                              <button
                                onClick={() => handleDeleteItem(li.id)}
                                disabled={isMutating}
                                className="p-2 text-rose-600 bg-rose-50 rounded disabled:opacity-30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}

                {isDraft && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLineItem(sec.id)}
                    disabled={isMutating}
                    className="w-full text-slate-700 font-bold bg-white border-dashed border-slate-300 h-10 shadow-sm mt-2 disabled:opacity-50"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Item to Section
                  </Button>
                )}
              </div>

              {/* Section Footer */}
              <div className="bg-slate-200/50 p-4 flex justify-between items-center border-t border-slate-200">
                <span className="text-xs uppercase font-bold text-slate-600">
                  Subtotal
                </span>
                <span className="font-mono text-xl text-slate-900 font-black">
                  ₹
                  {sec.computedSubtotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))
        )}

        {isDraft && (
          <Button
            variant="outline"
            onClick={handleAddSection}
            disabled={isMutating}
            className="w-full border-dashed border-slate-400 font-bold bg-white text-slate-700 h-12 shadow-sm disabled:opacity-50"
          >
            <Plus className="mr-2 h-5 w-5" /> Add New Section
          </Button>
        )}
      </div>

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
      <div className="mx-4 xl:mx-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-12">
        <div className="bg-slate-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-slate-300" />
              Payment Terms & Conditions
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Configure milestone-based payment schedules.
            </p>
          </div>
        </div>

        {/* Desktop Table View (Hidden on small screens) */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-16 font-bold text-slate-900 text-center">
                  No
                </TableHead>
                <TableHead className="font-bold text-slate-900">
                  Stage Name
                </TableHead>
                <TableHead className="w-40 font-bold text-slate-900">
                  Target Date
                </TableHead>
                <TableHead className="w-32 text-right font-bold text-slate-900">
                  Adv %
                </TableHead>
                <TableHead className="w-48 text-right font-bold text-slate-900">
                  Adv Amount
                </TableHead>
                {isDraft && (
                  <TableHead className="w-24 text-center font-bold">
                    <Settings className="h-4 w-4 mx-auto text-slate-400" />
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-slate-400 italic"
                  >
                    No payment milestones configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                milestones.map((m: any, idx: number) => (
                  <TableRow
                    key={m.id}
                    className={idx % 2 === 1 ? "bg-slate-50/50" : ""}
                  >
                    <TableCell className="font-medium text-slate-500 text-center">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 p-1 border-r border-slate-200">
                      {isDraft ? (
                        <input
                          className="w-full h-10 px-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded outline-none text-sm shadow-sm transition-colors"
                          value={m.stageName || ""}
                          placeholder="Stage Name"
                          onChange={(e) =>
                            handleMilestoneChange(
                              m.id,
                              "stageName",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            handleMilestoneBlur(
                              m.id,
                              "stageName",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm">{m.stageName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 p-1 border-r border-slate-200">
                      {isDraft ? (
                        <input
                          type="date"
                          className="w-full h-10 px-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded outline-none text-sm shadow-sm transition-colors cursor-pointer"
                          value={
                            m.targetDate
                              ? new Date(m.targetDate)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            handleMilestoneChange(
                              m.id,
                              "targetDate",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            handleMilestoneBlur(
                              m.id,
                              "targetDate",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm">
                          {m.targetDate
                            ? new Date(m.targetDate).toLocaleDateString("en-IN")
                            : "-"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 p-1 border-r border-slate-200">
                      {isDraft ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full h-10 px-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded outline-none text-sm text-right shadow-sm transition-colors"
                          value={m.percentage ?? ""}
                          onChange={(e) =>
                            handleMilestoneChange(
                              m.id,
                              "percentage",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            handleMilestoneBlur(
                              m.id,
                              "percentage",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm">
                          {Number(m.percentage).toFixed(2)}%
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900 bg-slate-50/80 p-3">
                      ₹
                      {Number(m.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    {isDraft && (
                      <TableCell className="text-center p-1">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleReorderMilestone(m.id, "up")}
                            disabled={idx === 0 || isMutating}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReorderMilestone(m.id, "down")}
                            disabled={
                              idx === milestones.length - 1 || isMutating
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMilestone(m.id)}
                            disabled={isMutating}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded ml-1 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {milestones.length > 0 && (
                <TableRow className="bg-slate-100/80">
                  <TableCell
                    colSpan={3}
                    className="text-right font-bold text-slate-600"
                  >
                    Total Adv. Allocation
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold text-base ${isMilestoneInvalid ? "text-rose-600" : "text-slate-900"}`}
                  >
                    {totalMilestonePercentage.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 text-base p-3 border-l border-slate-200">
                    ₹
                    {milestones
                      .reduce(
                        (acc: number, m: any) => acc + Number(m.amount || 0),
                        0,
                      )
                      .toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </TableCell>
                  {isDraft && <TableCell></TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View (Hidden on >= md screens) */}
        <div className="md:hidden flex flex-col p-4 bg-slate-50 space-y-4">
          {milestones.length === 0 ? (
            <div className="text-center py-6 text-slate-400 italic text-sm border border-dashed border-slate-300 rounded-lg">
              No payment milestones configured yet.
            </div>
          ) : (
            milestones.map((m: any, idx: number) => (
              <Card key={m.id} className="shadow-sm border-slate-200">
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-500 uppercase text-xs tracking-wider">
                      Stage {idx + 1}
                    </span>
                    {isDraft && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReorderMilestone(m.id, "up")}
                          disabled={idx === 0 || isMutating}
                          className="p-1.5 text-slate-400 bg-slate-100 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReorderMilestone(m.id, "down")}
                          disabled={idx === milestones.length - 1 || isMutating}
                          className="p-1.5 text-slate-400 bg-slate-100 rounded disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          disabled={isMutating}
                          className="p-1.5 text-rose-500 bg-rose-50 rounded ml-2 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className={labelClass}>Stage Name</span>
                    {isDraft ? (
                      <input
                        className={cardInputClass}
                        value={m.stageName || ""}
                        placeholder="Stage Name"
                        onChange={(e) =>
                          handleMilestoneChange(
                            m.id,
                            "stageName",
                            e.target.value,
                          )
                        }
                        onBlur={(e) =>
                          handleMilestoneBlur(m.id, "stageName", e.target.value)
                        }
                      />
                    ) : (
                      <div className="text-sm font-bold text-slate-900">
                        {m.stageName}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={labelClass}>Target Date</span>
                      {isDraft ? (
                        <input
                          type="date"
                          className={cardInputClass}
                          value={
                            m.targetDate
                              ? new Date(m.targetDate)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            handleMilestoneChange(
                              m.id,
                              "targetDate",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            handleMilestoneBlur(
                              m.id,
                              "targetDate",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        <div className="text-sm text-slate-700">
                          {m.targetDate
                            ? new Date(m.targetDate).toLocaleDateString("en-IN")
                            : "-"}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className={labelClass}>Advance %</span>
                      {isDraft ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className={`${cardInputClass} text-right`}
                          value={m.percentage ?? ""}
                          onChange={(e) =>
                            handleMilestoneChange(
                              m.id,
                              "percentage",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            handleMilestoneBlur(
                              m.id,
                              "percentage",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        <div className="text-sm font-bold text-right">
                          {Number(m.percentage).toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center border border-slate-100 mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Adv Amount
                    </span>
                    <span className="font-mono text-lg font-black text-slate-900">
                      ₹
                      {Number(m.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {milestones.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-2">
              <span className="font-bold text-slate-600 text-xs uppercase text-center">
                Total Advance Allocation
              </span>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1">
                <span
                  className={`font-bold text-lg ${isMilestoneInvalid ? "text-rose-600" : "text-slate-900"}`}
                >
                  {totalMilestonePercentage.toFixed(2)}%
                </span>
                <span className="font-mono font-bold text-slate-900 text-xl">
                  ₹
                  {milestones
                    .reduce(
                      (acc: number, m: any) => acc + Number(m.amount || 0),
                      0,
                    )
                    .toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
            </div>
          )}
        </div>

        {isDraft && (
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={handleAddMilestone}
              disabled={isMutating}
              className="w-full md:w-auto border-dashed border-slate-300 font-bold bg-white hover:bg-slate-100 text-slate-700 h-10 shadow-sm disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Payment Stage
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
