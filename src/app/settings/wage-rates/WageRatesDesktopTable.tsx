"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

export function WageRatesDesktopTable({
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
    <div className="hidden lg:block rounded-xl border bg-white shadow-sm overflow-hidden">
      <Table className="min-w-[600px]">
        <TableHeader className="bg-slate-50/80 border-b border-slate-200">
          <TableRow>
            <TableHead className="w-[240px] font-semibold text-slate-700">
              Worker Type
            </TableHead>
            <TableHead className="w-[220px] font-semibold text-slate-700">
              Default Daily Rate (₹)
            </TableHead>
            <TableHead className="w-[180px] font-semibold text-slate-700">
              Payment Cycle
            </TableHead>
            <TableHead className="w-[120px] text-right font-semibold text-slate-700">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center py-12 text-muted-foreground"
              >
                Loading worker types...
              </TableCell>
            </TableRow>
          ) : (
            sortedPresets.map((preset) => {
              const typeName = preset.workerType || preset.name;
              return (
                <TableRow
                  key={preset.id || typeName}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <TableCell className="font-semibold text-slate-800">
                    {typeName}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="max-w-[150px] font-mono font-semibold"
                      value={editingValues[typeName] ?? ""}
                      onChange={(e) =>
                        setEditingValues((prev) => ({
                          ...prev,
                          [typeName]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleSave(preset.id, typeName);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      className="flex h-9 w-[140px] rounded-md border border-input bg-transparent px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm"
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
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSave(preset.id, typeName)}
                      disabled={savingMap[typeName]}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50/80 font-semibold"
                    >
                      {savingMap[typeName] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      {savingMap[typeName] ? "" : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
