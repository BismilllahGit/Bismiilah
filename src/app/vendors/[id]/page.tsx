"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { LedgerTable, LedgerRow } from "@/components/ui/ledger-table";

type Contact = { id: string; name: string; type: string; phone: string | null };

type LedgerData = {
  openingBalance: number;
  rows: LedgerRow[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
};

export default function VendorLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const vendorId = resolvedParams.id;

  const [vendor, setVendor] = useState<Contact | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [successTxnData, setSuccessTxnData] = useState<any>(null);
  const [successLabourData, setSuccessLabourData] = useState<any>(null);

  const [currentStart, setCurrentStart] = useState("");
  const [currentEnd, setCurrentEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearch, setCurrentSearch] = useState("");

  const fetchLedger = async (
    start = currentStart,
    end = currentEnd,
    contactType = vendor?.type,
    p = currentPage,
    search = currentSearch,
  ) => {
    setLoading(true);
    let url =
      contactType === "LABOUR_CONTRACTOR"
        ? `/api/contacts/${vendorId}/labour-ledger`
        : `/api/contacts/${vendorId}/ledger`;

    const query = new URLSearchParams();
    if (start) query.append("startDate", start);
    if (end) query.append("endDate", end);
    if (search) query.append("search", search);
    query.append("page", p.toString());
    query.append("limit", "50");
    url += `?${query.toString()}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setLedgerData(data);
      if (data.contact) setVendor(data.contact);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLedger("", "", undefined, 1, "");
  }, [vendorId]);

  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      type: formData.get("type"),
      amount: Number(formData.get("amount")),
      date: formData.get("date"),
      description: formData.get("description") || undefined,
      projectId: formData.get("projectId") || undefined,
    };

    try {
      const res = await fetch(`/api/contacts/${vendorId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdTxn = await res.json();
        setSuccessTxnData({
          ...payload,
          id: createdTxn.id,
          vendorName: vendor?.name,
          vendorPhone: vendor?.phone,
        });
        fetchLedger(); // refetch ledger data after submission
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log transaction");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLabourPayment = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      amount: Number(formData.get("amount")),
      paymentDate: formData.get("paymentDate"),
      method: formData.get("method") || "CASH",
      note: formData.get("note") || undefined,
    };

    try {
      const res = await fetch(`/api/contacts/${vendorId}/labour-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdTxn = await res.json();
        setSuccessLabourData({
          ...payload,
          id: createdTxn.id,
          contractorName: vendor?.name,
          contractorPhone: vendor?.phone,
        });
        fetchLedger();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log labour payment");
      }
    } catch (err) {
      alert("An error occurred while saving payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setCurrentStart(start);
    setCurrentEnd(end);
    setCurrentPage(1);
    fetchLedger(start, end, undefined, 1, currentSearch);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchLedger(currentStart, currentEnd, undefined, newPage, currentSearch);
  };

  const handleSearchChange = (search: string) => {
    setCurrentSearch(search);
    setCurrentPage(1);
    fetchLedger(currentStart, currentEnd, undefined, 1, search);
  };

  const formatCurrency = (val: number) => {
    return `₹${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isLabourContractor = vendor?.type === "LABOUR_CONTRACTOR";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Link
        href="/vendors"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Vendors & Contractors
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
            {vendor?.name || "Loading..."}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {vendor?.type}
            </Badge>
            {vendor?.phone && (
              <span className="text-xs sm:text-sm font-medium">
                {vendor.phone}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isLabourContractor ? (
            <Sheet
              open={paymentOpen}
              onOpenChange={(val) => {
                setPaymentOpen(val);
                if (!val) setTimeout(() => setSuccessLabourData(null), 300);
              }}
            >
              <SheetTrigger
                render={
                  <Button className="flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm" />
                }
              >
                <Plus className="h-4 w-4" /> Add Payment
              </SheetTrigger>
              <SheetContent className="sm:max-w-md overflow-y-auto p-4">
                {successLabourData ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
                    <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                    <h3 className="text-xl font-bold text-slate-800">
                      Payment Recorded!
                    </h3>
                    <p className="text-slate-500 text-center text-sm px-4">
                      Successfully logged ₹
                      {successLabourData.amount.toLocaleString()} payment to{" "}
                      {successLabourData.contractorName}.
                    </p>
                    <div className="pt-6 w-full space-y-3">
                      <ShareViaWhatsAppButton
                        phone={successLabourData.contractorPhone}
                        message={`Hi ${successLabourData.contractorName}, I've paid ₹${successLabourData.amount} on ${new Date(successLabourData.paymentDate).toLocaleDateString()} for labour supplied. Thank you — Bismillah Construction`}
                        onShare={() => setPaymentOpen(false)}
                        className="w-full font-bold h-11"
                        size="lg"
                        logType="LABOUR_PAYMENT"
                        referenceId={successLabourData.id || "unknown"}
                        referenceType="DailyLabourEntry"
                      />
                      <Button
                        variant="outline"
                        className="w-full font-bold h-11 shadow-sm"
                        onClick={() => setPaymentOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <SheetHeader className="p-0">
                      <SheetTitle>Log Labour Payment</SheetTitle>
                      <SheetDescription>
                        Record a payment out made to labour contractor{" "}
                        {vendor?.name}.
                      </SheetDescription>
                    </SheetHeader>
                    <form
                      onSubmit={handleSaveLabourPayment}
                      className="space-y-4 mt-6"
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Amount (₹) *
                          </label>
                          <input
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Payment Date *
                          </label>
                          <input
                            name="paymentDate"
                            type="date"
                            required
                            defaultValue={
                              new Date().toISOString().split("T")[0]
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
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
                        <label className="text-sm font-medium">
                          Note / Description
                        </label>
                        <input
                          name="note"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          placeholder="Weekly settlement advance..."
                        />
                      </div>
                      <SheetFooter className="mt-6">
                        <SheetClose
                          render={<Button variant="outline" type="button" />}
                        >
                          Cancel
                        </SheetClose>
                        <Button type="submit" disabled={saving}>
                          {saving ? "Saving..." : "Log Payment"}
                        </Button>
                      </SheetFooter>
                    </form>
                  </>
                )}
              </SheetContent>
            </Sheet>
          ) : (
            <Sheet
              open={open}
              onOpenChange={(val) => {
                setOpen(val);
                if (!val) setTimeout(() => setSuccessTxnData(null), 300);
                if (val && projects.length === 0) {
                  fetch("/api/projects").then((r) => {
                    if (r.ok) r.json().then(setProjects);
                  });
                }
              }}
            >
              <SheetTrigger
                render={
                  <Button className="flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm" />
                }
              >
                <Plus className="h-4 w-4" /> Add Transaction
              </SheetTrigger>
              <SheetContent className="sm:max-w-md overflow-y-auto p-4">
                {successTxnData ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
                    <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                    <h3 className="text-xl font-bold text-slate-800">
                      Transaction Recorded!
                    </h3>
                    <p className="text-slate-500 text-center text-sm px-4">
                      Successfully logged{" "}
                      {successTxnData.type === "PAYMENT"
                        ? `₹${successTxnData.amount.toLocaleString()} payment to`
                        : `a purchase from`}{" "}
                      {successTxnData.vendorName}.
                    </p>
                    <div className="pt-6 w-full space-y-3">
                      <ShareViaWhatsAppButton
                        phone={successTxnData.vendorPhone}
                        message={
                          successTxnData.type === "PAYMENT"
                            ? `Hi ${successTxnData.vendorName}, I've paid ₹${successTxnData.amount} on ${new Date(successTxnData.date).toLocaleDateString()} for ${successTxnData.description || successTxnData.note || "materials"}. Thank you — Bismillah Construction`
                            : `Hi ${successTxnData.vendorName}, I've purchased ${successTxnData.description || successTxnData.note || "materials"} from you — amount: ₹${successTxnData.amount}, on ${new Date(successTxnData.date).toLocaleDateString()}. — Bismillah Construction`
                        }
                        onShare={() => setOpen(false)}
                        className="w-full font-bold h-11"
                        size="lg"
                        logType={
                          successTxnData.type === "PAYMENT"
                            ? "VENDOR_PAYMENT"
                            : "VENDOR_PURCHASE"
                        }
                        referenceId={successTxnData.id || "unknown"}
                        referenceType="VendorTransaction"
                      />
                      <Button
                        variant="outline"
                        className="w-full font-bold h-11 shadow-sm"
                        onClick={() => setOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <SheetHeader className="p-0">
                      <SheetTitle>Log Vendor Transaction</SheetTitle>
                      <SheetDescription>
                        Record a material purchase or a payment made to{" "}
                        {vendor?.name}.
                      </SheetDescription>
                    </SheetHeader>
                    <form
                      onSubmit={handleSaveTransaction}
                      className="space-y-4 mt-6"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Transaction Type *
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="type"
                              value="PURCHASE"
                              required
                              defaultChecked
                            />
                            Purchase (Bill)
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="type"
                              value="PAYMENT"
                              required
                            />
                            Payment Out
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Amount (₹) *
                          </label>
                          <input
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date *</label>
                          <input
                            name="date"
                            type="date"
                            required
                            defaultValue={
                              new Date().toISOString().split("T")[0]
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Project (Optional)
                        </label>
                        <select
                          name="projectId"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                          <option value="">-- No specific project --</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Description
                        </label>
                        <input
                          name="description"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          placeholder="Bill number, items..."
                        />
                      </div>
                      <SheetFooter className="mt-6">
                        <SheetClose
                          render={<Button variant="outline" type="button" />}
                        >
                          Cancel
                        </SheetClose>
                        <Button type="submit" disabled={saving}>
                          {saving ? "Saving..." : "Log Transaction"}
                        </Button>
                      </SheetFooter>
                    </form>
                  </>
                )}
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {ledgerData && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isLabourContractor
                ? "Outstanding Payable Balance"
                : "Current Balance"}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 break-words">
                {formatCurrency(ledgerData.closingBalance)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                {ledgerData.closingBalance >= 0
                  ? "(Payable)"
                  : "(Receivable / Advance)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {ledgerData ? (
        <LedgerTable
          openingBalance={ledgerData.openingBalance}
          rows={ledgerData.rows}
          totalDebit={ledgerData.totalDebit}
          totalCredit={ledgerData.totalCredit}
          closingBalance={ledgerData.closingBalance}
          debitLabel={
            isLabourContractor ? (
              <>
                Labour <span className="hidden xl:inline"> Supplied </span> (₹)
              </>
            ) : (
              "Debit (₹)"
            )
          }
          creditLabel={isLabourContractor ? "Paid (₹)" : "Credit (₹)"}
          currencyOrUnit="currency"
          onDateRangeChange={handleDateRangeChange}
          onSearchChange={handleSearchChange}
          loading={loading}
          showValueBalance={false}
          page={ledgerData.page || currentPage}
          totalPages={ledgerData.totalPages || 1}
          total={ledgerData.total || 0}
          onPageChange={handlePageChange}
          pdfReportType={isLabourContractor ? "labour_ledger" : "vendor_ledger"}
          pdfParams={{ contactId: vendorId }}
          contactName={vendor?.name}
          contactPhone={vendor?.phone}
          shareLinkType={isLabourContractor ? "labour_ledger" : "vendor_ledger"}
        />
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          Loading ledger...
        </div>
      )}
    </div>
  );
}
