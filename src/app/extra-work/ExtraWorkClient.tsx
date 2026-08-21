"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Hammer, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ExtraWorkClient({
  extraWork,
  projects,
}: {
  extraWork: any[];
  projects: { id: string | number; name: string }[];
}) {
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // FIXED: Cast to String() to prevent silent integer-to-string strict equality failures
  const filteredWork = extraWork.filter((w) => {
    const pMatch =
      projectFilter === "ALL" || String(w.projectId) === String(projectFilter);
    const sMatch =
      statusFilter === "ALL" ||
      String(w.status).toUpperCase() === String(statusFilter).toUpperCase();
    return pMatch && sMatch;
  });

  const totalUnbilled = extraWork
    .filter((w) => w.status === "UNBILLED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalBilled = extraWork
    .filter((w) => w.status === "BILLED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalCollected = extraWork
    .filter((w) => w.status === "COLLECTED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="space-y-6">
      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">
              Total Unbilled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹
              {totalUnbilled.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Billed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹
              {totalBilled.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹
              {totalCollected.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={projectFilter}
          onValueChange={(val) => {
            if (val) setProjectFilter(val);
          }}
        >
          <SelectTrigger className="w-full sm:w-[250px] max-sm:h-11 max-sm:text-sm bg-white">
            {/* FIXED: Explicitly dictate the text to render to prevent blank UI states */}
            <SelectValue placeholder="Filter by Project">
              {projectFilter === "ALL"
                ? "All Projects"
                : projects.find((p) => String(p.id) === projectFilter)?.name ||
                  "Filter by Project"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="max-sm:py-3 max-sm:text-sm">
              All Projects
            </SelectItem>
            {projects.map((p) => (
              <SelectItem
                key={p.id}
                value={String(p.id)}
                className="max-sm:py-3 max-sm:text-sm"
              >
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            if (val) setStatusFilter(val);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] max-sm:h-11 max-sm:text-sm bg-white">
            {/* FIXED: Explicit display value for the status select */}
            <SelectValue placeholder="Filter by Status">
              {statusFilter === "ALL" ? "All Statuses" : statusFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="max-sm:py-3 max-sm:text-sm">
              All Statuses
            </SelectItem>
            <SelectItem value="UNBILLED" className="max-sm:py-3 max-sm:text-sm">
              UNBILLED
            </SelectItem>
            <SelectItem value="BILLED" className="max-sm:py-3 max-sm:text-sm">
              BILLED
            </SelectItem>
            <SelectItem
              value="COLLECTED"
              className="max-sm:py-3 max-sm:text-sm"
            >
              COLLECTED
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile & Tablet Stacked Card View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {filteredWork.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
            <Hammer className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm font-medium">
              No extra work deviations found.
            </p>
          </div>
        ) : (
          filteredWork.map((w) => (
            <div
              key={w.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                <Link
                  href={`/projects/${w.projectId}`}
                  className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-blue-600 text-base break-words"
                >
                  <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                  {w.project?.name || "Unknown Project"}
                </Link>
                <span className="text-xs font-medium text-slate-500 shrink-0">
                  {new Date(w.date).toLocaleDateString()}
                </span>
              </div>

              <div className="text-sm text-slate-700 font-medium break-words">
                {w.description}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Badge
                  variant={
                    w.status === "UNBILLED"
                      ? "secondary"
                      : w.status === "COLLECTED"
                        ? "default"
                        : "outline"
                  }
                  className={cn(
                    "text-xs font-bold px-2.5 py-0.5",
                    w.status === "COLLECTED"
                      ? "bg-green-600 text-white"
                      : w.status === "UNBILLED"
                        ? "bg-orange-100 text-orange-800 border border-orange-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200",
                  )}
                >
                  {w.status}
                </Badge>
                <span className="font-mono font-bold text-slate-950 text-base">
                  ₹
                  {Number(w.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[140px] font-semibold text-slate-700">
                Date
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Project
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Description
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWork.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Hammer className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                  <p className="text-muted-foreground font-medium">
                    No extra work deviations found.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredWork.map((w) => (
                <TableRow
                  key={w.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <TableCell className="font-medium whitespace-nowrap text-slate-600">
                    {new Date(w.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/projects/${w.projectId}`}
                      className="flex items-center gap-1 text-sm font-bold text-slate-800 hover:text-blue-600"
                    >
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {w.project?.name || "Unknown Project"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-700">
                    {w.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        w.status === "UNBILLED"
                          ? "secondary"
                          : w.status === "COLLECTED"
                            ? "default"
                            : "outline"
                      }
                      className={cn(
                        "text-xs font-semibold",
                        w.status === "COLLECTED"
                          ? "bg-green-600 text-white"
                          : w.status === "UNBILLED"
                            ? "bg-orange-100 text-orange-800 border-orange-200"
                            : "bg-blue-100 text-blue-800 border-blue-200",
                      )}
                    >
                      {w.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 text-base">
                    ₹
                    {Number(w.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
