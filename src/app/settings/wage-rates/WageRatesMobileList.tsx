"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

export function WageRatesMobileList({
  loading,
  sortedPresets,
  savingMap,
  editingValues,
  setEditingValues,
  editingCycles,
  setEditingCycles,
  handleSave,
}: {
  loading: boolean;
  sortedPresets: any[];
  savingMap: Record<string, boolean>;
  editingValues: Record<string, string>;
  setEditingValues: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  editingCycles: Record<string, string>;
  setEditingCycles: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  handleSave: (id: string, typeName: string) => void;
}) {
  return (
    <div className="lg:hidden space-y-3.5">
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
          Loading worker types...
        </div>
      ) : (
        sortedPresets.map((preset) => {
          const typeName = preset.workerType || preset.name;
          const isSaving = savingMap[typeName];
          return (
            <div
              key={preset.id || typeName}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3.5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-bold text-slate-900 text-base break-words">
                  {typeName}
                </h3>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold bg-slate-50"
                >
                  {editingCycles[typeName] ?? "WEEKLY"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Daily Rate (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full font-mono font-semibold text-slate-900 h-10 text-sm shadow-sm"
                    value={editingValues[typeName] ?? ""}
                    onChange={(e) =>
                      setEditingValues((prev) => ({
                        ...prev,
                        [typeName]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(preset.id, typeName);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Payment Cycle
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm font-medium text-slate-800 shadow-sm"
                    value={editingCycles[typeName] ?? "WEEKLY"}
                    onChange={(e) => {
                      const newCycle = e.target.value;
                      setEditingCycles((prev) => ({
                        ...prev,
                        [typeName]: newCycle,
                      }));
                    }}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  onClick={() => handleSave(preset.id, typeName)}
                  disabled={isSaving}
                  size="sm"
                  className="w-full font-bold bg-green-600 hover:bg-green-700 text-white h-9 shadow-sm"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-1.5" />
                  )}
                  {isSaving ? "Saving..." : "Save Rate & Cycle"}
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
