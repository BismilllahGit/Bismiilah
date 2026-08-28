"use client";

import { Receipt, HardHat, Package, Store, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExpenseSummaryCards({
  totalOutflow,
  totalLabour,
  totalPettyCash,
  totalMaterials,
  totalVendor,
}: {
  totalOutflow: number;
  totalLabour: number;
  totalPettyCash: number;
  totalMaterials: number;
  totalVendor: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-slate-50 border-slate-200 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between">
            Total Buy / Outflow <Wallet className="h-4 w-4 text-slate-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹
            {totalOutflow.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            All categories (0% double-count)
          </p>
        </CardContent>
      </Card>

      <Card className="bg-orange-50/70 border-orange-200 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-orange-800 flex items-center justify-between">
            Labour Wages <HardHat className="h-4 w-4 text-orange-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-orange-700">
            ₹
            {totalLabour.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-orange-600 mt-1">
            Dedicated labour spend
          </p>
        </CardContent>
      </Card>

      <Card className="bg-red-50/70 border-red-200 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-red-800 flex items-center justify-between">
            Petty Cash <Receipt className="h-4 w-4 text-red-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-red-700">
            ₹
            {totalPettyCash.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-red-600 mt-1">General site expenses</p>
        </CardContent>
      </Card>

      <Card className="bg-blue-50/70 border-blue-200 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-800 flex items-center justify-between">
            Materials Issued <Package className="h-4 w-4 text-blue-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-blue-700">
            ₹
            {totalMaterials.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-blue-600 mt-1">Assigned stock value</p>
        </CardContent>
      </Card>

      <Card className="bg-amber-50/70 border-amber-200 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center justify-between">
            Vendor Payments <Store className="h-4 w-4 text-amber-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-amber-700">
            ₹
            {totalVendor.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-amber-600 mt-1">Project vendor bills</p>
        </CardContent>
      </Card>
    </div>
  );
}
