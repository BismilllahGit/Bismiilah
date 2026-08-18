"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Trash2, Edit2, ArrowUp, ArrowDown, Calculator, Check, AlertCircle, Loader2, Lock, Unlock, FileText, Search, Settings, CheckCircle2, X, AlertTriangle, History, Download, Share2, Printer
, Layers, Eye} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface BOQEditorProps {
  projectId: string;
  projectData?: any;
}

export default function BOQEditor({ projectId, projectData }: BOQEditorProps) {
  const [loading, setLoading] = useState(true);
  const [boqData, setBoqData] = useState<{ current: any | null; allVersions: any[] }>({ current: null, allVersions: [] });
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  const [boqGroups, setBoqGroups] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [workerTypes, setWorkerTypes] = useState<any[]>([]);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const currentBOQ = boqData.current;
  const isDraft = currentBOQ?.status === "DRAFT";
  const hasExistingDraft = boqData.allVersions.some((v) => v.status === "DRAFT");

  // Local state for the entire BOQ grid to enable live calculations
  const [localSections, setLocalSections] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState({
    targetBudget: "",
    cgstRate: "9",
    sgstRate: "9",
    note: "",
    termsOverride: ""
  });

  useEffect(() => {
    fetchAllData();
  }, [projectId, selectedVersion]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const versionQuery = selectedVersion ? `?version=${selectedVersion}` : "";
      const [boqRes, groupsRes, itemsRes, workersRes, profileRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/boq${versionQuery}`),
        fetch("/api/boq-groups"),
        fetch("/api/items"),
        fetch("/api/worker-types"),
        fetch("/api/business-profile"),
      ]);

      const boqJson = boqRes.ok ? await boqRes.json() : { current: null, allVersions: [] };
      setBoqData(boqJson);
      if (groupsRes.ok) setBoqGroups(await groupsRes.json());
      if (itemsRes.ok) setItemsList(await itemsRes.json());
      if (workersRes.ok) setWorkerTypes(await workersRes.json());
      if (profileRes.ok) setBusinessProfile(await profileRes.json());

      if (boqJson.current) {
        // Initialize local settings
        setLocalSettings({
          targetBudget: boqJson.current.targetBudget?.toString() || "",
          cgstRate: boqJson.current.cgstRate?.toString() || "9",
          sgstRate: boqJson.current.sgstRate?.toString() || "9",
          note: boqJson.current.note || "",
          termsOverride: boqJson.current.termsOverride || "",
        });

        // Initialize local sections (flattening categories if they still exist from legacy data, or just using direct lineItems)
        // Since we flattened the schema earlier, we should just have sections -> lineItems.
        const flattened = boqJson.current.sections?.map((s: any) => ({
          ...s,
          // Handle both new flat structure (s.lineItems) and legacy nested structure if it lingers
          lineItems: s.lineItems || s.categories?.flatMap((c: any) => c.lineItems) || []
        })) || [];
        setLocalSections(flattened);

        // Fetch milestones
        const msRes = await fetch(`/api/projects/${projectId}/boq/${boqJson.current.id}/milestones`);
        if (msRes.ok) setMilestones(await msRes.json());
      }
    } catch (err) {
      console.error("Error loading BOQ data:", err);
      showStatus("Failed to load BOQ data", "error");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (text: string, type: "success" | "error" | "info" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  // --- LOCAL LIVE CALCULATIONS ---
  const { totals, computedSections } = useMemo(() => {
    let grandTotal = 0;
    const computedSecs = localSections.map(sec => {
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
      totals: { grandTotal, cgst, sgst, finalTotal } 
    };
  }, [localSections, localSettings.cgstRate, localSettings.sgstRate]);

  // --- BOQ SETTINGS BAR ACTIONS ---
  const handleSettingsChange = (field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingsBlur = async (field: string, value: string) => {
    if (!currentBOQ || !isDraft) return;
    try {
      await fetch(`/api/boq/${currentBOQ.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value === "" ? null : (field.includes("Rate") || field === "targetBudget" ? Number(value) : value) }),
      });
    } catch (e) {
      showStatus("Failed to save setting", "error");
    }
  };

  // --- SECTION ACTIONS ---
  const handleAddSection = async () => {
    if (!currentBOQ || !isDraft) return;
    try {
      const res = await fetch("/api/boq/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boqId: currentBOQ.id, name: "New Section", groupId: boqGroups[0]?.id }),
      });
      if (res.ok) fetchAllData();
    } catch (e) {}
  };

  const handleSectionChange = (sectionId: string, field: string, value: string) => {
    setLocalSections(prev => prev.map(s => s.id === sectionId ? { ...s, [field]: value } : s));
  };

  const handleSectionBlur = async (sectionId: string, field: string, value: string) => {
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
    if (!isDraft || !confirm("Delete this section and all its items?")) return;
    try {
      const res = await fetch(`/api/boq/sections/${sectionId}`, { method: "DELETE" });
      if (res.ok) fetchAllData();
    } catch (e) {}
  };

  const handleReorderSection = async (sectionId: string, direction: "up" | "down") => {
    if (!isDraft) return;
    const idx = localSections.findIndex(s => s.id === sectionId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === localSections.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const targetSection = localSections[swapIdx];

    const newSections = [...localSections];
    const tempSort = newSections[idx].sortOrder;
    newSections[idx].sortOrder = newSections[swapIdx].sortOrder;
    newSections[swapIdx].sortOrder = tempSort;
    
    const temp = newSections[idx];
    newSections[idx] = newSections[swapIdx];
    newSections[swapIdx] = temp;
    setLocalSections(newSections);

    try {
      await Promise.all([
        fetch(`/api/boq/sections/${sectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: targetSection.sortOrder }) }),
        fetch(`/api/boq/sections/${targetSection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: localSections[idx].sortOrder }) }),
      ]);
    } catch (e) { fetchAllData(); }
  };

    // --- MILESTONE ACTIONS ---
  const handleAddMilestone = async () => {
    if (!currentBOQ || !isDraft) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/boq/${currentBOQ.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageName: "New Stage", targetDate: new Date().toISOString(), percentage: 10, sortOrder: milestones.length }),
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      showStatus("Failed to add milestone", "error");
    }
  };

  const handleMilestoneChange = (milestoneId: string, field: string, value: any) => {
    setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, [field]: value } : m));
  };

  const handleMilestoneBlur = async (milestoneId: string, field: string, value: any) => {
    if (!isDraft) return;
    try {
      const payload = field === "percentage" || field === "sortOrder" ? Number(value) : value;
      await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: payload }),
      });
      fetchAllData();
    } catch (e) {
      showStatus("Failed to update milestone", "error");
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!isDraft || !confirm("Delete this milestone?")) return;
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, { method: "DELETE" });
      if (res.ok) fetchAllData();
    } catch (e) {}
  };

  const handleReorderMilestone = async (milestoneId: string, direction: "up" | "down") => {
    if (!isDraft) return;
    const idx = milestones.findIndex((m: any) => m.id === milestoneId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === milestones.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const targetMilestone = milestones[swapIdx];

    try {
      await fetch("/api/milestones/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boqId: currentBOQ.id,
          updates: [
            { id: milestoneId, sortOrder: targetMilestone.sortOrder },
            { id: targetMilestone.id, sortOrder: milestones[idx].sortOrder }
          ]
        })
      });
      fetchAllData();
    } catch (e) {}
  };

  // --- AUXILIARY ACTIONS ---
  const handleSendWhatsApp = () => {
    if (!currentBOQ) return;
    const url = window.location.origin + `/projects/${projectId}/boq/share/${currentBOQ.id}`;
    const text = encodeURIComponent(`Here is the quotation for your project. View it here: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };


  // --- LINE ITEM ACTIONS ---
  const handleAddLineItem = async (sectionId: string) => {
    if (!isDraft) return;
    try {
      const res = await fetch("/api/boq/line-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, title: "New Item", lineType: "CALCULATED", quantity: 1, rate: 0 }),
      });
      if (res.ok) fetchAllData();
    } catch (e) {}
  };

  const handleItemChange = (sectionId: string, itemId: string, field: string, value: any) => {
    setLocalSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        lineItems: s.lineItems.map((li: any) => li.id === itemId ? { ...li, [field]: value } : li)
      };
    }));
  };

  const handleItemBlur = async (itemId: string, field: string, value: any) => {
    if (!isDraft) return;
    try {
      let payload = { [field]: value };
      if (field === "quantity" || field === "rate" || field === "amount" || field === "executedQuantity" || field === "executedAmount") {
        payload = { [field]: value === "" ? 0 : Number(value) };
      }
      
      await fetch(`/api/boq/line-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // trigger milestone recalculation silently by fetching all data if it was an amount-changing edit
      if (field === "quantity" || field === "rate" || field === "amount") {
         setTimeout(fetchAllData, 500); 
      }
    } catch (e) {}
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!isDraft || !confirm("Delete this line item?")) return;
    try {
      const res = await fetch(`/api/boq/line-items/${itemId}`, { method: "DELETE" });
      if (res.ok) fetchAllData();
    } catch (e) {}
  };

  const handleReorderItem = async (sectionId: string, itemId: string, direction: "up" | "down") => {
    if (!isDraft) return;
    const section = localSections.find(s => s.id === sectionId);
    if (!section) return;
    
    const idx = section.lineItems.findIndex((li: any) => li.id === itemId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === section.lineItems.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const targetItem = section.lineItems[swapIdx];

    try {
      await Promise.all([
        fetch(`/api/boq/line-items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: targetItem.sortOrder }) }),
        fetch(`/api/boq/line-items/${targetItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: section.lineItems[idx].sortOrder }) }),
      ]);
      fetchAllData();
    } catch (e) {}
  };

  // --- EXPORT & STATUS ---
  const handleDownloadQuotation = async () => {
    if (!currentBOQ) return;
    setExportingPdf(true);
    try {
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "boq", params: { projectId, boqId: currentBOQ.id } }),
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
    if (!currentBOQ || currentBOQ.status !== "DRAFT") return;
    if (!confirm("Activating will lock this BOQ as read-only. Proceed?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/boq/${currentBOQ.id}/activate`, { method: "POST" });
      if (res.ok) fetchAllData();
    } catch (e) {}
  };


  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;

  if (!currentBOQ) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border border-dashed rounded-xl">
        <Calculator className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Estimate Found</h3>
        <p className="text-slate-500 mb-6 max-w-md">Initialize a new BOQ estimate for this project to start adding items, tracking budgets, and generating quotation PDFs.</p>
        <Button onClick={() => handleInitializeBOQ()} size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-md">
          <Plus className="mr-2 h-5 w-5" /> Initialize Blank BOQ
        </Button>
      </div>
    );
  }

  // Calculate missing field validations
  let hasMissingFields = false;
  let missingFieldsCount = 0;
  computedSections.forEach(s => s.lineItems.forEach((li: any) => {
    if (!li.title?.trim() || (li.lineType === "CALCULATED" && (!li.quantity || !li.rate))) {
      hasMissingFields = true;
      missingFieldsCount++;
    }
  }));

  const totalMilestonePercentage = milestones.reduce((sum, m) => sum + Number(m.percentage || 0), 0);
  const isMilestoneInvalid = milestones.length > 0 && Math.abs(totalMilestonePercentage - 100) > 0.01;

  return (
    <div className="space-y-6 pb-20">
      
      {/* STATUS TOAST */}
      {statusMsg && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded shadow-lg font-bold text-sm text-white ${statusMsg.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
          {statusMsg.text}
        </div>
      )}

      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Project Estimate (BOQ)</h2>
            <Badge variant={isDraft ? "secondary" : "default"} className={`px-2.5 py-0.5 font-bold uppercase tracking-widest text-xs ${isDraft ? "bg-amber-100 text-amber-800 border-amber-300" : currentBOQ.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-200 text-slate-600"}`}>
              {isDraft ? <Unlock className="w-3 h-3 mr-1 inline-block" /> : <Lock className="w-3 h-3 mr-1 inline-block" />}
              {currentBOQ.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
            Version {currentBOQ.versionNumber} <span className="text-slate-300">•</span> Created {new Date(currentBOQ.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {boqData.allVersions.length > 1 && (
             <div className="flex items-center mr-2 border-r pr-4">
              <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">Version</span>
              <select 
                className="bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 rounded px-2 py-1.5 focus:ring-2 focus:ring-slate-900 outline-none"
                value={selectedVersion || currentBOQ.versionNumber}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
              >
                {boqData.allVersions.map(v => (
                  <option key={v.versionNumber} value={v.versionNumber}>V{v.versionNumber} ({v.status})</option>
                ))}
              </select>
             </div>
          )}
          <Button variant="outline" onClick={handleDownloadQuotation} disabled={exportingPdf} className="font-semibold border-slate-300">
            {exportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} PDF
          </Button>
          {isDraft && (
            <Button onClick={handleActivateBOQ} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Activate BOQ
            </Button>
          )}
        </div>
      </div>

      {/* VALIDATION WARNINGS */}
      {(hasMissingFields || isMilestoneInvalid) && isDraft && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">Pending Actions Required</h4>
              <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                {hasMissingFields && <li>{missingFieldsCount} line item(s) are missing a Title, Quantity, or Rate.</li>}
                {isMilestoneInvalid && <li>Payment milestones sum to {totalMilestonePercentage}%, but must exactly equal 100%.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* BOQ SETTINGS BAR */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" /> BOQ Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Target Budget (₹)</label>
            <Input 
              type="number"
              placeholder="0.00"
              value={localSettings.targetBudget}
              onChange={(e) => handleSettingsChange("targetBudget", e.target.value)}
              onBlur={(e) => handleSettingsBlur("targetBudget", e.target.value)}
              disabled={!isDraft}
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">CGST Rate (%)</label>
            <Input 
              type="number"
              value={localSettings.cgstRate}
              onChange={(e) => handleSettingsChange("cgstRate", e.target.value)}
              onBlur={(e) => handleSettingsBlur("cgstRate", e.target.value)}
              disabled={!isDraft}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">SGST Rate (%)</label>
            <Input 
              type="number"
              value={localSettings.sgstRate}
              onChange={(e) => handleSettingsChange("sgstRate", e.target.value)}
              onBlur={(e) => handleSettingsBlur("sgstRate", e.target.value)}
              disabled={!isDraft}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Internal Note</label>
            <Input 
              type="text"
              placeholder="e.g. For client review"
              value={localSettings.note}
              onChange={(e) => handleSettingsChange("note", e.target.value)}
              onBlur={(e) => handleSettingsBlur("note", e.target.value)}
              disabled={!isDraft}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Terms & Conditions Override (Overrides Company Default for this BOQ)</label>
          <Textarea 
            placeholder={businessProfile?.defaultTerms || "Standard terms and conditions..."}
            value={localSettings.termsOverride}
            onChange={(e) => handleSettingsChange("termsOverride", e.target.value)}
            onBlur={(e) => handleSettingsBlur("termsOverride", e.target.value)}
            disabled={!isDraft}
            className="min-h-[80px] text-sm"
          />
        </div>
      </div>

      {/* MAIN DENSE GRID */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto">
        <Table className="min-w-[1200px] border-collapse text-sm">
          <TableHeader className="bg-slate-800 [&_th]:text-slate-200 [&_th]:font-bold [&_th]:border-r [&_th]:border-slate-700">
            <TableRow className="hover:bg-slate-800">
              <TableHead className="w-12 text-center p-2">S.No</TableHead>
              <TableHead className="min-w-[300px] p-2">Item Title / Description</TableHead>
              <TableHead className="w-24 p-2">Make</TableHead>
              <TableHead className="w-24 p-2">Type</TableHead>
              <TableHead className="w-24 p-2 text-right">Qty</TableHead>
              <TableHead className="w-16 p-2 text-center">Unit</TableHead>
              <TableHead className="w-28 p-2 text-right">Rate (₹)</TableHead>
              <TableHead className="w-32 p-2 text-right">Est. Amount</TableHead>
              <TableHead className="w-32 p-2">Material / Grade</TableHead>
              <TableHead className="w-32 p-2">Worker Type</TableHead>
              <TableHead className="w-24 p-2 text-right bg-blue-900/40 text-blue-200">Act. Qty</TableHead>
              <TableHead className="w-32 p-2 text-right bg-blue-900/40 text-blue-200">Act. Amount</TableHead>
              {isDraft && <TableHead className="w-16 text-center p-2">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {computedSections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isDraft ? 13 : 12} className="text-center py-8 text-slate-500 italic">No sections added yet.</TableCell>
              </TableRow>
            ) : computedSections.map((sec, sIdx) => (
              <React.Fragment key={sec.id}>
                {/* SECTION HEADER ROW */}
                <TableRow className="bg-slate-100 hover:bg-slate-100 border-y-2 border-slate-300">
                  <TableCell colSpan={isDraft ? 13 : 12} className="p-2 align-middle">
                    <div className="flex items-center gap-3">
                      <Layers className="h-5 w-5 text-slate-500" />
                      {isDraft ? (
                        <>
                          <input 
                            className="font-bold text-base text-slate-900 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 min-w-[200px]"
                            value={sec.name}
                            onChange={(e) => handleSectionChange(sec.id, "name", e.target.value)}
                            onBlur={(e) => handleSectionBlur(sec.id, "name", e.target.value)}
                            placeholder="Section Name"
                          />
                          <select
                            className="text-xs bg-white border border-slate-300 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 w-40"
                            value={sec.groupId}
                            onChange={(e) => handleSectionBlur(sec.id, "groupId", e.target.value)}
                          >
                            <option value={sec.groupId}>{sec.group?.name || "Select Group"}</option>
                            {boqGroups.filter(g => g.isActive && g.id !== sec.groupId).map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 ml-4 border-l border-slate-300 pl-4">
                            <button onClick={() => handleReorderSection(sec.id, "up")} disabled={sIdx === 0} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                            <button onClick={() => handleReorderSection(sec.id, "down")} disabled={sIdx === computedSections.length - 1} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteSection(sec.id)} className="p-1 text-rose-500 hover:text-rose-700 ml-2"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-base text-slate-900">{sec.name}</span>
                          <Badge variant="outline" className="text-xs font-semibold">{sec.group?.name || "Uncategorized"}</Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* LINE ITEMS */}
                {sec.lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isDraft ? 13 : 12} className="text-center py-4 text-slate-400 italic text-xs">No items in this section.</TableCell>
                  </TableRow>
                ) : sec.lineItems.map((li: any, lIdx: number) => {
                  const isCalc = li.lineType === "CALCULATED";
                  const missingData = isCalc && (!li.quantity || !li.rate || !li.title?.trim());

                  return (
                    <TableRow key={li.id} className={`group hover:bg-slate-50 transition-colors [&_td]:border-r [&_td]:border-slate-100 ${missingData ? 'bg-amber-50/30' : ''}`}>
                      {/* Item No */}
                      <TableCell className="p-1 align-top">
                        {isDraft ? (
                          <input className="w-full text-center text-xs font-bold bg-transparent outline-none p-1 focus:bg-white focus:ring-1 focus:ring-blue-500" value={li.itemNo || ""} onChange={(e) => handleItemChange(sec.id, li.id, "itemNo", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "itemNo", e.target.value)} placeholder="No." />
                        ) : <div className="text-center font-bold text-slate-500 p-1">{li.itemNo || "-"}</div>}
                      </TableCell>

                      {/* Title & Description */}
                      <TableCell className="p-1 align-top min-w-[250px]">
                        {isDraft ? (
                          <div className="flex flex-col gap-1 w-full h-full">
                            <input className="w-full font-bold text-sm bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-900" value={li.title || ""} onChange={(e) => handleItemChange(sec.id, li.id, "title", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "title", e.target.value)} placeholder="Item Title" />
                            <textarea className="w-full text-xs bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-600 min-h-[40px] resize-y" value={li.description || ""} onChange={(e) => handleItemChange(sec.id, li.id, "description", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "description", e.target.value)} placeholder="Detailed description..." />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 p-1">
                            <span className="font-bold text-sm text-slate-900">{li.title}</span>
                            {li.description && <span className="text-xs text-slate-600 whitespace-pre-wrap">{li.description}</span>}
                          </div>
                        )}
                      </TableCell>

                      {/* Make */}
                      <TableCell className="p-1 align-top">
                        {isDraft ? <input className="w-full h-full text-xs bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500" value={li.make || ""} onChange={(e) => handleItemChange(sec.id, li.id, "make", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "make", e.target.value)} placeholder="Make" /> : <div className="p-1 text-xs">{li.make || "-"}</div>}
                      </TableCell>

                      {/* Type Toggle */}
                      <TableCell className="p-1 align-top text-center">
                        {isDraft ? (
                          <select className="w-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 rounded border border-slate-200 outline-none p-1 focus:ring-1 focus:ring-blue-500 text-slate-700" value={li.lineType} onChange={(e) => { handleItemChange(sec.id, li.id, "lineType", e.target.value); handleItemBlur(li.id, "lineType", e.target.value); }}>
                            <option value="CALCULATED">CALC</option>
                            <option value="LUMP_SUM">LUMP</option>
                          </select>
                        ) : <Badge variant="outline" className="text-[10px] uppercase">{li.lineType === "LUMP_SUM" ? "LUMP" : "CALC"}</Badge>}
                      </TableCell>

                      {/* Qty */}
                      <TableCell className="p-1 align-top">
                        {isDraft ? (
                          <input type="number" className={`w-full text-right text-sm font-mono bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500 ${!isCalc ? "opacity-30 cursor-not-allowed" : ""}`} value={li.quantity === 0 && !isCalc ? "" : li.quantity} onChange={(e) => handleItemChange(sec.id, li.id, "quantity", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "quantity", e.target.value)} disabled={!isCalc} placeholder="0" />
                        ) : <div className="p-1 text-right font-mono text-sm">{isCalc ? Number(li.quantity).toLocaleString() : "-"}</div>}
                      </TableCell>

                      {/* Unit */}
                      <TableCell className="p-1 align-top text-center">
                        {isDraft ? (
                          <input className={`w-full text-center text-xs font-semibold bg-transparent outline-none px-1 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500 ${!isCalc ? "opacity-30 cursor-not-allowed" : ""}`} value={li.unit || ""} onChange={(e) => handleItemChange(sec.id, li.id, "unit", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "unit", e.target.value)} disabled={!isCalc} placeholder="Unit" />
                        ) : <div className="p-1 text-xs text-center font-semibold">{isCalc ? li.unit || "-" : "-"}</div>}
                      </TableCell>

                      {/* Rate */}
                      <TableCell className="p-1 align-top">
                        {isDraft ? (
                          <input type="number" className={`w-full text-right text-sm font-mono bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500 ${!isCalc ? "opacity-30 cursor-not-allowed" : ""}`} value={li.rate === 0 && !isCalc ? "" : li.rate} onChange={(e) => handleItemChange(sec.id, li.id, "rate", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "rate", e.target.value)} disabled={!isCalc} placeholder="0.00" />
                        ) : <div className="p-1 text-right font-mono text-sm">{isCalc ? Number(li.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}</div>}
                      </TableCell>

                      {/* Est Amount */}
                      <TableCell className="p-1 align-top bg-slate-50/50">
                        {isDraft && !isCalc ? (
                           <input type="number" className="w-full text-right text-sm font-bold font-mono bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-900" value={li.amount} onChange={(e) => handleItemChange(sec.id, li.id, "amount", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "amount", e.target.value)} placeholder="0.00" />
                        ) : (
                          <div className="p-1 text-right font-mono text-sm font-bold text-slate-900">
                            {Number(li.computedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </TableCell>

                      {/* Material Link & Grade */}
                      <TableCell className="p-1 align-top">
                        {isDraft ? (
                          <div className="flex flex-col gap-1 w-full p-1">
                            <select className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded outline-none p-1 focus:ring-1 focus:ring-blue-500" value={li.itemId || ""} onChange={(e) => { handleItemChange(sec.id, li.id, "itemId", e.target.value); handleItemBlur(li.id, "itemId", e.target.value); }}>
                              <option value="">No material link...</option>
                              {itemsList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <input className="w-full text-[10px] font-bold uppercase tracking-wider bg-transparent border-b border-dashed border-slate-300 outline-none px-1 py-0.5 focus:border-blue-500" value={li.grade || ""} onChange={(e) => handleItemChange(sec.id, li.id, "grade", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "grade", e.target.value)} placeholder="GRADE / SPEC" />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 p-1">
                            {li.item ? <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-1 rounded truncate">✓ {li.item.name}</span> : <span className="text-[11px] italic text-slate-400">-</span>}
                            {li.grade && <span className="text-[10px] font-bold uppercase text-slate-500">{li.grade}</span>}
                          </div>
                        )}
                      </TableCell>

                      {/* Worker Type Link */}
                      <TableCell className="p-1 align-top">
                        {isDraft ? (
                           <select className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded outline-none p-1 focus:ring-1 focus:ring-blue-500 mt-1" value={li.workerTypeId || ""} onChange={(e) => { handleItemChange(sec.id, li.id, "workerTypeId", e.target.value); handleItemBlur(li.id, "workerTypeId", e.target.value); }}>
                             <option value="">No worker link...</option>
                             {workerTypes.filter(wt => wt.isActive).map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                           </select>
                        ) : (
                          <div className="p-1">
                            {li.workerType ? <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1 rounded truncate flex items-center gap-1">👷 {li.workerType.name}</span> : <span className="text-[11px] italic text-slate-400">-</span>}
                          </div>
                        )}
                      </TableCell>

                      {/* Executed Qty */}
                      <TableCell className="p-1 align-top bg-blue-50/30">
                        {currentBOQ?.status === "ACTIVE" ? (
                          <input type="number" className="w-full text-right text-sm font-mono font-bold text-blue-700 bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500" value={li.executedQuantity} onChange={(e) => handleItemChange(sec.id, li.id, "executedQuantity", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "executedQuantity", e.target.value)} placeholder="0" />
                        ) : <div className="p-1 text-right font-mono text-sm font-bold text-blue-700 opacity-60">{Number(li.executedQuantity).toLocaleString()}</div>}
                      </TableCell>

                      {/* Executed Amount */}
                      <TableCell className="p-1 align-top bg-blue-50/30">
                         {currentBOQ?.status === "ACTIVE" ? (
                          <input type="number" className="w-full text-right text-sm font-mono font-bold text-blue-800 bg-transparent outline-none px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500" value={li.executedAmount} onChange={(e) => handleItemChange(sec.id, li.id, "executedAmount", e.target.value)} onBlur={(e) => handleItemBlur(li.id, "executedAmount", e.target.value)} placeholder="0.00" />
                        ) : <div className="p-1 text-right font-mono text-sm font-bold text-blue-800 opacity-60">{Number(li.executedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                      </TableCell>

                      {/* Actions */}
                      {isDraft && (
                        <TableCell className="p-1 align-middle">
                          <div className="flex items-center justify-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleReorderItem(sec.id, li.id, "up")} disabled={lIdx === 0} className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleReorderItem(sec.id, li.id, "down")} disabled={lIdx === sec.lineItems.length - 1} className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteItem(li.id)} className="p-1 text-rose-500 hover:text-rose-700 ml-1 bg-rose-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}

                {/* SECTION FOOTER ROW */}
                <TableRow className="bg-slate-50 font-bold shadow-inner">
                  <TableCell colSpan={isDraft ? 7 : 7} className="p-2 border-r border-slate-200 align-middle">
                    {isDraft ? (
                      <Button variant="ghost" size="sm" onClick={() => handleAddLineItem(sec.id)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 h-7 text-xs px-2">
                        <Plus className="mr-1 h-3 w-3" /> Add Row
                      </Button>
                    ) : <span className="text-xs uppercase tracking-wider text-slate-500 ml-2">Section Quotation Subtotal</span>}
                  </TableCell>
                  <TableCell className="p-2 text-right font-mono text-sm text-slate-900 bg-slate-100/50">
                    ₹{sec.computedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell colSpan={isDraft ? 5 : 4} className="bg-slate-100/50"></TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        
        {/* GLOBAL ADD SECTION BUTTON */}
        {isDraft && (
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={handleAddSection} className="border-dashed border-slate-300 font-bold bg-white hover:bg-slate-100 text-slate-600">
              <Plus className="mr-2 h-4 w-4" /> Add Section
            </Button>
          </div>
        )}
      </div>

            {/* ROLLUP SUMMARY (GRAND TOTALS) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-sm ml-auto mt-6">
        <div className="bg-slate-800 px-4 py-2 text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Quotation Rollup
        </div>
        <div className="divide-y divide-slate-100 p-4 font-mono text-sm">
          <div className="flex justify-between py-1.5 font-bold text-slate-700">
            <span>Base Subtotal</span>
            <span>₹{totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>CGST ({localSettings.cgstRate || 0}%)</span>
            <span>+ ₹{totals.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>SGST ({localSettings.sgstRate || 0}%)</span>
            <span>+ ₹{totals.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between py-3 mt-2 text-lg font-black text-slate-900 border-t-2 border-slate-900">
            <span>GRAND TOTAL</span>
            <span>₹{totals.finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="h-12"></div>

      {/* MILESTONES TABLE */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-12">
        <div className="bg-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-slate-300" />
              Payment Terms & Conditions
            </h2>
            <p className="text-slate-400 text-xs mt-1">Configure milestone-based payment schedules.</p>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-16 font-bold text-slate-900 text-center">Sl No</TableHead>
              <TableHead className="font-bold text-slate-900">Stage Name</TableHead>
              <TableHead className="w-40 font-bold text-slate-900">Target Date</TableHead>
              <TableHead className="w-32 text-right font-bold text-slate-900">Advance %</TableHead>
              <TableHead className="w-48 text-right font-bold text-slate-900">Advance Amount</TableHead>
              {isDraft && <TableHead className="w-24 text-center font-bold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                  No payment milestones configured yet.
                </TableCell>
              </TableRow>
            ) : (
              milestones.map((m: any, idx: number) => (
                <TableRow key={m.id} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                  <TableCell className="font-medium text-slate-500 text-center">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-slate-900 p-0 border-r border-slate-200">
                    {isDraft ? (
                      <input
                        className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 placeholder-slate-300 transition-colors"
                        value={m.stageName || ""}
                        placeholder="Stage Name"
                        onChange={(e) => handleMilestoneChange(m.id, "stageName", e.target.value)}
                        onBlur={(e) => handleMilestoneBlur(m.id, "stageName", e.target.value)}
                      />
                    ) : (
                      <div className="px-4 py-3">{m.stageName}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 p-0 border-r border-slate-200">
                    {isDraft ? (
                      <input
                        type="date"
                        className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                        value={m.targetDate ? new Date(m.targetDate).toISOString().split('T')[0] : ""}
                        onChange={(e) => handleMilestoneChange(m.id, "targetDate", e.target.value)}
                        onBlur={(e) => handleMilestoneBlur(m.id, "targetDate", e.target.value)}
                      />
                    ) : (
                      <div className="px-4 py-3">{m.targetDate ? new Date(m.targetDate).toLocaleDateString("en-IN") : "-"}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 p-0 border-r border-slate-200">
                    {isDraft ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full h-full px-4 py-3 bg-transparent outline-none text-right focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                        value={m.percentage || ""}
                        onChange={(e) => handleMilestoneChange(m.id, "percentage", e.target.value)}
                        onBlur={(e) => handleMilestoneBlur(m.id, "percentage", e.target.value)}
                      />
                    ) : (
                      <div className="px-4 py-3">{Number(m.percentage).toFixed(2)}%</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 bg-slate-50">
                    ₹{Number(m.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  {isDraft && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleReorderMilestone(m.id, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-20"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReorderMilestone(m.id, "down")}
                          disabled={idx === milestones.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-20"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
            {/* Total Row */}
            {milestones.length > 0 && (
              <TableRow className="bg-slate-100/50">
                <TableCell colSpan={3} className="text-right font-bold text-slate-600">Total</TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                  {milestones.reduce((acc: number, m: any) => acc + Number(m.percentage || 0), 0).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-slate-900">
                  ₹{milestones.reduce((acc: number, m: any) => acc + Number(m.amount || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                {isDraft && <TableCell></TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>

        {isDraft && (
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMilestone}
              className="border-dashed border-slate-300 font-bold bg-white hover:bg-slate-100 text-slate-600"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Payment Stage
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}
