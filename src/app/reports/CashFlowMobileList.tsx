"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Transaction } from "./ReportsClient";

export function CashFlowMobileList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {transactions.length === 0 ? (
        <div className="border rounded-md bg-white shadow-sm p-8 text-center text-muted-foreground text-sm">
          No financial transactions recorded yet.
        </div>
      ) : (
        transactions.map((txn) => (
          <div
            key={txn.id}
            className="border rounded-md bg-white shadow-sm p-4 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-slate-900 leading-none">
                  {txn.category}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {new Date(txn.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`font-mono font-bold leading-none ${txn.type === "IN" ? "text-green-600" : "text-orange-600"}`}
                >
                  {txn.type === "IN" ? "+" : "-"} {txn.amount.toLocaleString()}
                </span>
                {txn.type === "IN" ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] px-1.5 py-0">
                    <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> IN
                  </Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-[10px] px-1.5 py-0">
                    <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" /> OUT
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-slate-600 border-t pt-2">
              {txn.description}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
