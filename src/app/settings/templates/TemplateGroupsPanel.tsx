"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Settings, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { BOQGroup } from "@prisma/client";

interface TemplateGroupsPanelProps {
  groups: BOQGroup[];
  newGroupName: string;
  setNewGroupName: (value: string) => void;
  addingGroup: boolean;
  handleAddGroup: (e: React.FormEvent) => Promise<void> | void;
  handleGroupChange: (id: string, value: string) => void;
  handleGroupBlur: (id: string, value: string) => Promise<void> | void;
  handleToggleGroupActive: (
    id: string,
    isActive: boolean,
  ) => Promise<void> | void;
}

export function TemplateGroupsPanel({
  groups,
  newGroupName,
  setNewGroupName,
  addingGroup,
  handleAddGroup,
  handleGroupChange,
  handleGroupBlur,
  handleToggleGroupActive,
}: TemplateGroupsPanelProps) {
  return (
    <div className="xl:col-span-1">
      <Card className="shadow-md sticky top-6">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-500" />
            BOQ Groups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Group Name</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow
                  key={g.id}
                  className={g.isActive ? "" : "bg-slate-50 opacity-70"}
                >
                  <TableCell className="p-0 border-r border-slate-100">
                    <input
                      className={`w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 font-medium ${!g.isActive ? "text-slate-500 line-through" : "text-slate-900"}`}
                      value={g.name}
                      onChange={(e) =>
                        handleGroupChange(g.id, e.target.value)
                      }
                      onBlur={(e) => handleGroupBlur(g.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="p-0 text-center align-middle">
                    <button
                      onClick={() =>
                        handleToggleGroupActive(g.id, !g.isActive)
                      }
                      className={`w-full h-full py-3 flex justify-center items-center ${g.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}
                      title={
                        g.isActive ? "Deactivate Group" : "Activate Group"
                      }
                    >
                      {g.isActive ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <form onSubmit={handleAddGroup} className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New Group Name"
                className="flex-1 px-3 py-1.5 text-sm rounded border border-slate-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={addingGroup}
                className="bg-slate-800 hover:bg-slate-900"
              >
                {addingGroup ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
