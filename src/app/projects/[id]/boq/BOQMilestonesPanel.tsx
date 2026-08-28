"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowUp, ArrowDown, Layers, Settings } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const cardInputClass =
  "w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-3 py-2 text-sm outline-none transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass =
  "text-[10px] font-bold uppercase text-slate-500 mb-1 block tracking-wider";

interface BOQMilestonesPanelProps {
  milestones: any[];
  isDraft: boolean;
  isMutating: boolean;
  handleAddMilestone: () => void | Promise<void>;
  handleMilestoneChange: (milestoneId: string, field: string, value: any) => void;
  handleMilestoneBlur: (
    milestoneId: string,
    field: string,
    value: any,
  ) => void | Promise<void>;
  handleDeleteMilestone: (milestoneId: string) => void | Promise<void>;
  handleReorderMilestone: (
    milestoneId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
}

export function BOQMilestonesPanel({
  milestones,
  isDraft,
  isMutating,
  handleAddMilestone,
  handleMilestoneChange,
  handleMilestoneBlur,
  handleDeleteMilestone,
  handleReorderMilestone,
}: BOQMilestonesPanelProps) {
  const [deleteMilestoneTarget, setDeleteMilestoneTarget] = useState<
    string | null
  >(null);

  const totalMilestonePercentage = milestones.reduce(
    (sum, m) => sum + Number(m.percentage || 0),
    0,
  );
  const isMilestoneInvalid =
    milestones.length > 0 && Math.abs(totalMilestonePercentage - 100) > 0.01;

  return (
    <>
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
                            onClick={() => setDeleteMilestoneTarget(m.id)}
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
                          onClick={() => setDeleteMilestoneTarget(m.id)}
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

      <ConfirmDialog
        open={deleteMilestoneTarget !== null}
        onOpenChange={(open) => !open && setDeleteMilestoneTarget(null)}
        title="Delete this milestone?"
        confirmLabel="Delete"
        onConfirm={() => handleDeleteMilestone(deleteMilestoneTarget!)}
      />
    </>
  );
}
