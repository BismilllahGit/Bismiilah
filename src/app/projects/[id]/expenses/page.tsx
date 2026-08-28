"use client";

import { useState, use } from "react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import { ArrowLeft, Receipt, HardHat, Package, Store } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ExpenseFormSheet from "./ExpenseFormSheet";
import ExpenseSummaryCards from "./ExpenseSummaryCards";
import SiteExpensesView from "./SiteExpensesView";
import LabourEntriesView from "./LabourEntriesView";
import MaterialsView from "./MaterialsView";
import VendorTransactionsView from "./VendorTransactionsView";

export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
};

export type LabourEntry = {
  id: string;
  date: string;
  headcount: number;
  wageRate: number;
  title: string | null;
  workerType: { name: string } | null;
  contractor: { name: string } | null;
};

export type MaterialEntry = {
  id: string;
  qtyIssued: number;
  item: { name: string; unit: string; unitCost: number };
};

export type VendorTxn = {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string | null;
  contact: { name: string };
};

type ExpensesResponse =
  | Expense[]
  | {
      siteExpenses: Expense[];
      labourEntries: LabourEntry[];
      materials: MaterialEntry[];
      vendorTransactions: VendorTxn[];
    };

export default function SiteExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [open, setOpen] = useState(false);

  const {
    data: expensesResult,
    loading,
    refetch: refetchExpenses,
  } = useApiResource<ExpensesResponse>(`/api/projects/${projectId}/expenses`);

  const expenses = Array.isArray(expensesResult)
    ? expensesResult
    : expensesResult?.siteExpenses || [];
  const labourEntries = Array.isArray(expensesResult)
    ? []
    : expensesResult?.labourEntries || [];
  const materials = Array.isArray(expensesResult)
    ? []
    : expensesResult?.materials || [];
  const vendorTxns = Array.isArray(expensesResult)
    ? []
    : expensesResult?.vendorTransactions || [];

  const { mutate: createExpense, mutating: saving } = useApiMutation<
    {
      category: FormDataEntryValue | null;
      amount: number;
      date: FormDataEntryValue | null;
      description: FormDataEntryValue | undefined;
    },
    Expense
  >("POST");

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const payload = {
      category: formData.get("category"),
      amount: Number(formData.get("amount")),
      date: formData.get("date"),
      description: formData.get("description") || undefined,
    };

    try {
      await createExpense(`/api/projects/${projectId}/expenses`, payload);
      setOpen(false);
      refetchExpenses();
    } catch (err: any) {
      alert(err?.message || "Failed to log expense");
    }
  };

  const totalPettyCash = expenses.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );
  const totalLabour = labourEntries.reduce(
    (acc, curr) => acc + Number(curr.headcount) * Number(curr.wageRate),
    0,
  );
  const totalMaterials = materials.reduce(
    (acc, curr) => acc + Number(curr.qtyIssued) * Number(curr.item.unitCost),
    0,
  );
  const totalVendor = vendorTxns.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  // Overall Buy-side Outflow without double counting any category
  const totalOutflow =
    totalPettyCash + totalLabour + totalMaterials + totalVendor;

  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Project
      </Link>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Site Expenses & Buy-Side Costs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Categorized breakdown of labour wages, materials issued, vendor
            transactions, and petty cash.
          </p>
        </div>

        <ExpenseFormSheet
          open={open}
          onOpenChange={setOpen}
          onSubmit={handleSave}
          saving={saving}
        />
      </div>

      {/* Summary Category Cards */}
      <ExpenseSummaryCards
        totalOutflow={totalOutflow}
        totalLabour={totalLabour}
        totalPettyCash={totalPettyCash}
        totalMaterials={totalMaterials}
        totalVendor={totalVendor}
      />

      {/* Categorized Line Item Tables */}
      <Tabs defaultValue="labour" className="w-full space-y-6">
        <TabsList className="grid !h-auto w-full grid-cols-2 lg:grid-cols-4 items-stretch gap-1.5 bg-slate-100 p-1.5 rounded-lg">
          <TabsTrigger
            value="labour"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-700"
          >
            <HardHat className="h-4 w-4 shrink-0 text-orange-600" />
            <span>
              Labour <span className="hidden xl:inline">(wages)</span>
            </span>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] bg-orange-100 text-orange-800 font-mono px-1.5"
            >
              {labourEntries.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="petty_cash"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700"
          >
            <Receipt className="h-4 w-4 shrink-0 text-red-600" />
            <span>
              <span className="hidden xl:inline">General Site </span>Expenses
            </span>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] bg-red-100 text-red-800 font-mono px-1.5"
            >
              {expenses.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="materials"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
          >
            <Package className="h-4 w-4 shrink-0 text-blue-600" />
            <span>
              Materials <span className="hidden xl:inline">Issued</span>
            </span>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5"
            >
              {materials.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="vendor"
            className="flex h-auto min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700"
          >
            <Store className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <span className="hidden xl:inline">Vendor</span> Transactions
            </span>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5"
            >
              {vendorTxns.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* LABOUR TAB CONTENT */}
        <TabsContent value="labour" className="m-0 space-y-3">
          <LabourEntriesView entries={labourEntries} loading={loading} />
        </TabsContent>

        {/* PETTY CASH TAB CONTENT */}
        <TabsContent value="petty_cash" className="m-0 space-y-3">
          <SiteExpensesView expenses={expenses} loading={loading} />
        </TabsContent>

        {/* MATERIALS TAB CONTENT */}
        <TabsContent value="materials" className="m-0 space-y-3">
          <MaterialsView materials={materials} loading={loading} />
        </TabsContent>

        {/* VENDOR TAB CONTENT */}
        <TabsContent value="vendor" className="m-0 space-y-3">
          <VendorTransactionsView transactions={vendorTxns} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
