"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import type { BusinessProfile } from "@prisma/client";

interface BOQSettingsPanelProps {
  localSettings: {
    targetBudget: string;
    cgstRate: string;
    sgstRate: string;
    note: string;
    termsOverride: string;
  };
  isDraft: boolean;
  businessProfile?: BusinessProfile | null;
  handleSettingsChange: (field: string, value: string) => void;
  handleSettingsBlur: (field: string, value: string) => void | Promise<void>;
}

export function BOQSettingsPanel({
  localSettings,
  isDraft,
  businessProfile,
  handleSettingsChange,
  handleSettingsBlur,
}: BOQSettingsPanelProps) {
  return (
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
  );
}
