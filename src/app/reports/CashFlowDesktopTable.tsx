"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Transaction } from "./ReportsClient";

export function CashFlowDesktopTable({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="hidden md:block border rounded-md bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-8 text-muted-foreground"
              >
                No financial transactions recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((txn) => (
              <TableRow key={txn.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium">
                  {new Date(txn.date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {txn.type === "IN" ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <ArrowUpRight className="h-3 w-3 mr-1" /> IN
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                      <ArrowDownRight className="h-3 w-3 mr-1" /> OUT
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {txn.category}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {txn.description}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-bold ${txn.type === "IN" ? "text-green-600" : "text-orange-600"}`}
                >
                  {txn.type === "IN" ? "+" : "-"} {txn.amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
