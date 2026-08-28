"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Settings,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const tableInputClass =
  "w-full min-w-0 bg-transparent outline-none px-2 py-1.5 focus:bg-white focus:ring-1 focus:ring-blue-500 hover:bg-slate-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface BOQSectionsHandlers {
  handleSectionChange: (sectionId: string, field: string, value: string) => void;
  handleSectionBlur: (
    sectionId: string,
    field: string,
    value: string,
  ) => void | Promise<void>;
  handleDeleteSection: (sectionId: string) => void | Promise<void>;
  handleReorderSection: (
    sectionId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
  handleAddSection: () => void | Promise<void>;
  handleItemChange: (
    sectionId: string,
    itemId: string,
    field: string,
    value: any,
  ) => void;
  handleItemBlur: (
    itemId: string,
    field: string,
    value: any,
  ) => void | Promise<void>;
  handleDeleteItem: (itemId: string) => void | Promise<void>;
  handleReorderItem: (
    sectionId: string,
    itemId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
  handleAddLineItem: (sectionId: string) => void | Promise<void>;
}

interface BOQSectionsDesktopViewProps {
  computedSections: any[];
  isDraft: boolean;
  isMutating: boolean;
  isActive: boolean;
  boqGroups: any[];
  itemsList: any[];
  workerTypes: any[];
  handlers: BOQSectionsHandlers;
}

export function BOQSectionsDesktopView({
  computedSections,
  isDraft,
  isMutating,
  isActive,
  boqGroups,
  itemsList,
  workerTypes,
  handlers,
}: BOQSectionsDesktopViewProps) {
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<
    string | null
  >(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(
    null,
  );

  return (
    <>
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
                                handlers.handleSectionChange(
                                  sec.id,
                                  "name",
                                  e.target.value,
                                )
                              }
                              onBlur={(e) =>
                                handlers.handleSectionBlur(
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
                                handlers.handleSectionChange(
                                  sec.id,
                                  "groupId",
                                  e.target.value,
                                );
                                handlers.handleSectionBlur(
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
                                  handlers.handleReorderSection(sec.id, "up")
                                }
                                disabled={sIdx === 0 || isMutating}
                                className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 shadow-sm transition-colors"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handlers.handleReorderSection(sec.id, "down")
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
                                onClick={() => setDeleteSectionTarget(sec.id)}
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "itemNo",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(
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
                                    handlers.handleItemChange(
                                      sec.id,
                                      li.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handlers.handleItemBlur(
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
                                    handlers.handleItemChange(
                                      sec.id,
                                      li.id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handlers.handleItemBlur(
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "make",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(li.id, "make", e.target.value)
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "lineType",
                                    e.target.value,
                                  );
                                  handlers.handleItemBlur(
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(li.id, "unit", e.target.value)
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "rate",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(li.id, "rate", e.target.value)
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(
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
                                    handlers.handleItemChange(
                                      sec.id,
                                      li.id,
                                      "itemId",
                                      e.target.value,
                                    );
                                    handlers.handleItemBlur(
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
                                    handlers.handleItemChange(
                                      sec.id,
                                      li.id,
                                      "grade",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handlers.handleItemBlur(
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
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "workerTypeId",
                                    e.target.value,
                                  );
                                  handlers.handleItemBlur(
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
                            {isActive ? (
                              <input
                                type="number"
                                className={`${tableInputClass} text-right text-sm font-mono font-bold text-blue-700 w-full bg-white border border-blue-200 shadow-sm`}
                                value={li.executedQuantity ?? ""}
                                onChange={(e) =>
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "executedQuantity",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(
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
                            {isActive ? (
                              <input
                                type="number"
                                className={`${tableInputClass} text-right text-sm font-mono font-bold text-blue-800 w-full bg-white border border-blue-200 shadow-sm`}
                                value={li.executedAmount ?? ""}
                                onChange={(e) =>
                                  handlers.handleItemChange(
                                    sec.id,
                                    li.id,
                                    "executedAmount",
                                    e.target.value,
                                  )
                                }
                                onBlur={(e) =>
                                  handlers.handleItemBlur(
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
                                    handlers.handleReorderItem(sec.id, li.id, "up")
                                  }
                                  disabled={lIdx === 0 || isMutating}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handlers.handleReorderItem(sec.id, li.id, "down")
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
                                  onClick={() => setDeleteItemTarget(li.id)}
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
                          onClick={() => handlers.handleAddLineItem(sec.id)}
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
              onClick={handlers.handleAddSection}
              disabled={isMutating}
              className="border-dashed border-slate-400 font-bold bg-white hover:bg-slate-100 text-slate-700 shadow-sm h-10 px-6 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Section
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteSectionTarget !== null}
        onOpenChange={(open) => !open && setDeleteSectionTarget(null)}
        title="Delete this section and all its items?"
        confirmLabel="Delete"
        onConfirm={() => handlers.handleDeleteSection(deleteSectionTarget!)}
      />
      <ConfirmDialog
        open={deleteItemTarget !== null}
        onOpenChange={(open) => !open && setDeleteItemTarget(null)}
        title="Delete this line item?"
        confirmLabel="Delete"
        onConfirm={() => handlers.handleDeleteItem(deleteItemTarget!)}
      />
    </>
  );
}
