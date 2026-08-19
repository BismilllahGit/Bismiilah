"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Package,
  Wallet,
  CalendarClock,
  BarChart3,
  FileText,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { cn } from "@/lib/utils";
import {
  SaturdayViewClient,
  DueClient,
  DueContractor,
} from "./saturday-view/SaturdayViewClient";

export interface OverviewData {
  totalCollected: number;
  invoicesCount: number;
  vendorPayments: number;
  vendorPurchases: number;
  totalExpenses: number;
  totalLabourSpend: number;
  netCashflow: number;
  vendorBalanceDue: number;
  totalHeadcount: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: "IN" | "OUT";
  category: string;
  description: string;
  amount: number;
}

export interface CashFlowData {
  totalIn: number;
  totalOut: number;
  netPosition: number;
  transactions: Transaction[];
}

export interface SaturdayData {
  dueClients: DueClient[];
  labourDues: DueContractor[];
  comingSaturdayStr: string;
}

export interface ReportsClientProps {
  initialTab: string;
  overviewData: OverviewData;
  cashFlowData: CashFlowData;
  saturdayData: SaturdayData;
}

export function ReportsClient({
  initialTab,
  overviewData,
  cashFlowData,
  saturdayData,
}: ReportsClientProps) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(initialTab || "overview");

  const handleTabChange = (val: string) => {
    setCurrentTab(val);
    window.history.replaceState(null, "", `/reports?tab=${val}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Consolidated financial analytics, cash flow tracking, and weekly
            settlement schedules.
          </p>
        </div>
        <Link
          href="/reports/share-logs"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-colors shrink-0"
        >
          <MessageCircle className="h-4 w-4" />
          View Communication Logs
        </Link>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full space-y-6"
      >
        <TabsList className="grid !h-auto w-full grid-cols-2 lg:grid-cols-4 items-stretch gap-1.5 bg-slate-100 p-1.5 rounded-lg">
          <TabsTrigger
            value="overview"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
          >
            <BarChart3 className="h-4 w-4 shrink-0 text-blue-600" />
            <span>Overview</span>
          </TabsTrigger>

          <TabsTrigger
            value="cash-flow"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700"
          >
            <Wallet className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Cash Flow</span>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5"
            >
              Live
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="saturday-view"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700"
          >
            <CalendarClock className="h-4 w-4 shrink-0 text-purple-600" />
            <span>
              Weekly Dues
              <span className="hidden xl:inline"> (Saturday View)</span>
            </span>
            {saturdayData.dueClients.length + saturdayData.labourDues.length >
              0 && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] bg-purple-100 text-purple-800 font-mono px-1.5"
              >
                {saturdayData.dueClients.length +
                  saturdayData.labourDues.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="usage-reports"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700"
          >
            <Package className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Material Usage</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Financial Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="bg-green-50 border-green-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                    Total Collected <ArrowUpRight className="ml-1 h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">
                    ₹{overviewData.totalCollected.toLocaleString()}
                  </div>
                  <p className="text-xs text-green-600/80">
                    From {overviewData.invoicesCount} invoices
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                    Vendor Payments <ArrowDownRight className="ml-1 h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">
                    ₹{overviewData.vendorPayments.toLocaleString()}
                  </div>
                  <p className="text-xs text-orange-600/80">
                    Against ₹{overviewData.vendorPurchases.toLocaleString()}{" "}
                    purchases
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                    Site Expenses <ArrowDownRight className="ml-1 h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">
                    ₹{overviewData.totalExpenses.toLocaleString()}
                  </div>
                  <p className="text-xs text-orange-600/80">
                    Petty cash & ad-hoc
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                    Labour Wages <ArrowDownRight className="ml-1 h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">
                    ₹{overviewData.totalLabourSpend.toLocaleString()}
                  </div>
                  <p className="text-xs text-orange-600/80">
                    Total daily labour spend
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "shadow-sm",
                  overviewData.netCashflow >= 0
                    ? "bg-blue-50 border-blue-200"
                    : "bg-red-50 border-red-200",
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle
                    className={`text-sm font-medium flex items-center ${overviewData.netCashflow >= 0 ? "text-blue-800" : "text-red-800"}`}
                  >
                    Net Cashflow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${overviewData.netCashflow >= 0 ? "text-blue-700" : "text-red-700"}`}
                  >
                    {overviewData.netCashflow >= 0 ? "+" : "-"}₹
                    {Math.abs(overviewData.netCashflow).toLocaleString()}
                  </div>
                  <p
                    className={`text-xs ${overviewData.netCashflow >= 0 ? "text-blue-600/80" : "text-red-600/80"}`}
                  >
                    Collected - All Outflows
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Liabilities</h2>
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Vendor Payables Due</span>
                      </div>
                      <span className="font-mono font-bold text-orange-600">
                        ₹{overviewData.vendorBalanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Labour Stats</h2>
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium">
                          Total Headcount Logged
                        </span>
                      </div>
                      <span className="font-mono font-bold">
                        {overviewData.totalHeadcount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Total Labour Spend</span>
                      </div>
                      <span className="font-mono font-bold text-orange-600">
                        ₹{overviewData.totalLabourSpend.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CASH FLOW */}
        <TabsContent value="cash-flow" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              Live Cash Flow Standing
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time breakdown of all incoming client collections versus
              project outflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                  Total Inflow <ArrowUpRight className="ml-1 h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-green-700">
                  ₹{cashFlowData.totalIn.toLocaleString()}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Client payments received
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                  Total Outflow <ArrowDownRight className="ml-1 h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-orange-700">
                  ₹{cashFlowData.totalOut.toLocaleString()}
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Vendors + Site Expenses + Labour Wages
                </p>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "shadow-sm",
                cashFlowData.netPosition >= 0
                  ? "bg-blue-50 border-blue-200"
                  : "bg-red-50 border-red-200",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className={`text-sm font-medium flex items-center ${cashFlowData.netPosition >= 0 ? "text-blue-800" : "text-red-800"}`}
                >
                  Net Position <Wallet className="ml-2 h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold font-mono ${cashFlowData.netPosition >= 0 ? "text-blue-700" : "text-red-700"}`}
                >
                  {cashFlowData.netPosition >= 0 ? "+" : "-"}₹
                  {Math.abs(cashFlowData.netPosition).toLocaleString()}
                </div>
                <p
                  className={`text-xs mt-1 ${cashFlowData.netPosition >= 0 ? "text-blue-600" : "text-red-600"}`}
                >
                  Current net cash standing
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Recent Financial Transactions
            </h2>
            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
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
                  {cashFlowData.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No financial transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cashFlowData.transactions.map((txn) => (
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
                          {txn.type === "IN" ? "+" : "-"}{" "}
                          {txn.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SATURDAY VIEW / WEEKLY DUES */}
        <TabsContent value="saturday-view" className="space-y-6">
          <SaturdayViewClient
            clientDues={saturdayData.dueClients}
            labourDues={saturdayData.labourDues}
            comingSaturdayStr={saturdayData.comingSaturdayStr}
          />
        </TabsContent>

        {/* TAB 4: USAGE REPORTS */}
        <TabsContent value="usage-reports" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              Material Consumption & Inventory Usage
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Summarizes actual material consumption across all active projects,
              excluding historical inter-project stock transfers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Package className="h-5 w-5 text-blue-500 shrink-0" />
                  Top Material Usage Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download a complete breakdown of quantities issued, average
                  unit costs, and total material expenditure per item across
                  active sites.
                </p>
                <DownloadPdfButton
                  reportType="top_usage"
                  buttonText="Download Usage PDF"
                  variant="outline"
                  className="w-full font-semibold"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
