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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CalendarClock,
  Phone,
  HardHat,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Share2,
  Loader2,
  IndianRupee,
} from "lucide-react";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";

export interface DueClient {
  id: string; // invoice ID
  clientId: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string | null;
  projectName: string;
  dueDate: string;
  balance: number;
  status: string;
}

export interface DueContractor {
  contractorId: string;
  contractorName: string;
  contractorPhone: string | null;
  payableBalance: number;
}

interface SaturdayViewClientProps {
  clientDues: DueClient[];
  labourDues: DueContractor[];
  comingSaturdayStr: string;
}

export function SaturdayViewClient({
  clientDues,
  labourDues,
  comingSaturdayStr,
}: SaturdayViewClientProps) {
  const router = useRouter();
  const comingSaturday = new Date(comingSaturdayStr);
  const today = new Date();

  // Modal states for Client Payment
  const [selectedClientDue, setSelectedClientDue] = useState<DueClient | null>(
    null,
  );
  const [clientPayAmount, setClientPayAmount] = useState<string>("");
  const [clientSheetOpen, setClientSheetOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [successClientData, setSuccessClientData] = useState<any>(null);

  // Modal states for Labour Payment
  const [selectedContractor, setSelectedContractor] =
    useState<DueContractor | null>(null);
  const [labourPayAmount, setLabourPayAmount] = useState<string>("");
  const [labourSheetOpen, setLabourSheetOpen] = useState(false);
  const [savingLabour, setSavingLabour] = useState(false);
  const [successLabourData, setSuccessLabourData] = useState<any>(null);

  // Calculations
  const totalClientDues = clientDues.reduce(
    (acc, curr) => acc + curr.balance,
    0,
  );
  const totalLabourDues = labourDues.reduce(
    (acc, curr) => acc + curr.payableBalance,
    0,
  );
  const netPicture = totalClientDues - totalLabourDues;

  const formatCurrency = (val: number) => {
    return `₹${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenClientPayment = (due: DueClient) => {
    setSelectedClientDue(due);
    setClientPayAmount(due.balance.toString());
    setClientSheetOpen(true);
  };

  const handleOpenLabourPayment = (contractor: DueContractor) => {
    setSelectedContractor(contractor);
    setLabourPayAmount(contractor.payableBalance.toString());
    setLabourSheetOpen(true);
  };

  const handleSaveClientPayment = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!selectedClientDue) return;
    setSavingClient(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      amount: Number(clientPayAmount),
      date: formData.get("date"),
      method: formData.get("method"),
      note: formData.get("note") || undefined,
      invoiceId: selectedClientDue.id,
    };

    try {
      const res = await fetch(
        `/api/clients/${selectedClientDue.clientId}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        const createdTxn = await res.json();
        setSuccessClientData({
          ...payload,
          id: createdTxn.id,
          clientName: selectedClientDue.clientName,
          clientPhone: selectedClientDue.clientPhone,
          projectName: selectedClientDue.projectName,
          balance: selectedClientDue.balance - payload.amount,
        });
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to record client payment");
      }
    } catch (err) {
      alert("An error occurred while saving client payment.");
    } finally {
      setSavingClient(false);
    }
  };

  const handleSaveLabourPayment = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!selectedContractor) return;
    setSavingLabour(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      amount: Number(labourPayAmount),
      paymentDate: formData.get("paymentDate"),
      method: formData.get("method") || "CASH",
      note: formData.get("note") || undefined,
    };

    try {
      const res = await fetch(
        `/api/contacts/${selectedContractor.contractorId}/labour-payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        const createdTxn = await res.json();
        setSuccessLabourData({
          ...payload,
          id: createdTxn.id,
          contractorName: selectedContractor.contractorName,
          contractorPhone: selectedContractor.contractorPhone,
        });
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to record labour payment");
      }
    } catch (err) {
      alert("An error occurred while saving labour payment.");
    } finally {
      setSavingLabour(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-muted-foreground" /> Saturday
            View
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Complete weekly cash picture ahead of{" "}
            {comingSaturday.toLocaleDateString()} settlement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadPdfButton
            reportType="saturday_view"
            buttonText="Export Saturday PDF"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Expected Incoming (Clients)</span>
              <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(totalClientDues)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {clientDues.length} pending client invoice
              {clientDues.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Payable Out (Labour)</span>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(totalLabourDues)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              To {labourDues.length} contractor
              {labourDues.length !== 1 ? "s" : ""} on weekly cycle
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Net Weekly Position</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(netPicture)}{" "}
              {netPicture >= 0 ? "(Surplus)" : "(Deficit)"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net cash flow projected for this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Section 1: Client Dues This Week */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Client Dues This Week
            </h2>
            <p className="text-sm text-slate-500">
              Invoices pending payment expected before or on Saturday.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
              Total In: {formatCurrency(totalClientDues)}
            </Badge>
          </div>
        </div>

        {/* Mobile & Tablet Card View (below lg breakpoint) */}
        <div className="lg:hidden space-y-3.5">
          {clientDues.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-white p-6 shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-slate-700 text-sm">
                No client dues expected by this Saturday! All caught up.
              </p>
            </div>
          ) : (
            clientDues.map((due) => {
              const isPastDue =
                new Date(due.dueDate).getTime() < today.getTime();
              return (
                <div
                  key={due.id}
                  className={cn(
                    "border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3",
                    isPastDue
                      ? "bg-orange-50/40 border-orange-200"
                      : "bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {due.invoiceNumber}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-semibold"
                      >
                        {due.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-600 block">
                        Due: {new Date(due.dueDate).toLocaleDateString()}
                      </span>
                      {isPastDue && (
                        <Badge
                          variant="destructive"
                          className="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] font-bold uppercase mt-0.5"
                        >
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href={`/clients/${due.clientId}`}
                      className="font-bold text-base text-blue-600 hover:underline block break-words"
                    >
                      {due.clientName}
                    </Link>
                    <div className="text-xs font-medium text-slate-500">
                      {due.projectName}
                    </div>
                    {due.clientPhone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium pt-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {due.clientPhone}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Balance Due
                      </span>
                      <span className="font-mono font-bold text-slate-950 text-lg">
                        {formatCurrency(due.balance)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 shadow-sm"
                      onClick={() => handleOpenClientPayment(due)}
                    >
                      Record Payment
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (lg breakpoint and above) */}
        <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
          <Table className="min-w-[850px]">
            <TableHeader className="bg-slate-50/80 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-[140px] font-semibold text-slate-700">
                  Due Date
                </TableHead>
                <TableHead className="w-[140px] font-semibold text-slate-700">
                  Invoice #
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Client & Project
                </TableHead>
                <TableHead className="w-[160px] font-semibold text-slate-700">
                  Contact
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-slate-700">
                  Status
                </TableHead>
                <TableHead className="text-right w-[150px] font-semibold text-slate-700">
                  Balance Due (₹)
                </TableHead>
                <TableHead className="text-right w-[140px] font-semibold text-slate-700">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientDues.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p className="font-medium">
                        No client dues expected by this Saturday! All caught up.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clientDues.map((due) => {
                  const isPastDue =
                    new Date(due.dueDate).getTime() < today.getTime();
                  return (
                    <TableRow
                      key={due.id}
                      className={
                        isPastDue
                          ? "bg-orange-50/50 hover:bg-orange-50"
                          : "hover:bg-slate-50/60 transition-colors"
                      }
                    >
                      <TableCell
                        className={cn(
                          "font-semibold text-slate-800",
                          isPastDue && "text-orange-900",
                        )}
                      >
                        <div>{new Date(due.dueDate).toLocaleDateString()}</div>
                        {isPastDue && (
                          <Badge
                            variant="destructive"
                            className="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] uppercase font-bold mt-1"
                          >
                            Overdue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold text-slate-900">
                        {due.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/clients/${due.clientId}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {due.clientName}
                        </Link>
                        <div className="text-xs text-slate-500 font-medium">
                          {due.projectName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {due.clientPhone ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                            {due.clientPhone}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-semibold">
                          {due.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-950 text-base">
                        {formatCurrency(due.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-semibold text-xs shadow-sm hover:bg-slate-100"
                          onClick={() => handleOpenClientPayment(due)}
                        >
                          Record Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Stacked Section 2: Labour Payments Due This Week */}
      <section className="space-y-3 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <HardHat className="h-5 w-5 text-muted-foreground" /> Labour
              Payments Due This Week
            </h2>
            <p className="text-xs text-muted-foreground">
              Contractors with a positive running payable balance awaiting
              weekly Saturday settlement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
              Total Out: {formatCurrency(totalLabourDues)}
            </Badge>
          </div>
        </div>

        {/* Mobile & Tablet Card View (below lg breakpoint) */}
        <div className="lg:hidden space-y-3.5">
          {labourDues.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-white p-6 shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-slate-700 text-sm">
                No pending labour payments due this week! All contractors
                settled.
              </p>
            </div>
          ) : (
            labourDues.map((contractor) => (
              <div
                key={contractor.contractorId}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <Link
                    href={`/vendors/${contractor.contractorId}`}
                    className="font-bold text-slate-900 hover:text-blue-600 flex items-center gap-2 text-base break-words"
                  >
                    <HardHat className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>{contractor.contractorName}</span>
                  </Link>
                </div>

                <div className="text-xs">
                  {contractor.contractorPhone ? (
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">
                        {contractor.contractorPhone}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">
                      No phone recorded
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Payable Balance
                    </span>
                    <span className="font-mono font-bold text-amber-700 text-lg">
                      {formatCurrency(contractor.payableBalance)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold border-amber-300 hover:bg-amber-50 text-amber-900 h-9 px-4 shadow-sm"
                    onClick={() => handleOpenLabourPayment(contractor)}
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (lg breakpoint and above) */}
        <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
          <Table className="min-w-[750px]">
            <TableHeader className="bg-slate-50/80 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-[260px] font-semibold text-slate-700">
                  Labour Contractor
                </TableHead>
                <TableHead className="w-[220px] font-semibold text-slate-700">
                  Contact Phone
                </TableHead>
                <TableHead className="text-right w-[180px] font-semibold text-slate-700">
                  Payable Balance (₹)
                </TableHead>
                <TableHead className="text-right w-[150px] font-semibold text-slate-700">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labourDues.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p className="font-medium">
                        No pending labour payments due this week! All
                        contractors settled.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                labourDues.map((contractor) => (
                  <TableRow
                    key={contractor.contractorId}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <TableCell className="font-bold text-slate-900">
                      <Link
                        href={`/vendors/${contractor.contractorId}`}
                        className="hover:text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <HardHat className="h-4 w-4 text-orange-500 shrink-0" />{" "}
                        {contractor.contractorName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {contractor.contractorPhone ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                          <span className="font-mono">
                            {contractor.contractorPhone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          No phone recorded
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-950 text-base">
                      {formatCurrency(contractor.payableBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-semibold text-xs shadow-sm hover:bg-slate-100"
                        onClick={() => handleOpenLabourPayment(contractor)}
                      >
                        Record Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Client Payment Sheet Modal */}
      <Sheet
        open={clientSheetOpen}
        onOpenChange={(val) => {
          setClientSheetOpen(val);
          if (!val) setTimeout(() => setSuccessClientData(null), 300);
        }}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {successClientData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <h3 className="text-xl font-bold text-slate-800">
                Payment Recorded!
              </h3>
              <p className="text-slate-500 text-center text-sm px-4">
                Successfully logged ₹{successClientData.amount.toLocaleString()}{" "}
                from {successClientData.clientName}.
              </p>
              <div className="pt-6 w-full space-y-3">
                <ShareViaWhatsAppButton
                  phone={successClientData.clientPhone}
                  message={`Hi ${successClientData.clientName}, I've received your payment of ₹${successClientData.amount} on ${new Date(successClientData.date).toLocaleDateString()} for ${successClientData.projectName}. Thank you! — Bismillah Construction`}
                  onShare={() => setClientSheetOpen(false)}
                  className="w-full font-bold h-11"
                  size="lg"
                  logType="CLIENT_RECEIPT"
                  referenceId={successClientData.id || "unknown"}
                  referenceType="ClientPayment"
                />
                <Button
                  variant="outline"
                  className="w-full font-bold h-11 shadow-sm"
                  onClick={() => setClientSheetOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Record Client Payment</SheetTitle>
                <SheetDescription>
                  Log an incoming payment from {selectedClientDue?.clientName}{" "}
                  against Invoice #{selectedClientDue?.invoiceNumber}.
                </SheetDescription>
              </SheetHeader>
              <form
                onSubmit={handleSaveClientPayment}
                className="space-y-4 mt-6"
              >
                <div className="bg-slate-50 p-3 rounded-md border text-sm space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Invoice Amount Due:</span>
                    <span className="font-mono text-slate-900">
                      {selectedClientDue
                        ? formatCurrency(selectedClientDue.balance)
                        : "₹0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Project:</span>
                    <span>{selectedClientDue?.projectName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Amount Received (₹) *
                    </label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={clientPayAmount}
                      onChange={(e) => setClientPayAmount(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Payment Date *
                    </label>
                    <input
                      name="date"
                      type="date"
                      required
                      defaultValue={today.toISOString().split("T")[0]}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Payment Method *
                  </label>
                  <select
                    name="method"
                    defaultValue="BANK_TRANSFER"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Note / Reference
                  </label>
                  <input
                    name="note"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="Saturday weekly settlement..."
                  />
                </div>

                <SheetFooter className="mt-6 pt-2 border-t flex items-center justify-end gap-2">
                  <SheetClose
                    render={<Button variant="outline" type="button" />}
                  >
                    Cancel
                  </SheetClose>
                  <Button type="submit" disabled={savingClient}>
                    {savingClient ? "Saving..." : "Confirm Payment"}
                  </Button>
                </SheetFooter>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Labour Payment Sheet Modal */}
      <Sheet
        open={labourSheetOpen}
        onOpenChange={(val) => {
          setLabourSheetOpen(val);
          if (!val) setTimeout(() => setSuccessLabourData(null), 300);
        }}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {successLabourData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <h3 className="text-xl font-bold text-slate-800">
                Payment Recorded!
              </h3>
              <p className="text-slate-500 text-center text-sm px-4">
                Successfully logged ₹{successLabourData.amount.toLocaleString()}{" "}
                payment to {successLabourData.contractorName}.
              </p>
              <div className="pt-6 w-full space-y-3">
                <ShareViaWhatsAppButton
                  phone={successLabourData.contractorPhone}
                  message={`Hi ${successLabourData.contractorName}, I've paid ₹${successLabourData.amount} on ${new Date(successLabourData.paymentDate).toLocaleDateString()} for labour supplied. Thank you — Bismillah Construction`}
                  onShare={() => setLabourSheetOpen(false)}
                  className="w-full font-bold h-11"
                  size="lg"
                  logType="LABOUR_PAYMENT"
                  referenceId={successLabourData.id || "unknown"}
                  referenceType="DailyLabourEntry"
                />
                <Button
                  variant="outline"
                  className="w-full font-bold h-11 shadow-sm"
                  onClick={() => setLabourSheetOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Record Labour Payment</SheetTitle>
                <SheetDescription>
                  Log an outgoing weekly settlement payment to labour contractor{" "}
                  {selectedContractor?.contractorName}.
                </SheetDescription>
              </SheetHeader>
              <form
                onSubmit={handleSaveLabourPayment}
                className="space-y-4 mt-6"
              >
                <div className="bg-slate-50 p-3 rounded-md border text-sm space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">
                      Total Payable Balance:
                    </span>
                    <span className="font-mono text-slate-900">
                      {selectedContractor
                        ? formatCurrency(selectedContractor.payableBalance)
                        : "₹0.00"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground bg-slate-100 p-1.5 rounded mt-1">
                    Settling unpaid weekly-cycle labour supplied by this
                    contractor.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Payment Amount (₹) *
                    </label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={labourPayAmount}
                      onChange={(e) => setLabourPayAmount(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Payment Date *
                    </label>
                    <input
                      name="paymentDate"
                      type="date"
                      required
                      defaultValue={today.toISOString().split("T")[0]}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Payment Method *
                  </label>
                  <select
                    name="method"
                    defaultValue="CASH"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Note / Description
                  </label>
                  <input
                    name="note"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="Saturday weekly wage settlement..."
                  />
                </div>

                <SheetFooter className="mt-6 pt-2 border-t flex items-center justify-end gap-2">
                  <SheetClose
                    render={<Button variant="outline" type="button" />}
                  >
                    Cancel
                  </SheetClose>
                  <Button type="submit" disabled={savingLabour}>
                    {savingLabour ? "Saving..." : "Log Payment"}
                  </Button>
                </SheetFooter>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
