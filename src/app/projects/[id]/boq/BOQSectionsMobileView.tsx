"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown, Layers } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const cardInputClass =
  "w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-3 py-2 text-sm outline-none transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass =
  "text-[10px] font-bold uppercase text-slate-500 mb-1 block tracking-wider";

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

interface BOQSectionsMobileViewProps {
  computedSections: any[];
  isDraft: boolean;
  isMutating: boolean;
  isActive: boolean;
  boqGroups: any[];
  itemsList: any[];
  workerTypes: any[];
  handlers: BOQSectionsHandlers;
}

export function BOQSectionsMobileView({
  computedSections,
  isDraft,
  isMutating,
  isActive,
  boqGroups,
  itemsList,
  workerTypes,
  handlers,
}: BOQSectionsMobileViewProps) {
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<
    string | null
  >(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(
    null,
  );

  return (
    <>
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
                          handlers.handleSectionChange(sec.id, "name", e.target.value)
                        }
                        onBlur={(e) =>
                          handlers.handleSectionBlur(sec.id, "name", e.target.value)
                        }
                        placeholder="Section Name"
                      />
                      <select
                        className="w-full text-sm bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-sm disabled:opacity-50"
                        value={sec.groupId ?? ""}
                        onChange={(e) => {
                          handlers.handleSectionChange(
                            sec.id,
                            "groupId",
                            e.target.value,
                          );
                          handlers.handleSectionBlur(sec.id, "groupId", e.target.value);
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
                        onClick={() => handlers.handleReorderSection(sec.id, "up")}
                        disabled={sIdx === 0 || isMutating}
                        className="p-2 text-slate-600 bg-white border border-slate-300 rounded shadow-sm disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlers.handleReorderSection(sec.id, "down")}
                        disabled={
                          sIdx === computedSections.length - 1 || isMutating
                        }
                        className="p-2 text-slate-600 bg-white border border-slate-300 rounded shadow-sm disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => setDeleteSectionTarget(sec.id)}
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
                                    handlers.handleItemChange(
                                      sec.id,
                                      li.id,
                                      "make",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handlers.handleItemBlur(
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
                                    handlers.handleItemChange(
                                      sec.id,
                                      li.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handlers.handleItemBlur(
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
                                    handlers.handleItemChange(
                                      sec.id,
                                      li.id,
                                      "rate",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    handlers.handleItemBlur(
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

                            {isActive && (
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
                                    handlers.handleReorderItem(sec.id, li.id, "up")
                                  }
                                  disabled={lIdx === 0 || isMutating}
                                  className="p-2 text-slate-600 bg-slate-100 rounded disabled:opacity-30"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handlers.handleReorderItem(sec.id, li.id, "down")
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
                                onClick={() => setDeleteItemTarget(li.id)}
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
                    onClick={() => handlers.handleAddLineItem(sec.id)}
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
            onClick={handlers.handleAddSection}
            disabled={isMutating}
            className="w-full border-dashed border-slate-400 font-bold bg-white text-slate-700 h-12 shadow-sm disabled:opacity-50"
          >
            <Plus className="mr-2 h-5 w-5" /> Add New Section
          </Button>
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
