"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BOQGroup } from "@prisma/client";
import type {
  BOQTemplateUI,
  BOQTemplateSectionUI,
  BOQTemplateLineItemUI,
} from "./page";

interface TemplateTreeHandlers {
  handleTemplateChange: (id: string, field: string, value: string) => void;
  handleTemplateBlur: (
    id: string,
    field: string,
    value: string,
  ) => Promise<void> | void;
  handleDeleteTemplate: (id: string) => Promise<void> | void;

  handleAddSection: (templateId: string) => Promise<void> | void;
  handleSectionChange: (
    templateId: string,
    sectionId: string,
    field: string,
    value: string,
  ) => void;
  handleSectionBlur: (
    sectionId: string,
    field: string,
    value: string,
  ) => Promise<void> | void;
  handleDeleteSection: (sectionId: string) => Promise<void> | void;
  handleReorderSection: (
    templateId: string,
    sectionId: string,
    direction: "up" | "down",
  ) => Promise<void> | void;

  handleAddItem: (sectionId: string) => Promise<void> | void;
  handleItemChange: (
    templateId: string,
    sectionId: string,
    itemId: string,
    value: string,
  ) => void;
  handleItemBlur: (itemId: string, value: string) => Promise<void> | void;
  handleDeleteItem: (itemId: string) => Promise<void> | void;
  handleReorderItem: (
    templateId: string,
    sectionId: string,
    itemId: string,
    direction: "up" | "down",
  ) => Promise<void> | void;
}

interface TemplateTreeProps {
  templates: BOQTemplateUI[];
  groups: BOQGroup[];
  expandedTemplates: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  handlers: TemplateTreeHandlers;
}

