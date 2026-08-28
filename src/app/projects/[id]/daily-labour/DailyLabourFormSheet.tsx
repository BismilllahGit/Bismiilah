"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { EntryRow } from "./page";

interface DailyLabourFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriggerClick: () => void;
  successMessage: string;
  onSubmit: (e: React.FormEvent) => void;
  formDate: string;
  onFormDateChange: (date: string) => void;
  formRows: EntryRow[];
  onUpdateRow: (id: string, field: keyof EntryRow, value: any) => void;
  onRemoveRow: (id: string) => void;
  onAddRow: () => void;
  workerTypeOptions: string[];
  contractors: any[];
  onCreateInlineWorkerType: (rowId: string, name: string) => void;
  saving: boolean;
}

export function DailyLabourFormSheet({
  open,
  onOpenChange,
  onTriggerClick,
  successMessage,
  onSubmit,
  formDate,
  onFormDateChange,
  formRows,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  workerTypeOptions,
  contractors,
  onCreateInlineWorkerType,
  saving,
}: DailyLabourFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Button onClick={onTriggerClick} className="gap-2">
        <Plus className="h-4 w-4" /> Log Labour
      </Button>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-4 lg:min-w-2xl"
      >
        <SheetHeader className="p-0">
          <SheetTitle>Log Daily Labour</SheetTitle>
          <SheetDescription>
            Log headcounts and wage rates for multiple worker types at once.
          </SheetDescription>
        </SheetHeader>

        {successMessage ? (
          <div className="mt-8 p-4 bg-muted border border-border rounded-md animate-in fade-in text-foreground">
            <h4 className="font-semibold mb-1">Success!</h4>
            <p className="text-sm">{successMessage}</p>
            <p className="text-xs mt-2 opacity-75">Closing automatically...</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-6">
            <div className="space-y-2 space-x-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                required
                value={formDate}
                onChange={(e) => onFormDateChange(e.target.value)}
                className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>

            <div className="space-y-4">
              {formRows.map((row) => (
                <div
                  key={row.id}
                  // Increased gap slightly for better breathing room
                  className="grid grid-cols-12 gap-3 p-4 bg-slate-50 border rounded-md relative items-start"
                >
                  {/* Worker Type - Full width by default, 1/3 on large screens */}
                  <div className="col-span-12 lg:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-500">
                      Worker Type *
                    </label>
                    <select
                      required
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={row.workerType}
                      onChange={(e) =>
                        onUpdateRow(row.id, "workerType", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {workerTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="__OTHERS__">Others…</option>
                    </select>
                    {row.workerType === "__OTHERS__" && (
                      <div className="flex items-center gap-1 pt-1">
                        <Input
                          placeholder="New type name..."
                          value={row.customTypeName || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "customTypeName",
                              e.target.value,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onCreateInlineWorkerType(
                                row.id,
                                row.customTypeName || "",
                              );
                            }
                          }}
                          className="h-8 text-xs flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            row.creatingCustom || !row.customTypeName?.trim()
                          }
                          onClick={() =>
                            onCreateInlineWorkerType(
                              row.id,
                              row.customTypeName || "",
                            )
                          }
                          className="h-8 px-2 text-xs"
                        >
                          {row.creatingCustom ? "..." : "Add"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateRow(row.id, "workerType", "")}
                          className="h-8 px-2 text-xs text-slate-500"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Count - Half width by default, 1/3 on large screens */}
                  <div className="col-span-6 lg:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-500">
                      Count *
                    </label>
                    <Input
                      required
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 5"
                      value={row.headcount}
                      onChange={(e) =>
                        onUpdateRow(row.id, "headcount", e.target.value)
                      }
                    />
                  </div>

                  {/* Wage - Half width by default, 1/3 on large screens */}
                  <div className="col-span-6 lg:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-500">
                      Wage (₹) *
                    </label>
                    <Input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 1000"
                      value={row.wageRate}
                      onChange={(e) =>
                        onUpdateRow(row.id, "wageRate", e.target.value)
                      }
                    />
                  </div>

                  {/* Task & Contractor wrapper */}
                  <div className="col-span-12 space-y-3 mt-2">
                    <label className="text-xs font-medium text-slate-500">
                      Task & Contractor (Optional)
                    </label>

                    {/* Changed from sm:flex-row to lg:flex-row so it stacks vertically in the narrow drawer */}
                    <div className="flex flex-col lg:flex-row gap-3">
                      <Input
                        placeholder="Task (e.g. Slab cast)"
                        value={row.title}
                        onChange={(e) =>
                          onUpdateRow(row.id, "title", e.target.value)
                        }
                        className="flex-1 w-full"
                      />
                      <select
                        value={row.contractorId}
                        onChange={(e) =>
                          onUpdateRow(row.id, "contractorId", e.target.value)
                        }
                        className="flex h-8 w-full flex-1 lg:w-1/3 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">No Contractor</option>
                        {contractors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-start space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id={`paid-${row.id}`}
                        checked={row.paidImmediately}
                        onChange={(e) =>
                          onUpdateRow(
                            row.id,
                            "paidImmediately",
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                      />
                      <label
                        htmlFor={`paid-${row.id}`}
                        className="text-xs font-medium text-slate-700 cursor-pointer leading-tight"
                      >
                        Paid Immediately (Settled on spot in cash, exclude from
                        contractor balance)
                      </label>
                    </div>
                  </div>

                  {/* Delete button positioned cleanly */}
                  {formRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -right-2 -top-2 h-7 w-7 rounded-full border bg-background text-destructive hover:bg-destructive/10 shadow-sm"
                      onClick={() => onRemoveRow(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onAddRow}
              className="w-full border-dashed"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Another Row
            </Button>

            <SheetFooter className="pt-4 border-t mt-4">
              <SheetClose render={<Button variant="outline" type="button" />}>
                Cancel
              </SheetClose>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Log Labour"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