export function TemplateTree({
  templates,
  groups,
  expandedTemplates,
  toggleExpand,
  handlers,
}: TemplateTreeProps) {
  const {
    handleTemplateChange,
    handleTemplateBlur,
    handleDeleteTemplate,
    handleAddSection,
    handleSectionChange,
    handleSectionBlur,
    handleDeleteSection,
    handleReorderSection,
    handleAddItem,
    handleItemChange,
    handleItemBlur,
    handleDeleteItem,
    handleReorderItem,
  } = handlers;

  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<
    string | null
  >(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<
    string | null
  >(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(
    null,
  );

  return (
    <div className="xl:col-span-2 space-y-4">
      {templates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 italic">
          No templates created yet.
        </div>
      ) : (
        templates.map((tpl) => (
          <Card key={tpl.id} className="overflow-hidden shadow-md">
            {/* Template Header */}
            <div className="bg-slate-800 p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto flex-1">
                <button
                  onClick={() => toggleExpand(tpl.id)}
                  className="text-slate-400 hover:text-white p-1 mt-1 sm:mt-0 shrink-0"
                >
                  {expandedTemplates[tpl.id] ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                  <input
                    className="bg-slate-700/50 text-white font-bold px-3 py-2 sm:py-1.5 rounded outline-none focus:ring-2 focus:ring-blue-500 flex-1 w-full sm:min-w-[200px]"
                    value={tpl.name}
                    onChange={(e) =>
                      handleTemplateChange(tpl.id, "name", e.target.value)
                    }
                    onBlur={(e) =>
                      handleTemplateBlur(tpl.id, "name", e.target.value)
                    }
                    placeholder="Template Name"
                  />
                  <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
                    <input
                      className="bg-slate-700/50 text-slate-300 text-sm px-3 py-2 sm:py-1.5 rounded outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-32 flex-1"
                      value={tpl.category}
                      onChange={(e) =>
                        handleTemplateChange(
                          tpl.id,
                          "category",
                          e.target.value,
                        )
                      }
                      onBlur={(e) =>
                        handleTemplateBlur(
                          tpl.id,
                          "category",
                          e.target.value,
                        )
                      }
                      placeholder="Category"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTemplateTarget(tpl.id)}
                      className="sm:hidden text-rose-400 hover:text-rose-300 hover:bg-slate-700 shrink-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTemplateTarget(tpl.id)}
                className="hidden sm:flex text-rose-400 hover:text-rose-300 hover:bg-slate-700 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Template Content */}
            {expandedTemplates[tpl.id] && (
              <CardContent className="p-0 border-t border-slate-200 bg-slate-50">
                <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
                  {tpl.sections.map((sec: BOQTemplateSectionUI, sIdx: number) => (
                    <div
                      key={sec.id}
                      className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
                    >
                      {/* Section Header */}
                      <div className="bg-slate-100 border-b border-slate-200 p-3 sm:px-4 sm:py-2 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 w-full">
                          <Layers className="h-4 w-4 text-slate-500 shrink-0" />
                          <input
                            className="font-bold text-slate-900 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 sm:px-2 py-1 flex-1 w-full min-w-0"
                            value={sec.name}
                            onChange={(e) =>
                              handleSectionChange(
                                tpl.id,
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
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pl-6 sm:pl-0">
                          <select
                            className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 sm:py-1 outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:w-40"
                            value={sec.groupId}
                            onChange={(e) => {
                              // 1. Update local UI state instantly
                              handleSectionChange(
                                tpl.id,
                                sec.id,
                                "groupId",
                                e.target.value,
                              );
                              // 2. Fire the API save request
                              handleSectionBlur(
                                sec.id,
                                "groupId",
                                e.target.value,
                              );
                            }}
                          >
                            {/* Map through all groups. Include the current group even if it was deactivated */}
                            {groups
                              .filter(
                                (g) => g.isActive || g.id === sec.groupId,
                              )
                              .map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                          </select>
                          <div className="flex items-center shrink-0 bg-white sm:bg-transparent rounded-md border sm:border-0 shadow-sm sm:shadow-none p-0.5 sm:p-0">
                            <button
                              onClick={() =>
                                handleReorderSection(tpl.id, sec.id, "up")
                              }
                              disabled={sIdx === 0}
                              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            >
                              <ArrowUp className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                handleReorderSection(tpl.id, sec.id, "down")
                              }
                              disabled={sIdx === tpl.sections.length - 1}
                              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            >
                              <ArrowDown className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteSectionTarget(sec.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded sm:ml-1"
                            >
                              <Trash2 className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Line Items */}
                      <Table>
                        <TableHeader className="hidden">
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sec.lineItems.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className="h-12 text-center text-slate-400 italic text-sm border-0"
                              >
                                No items added.
                              </TableCell>
                            </TableRow>
                          ) : (
                            sec.lineItems.map((li: BOQTemplateLineItemUI, lIdx: number) => (
                              <TableRow
                                key={li.id}
                                className="group hover:bg-slate-50/50 flex flex-col sm:table-row border-b last:border-b-0"
                              >
                                <TableCell className="p-0 border-b sm:border-b-0 sm:border-r border-slate-100 align-top block w-full sm:table-cell">
                                  <input
                                    className="w-full h-full min-h-[44px] px-4 py-3 sm:py-2 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 text-sm font-medium"
                                    value={li.title}
                                    onChange={(e) =>
                                      handleItemChange(
                                        tpl.id,
                                        sec.id,
                                        li.id,
                                        e.target.value,
                                      )
                                    }
                                    onBlur={(e) =>
                                      handleItemBlur(li.id, e.target.value)
                                    }
                                    placeholder="Item Title"
                                  />
                                </TableCell>
                                <TableCell className="w-full sm:w-24 p-2 sm:p-0 text-center align-middle border-l-0 sm:border-l border-slate-100 block sm:table-cell bg-slate-50 sm:bg-transparent">
                                  <div className="flex items-center justify-end sm:justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity gap-1 sm:gap-0">
                                    <button
                                      onClick={() =>
                                        handleReorderItem(
                                          tpl.id,
                                          sec.id,
                                          li.id,
                                          "up",
                                        )
                                      }
                                      disabled={lIdx === 0}
                                      className="p-2 sm:p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 bg-white sm:bg-transparent rounded-md border sm:border-0 shadow-sm sm:shadow-none"
                                    >
                                      <ArrowUp className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleReorderItem(
                                          tpl.id,
                                          sec.id,
                                          li.id,
                                          "down",
                                        )
                                      }
                                      disabled={
                                        lIdx === sec.lineItems.length - 1
                                      }
                                      className="p-2 sm:p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 bg-white sm:bg-transparent rounded-md border sm:border-0 shadow-sm sm:shadow-none"
                                    >
                                      <ArrowDown className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setDeleteItemTarget(li.id)
                                      }
                                      className="p-2 sm:p-1 text-rose-500 hover:text-rose-700 sm:ml-1 bg-white sm:bg-transparent rounded-md border sm:border-0 border-rose-100 sm:border-transparent shadow-sm sm:shadow-none"
                                    >
                                      <Trash2 className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                      <div className="bg-slate-50 px-3 sm:px-4 py-2 border-t border-slate-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddItem(sec.id)}
                          className="text-slate-500 hover:text-slate-900 h-8 sm:h-7 text-xs font-semibold px-2 w-full sm:w-auto justify-start"
                        >
                          <Plus className="mr-1.5 h-3.5 sm:h-3 w-3.5 sm:w-3" />{" "}
                          Add Item
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSection(tpl.id)}
                      className="border-dashed border-slate-300 text-slate-600 bg-white hover:bg-slate-50 font-bold w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Section
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))
      )}

      <ConfirmDialog
        open={deleteTemplateTarget !== null}
        onOpenChange={(open) => !open && setDeleteTemplateTarget(null)}
        title="Delete this template?"
        confirmLabel="Delete"
        onConfirm={() => handleDeleteTemplate(deleteTemplateTarget!)}
      />
      <ConfirmDialog
        open={deleteSectionTarget !== null}
        onOpenChange={(open) => !open && setDeleteSectionTarget(null)}
        title="Delete this section?"
        confirmLabel="Delete"
        onConfirm={() => handleDeleteSection(deleteSectionTarget!)}
      />
      <ConfirmDialog
        open={deleteItemTarget !== null}
        onOpenChange={(open) => !open && setDeleteItemTarget(null)}
        title="Delete this item?"
        confirmLabel="Delete"
        onConfirm={() => handleDeleteItem(deleteItemTarget!)}
      />
    </div>
  );
}
