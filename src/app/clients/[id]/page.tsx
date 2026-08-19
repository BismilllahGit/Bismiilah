"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  IndianRupee,
  Trash2,
  User,
  Phone,
  MapPin,
} from "lucide-react";
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

type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  issuedDate: string;
  status: string;
  project: { name: string };
  clientPayments?: { amount: number }[];
  paymentAllocations?: { allocatedAmount: number }[];
};

type Client = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  invoices: Invoice[];
};

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

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [client, setClient] = useState<Client | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successPaymentData, setSuccessPaymentData] = useState<any>(null);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [currentStart, setCurrentStart] = useState("");
  const [currentEnd, setCurrentEnd] = useState("");

  // Create Invoice State
  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  // Record Payment State
  const [paymentMode, setPaymentMode] = useState<"SINGLE" | "MULTI">("SINGLE");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearch, setCurrentSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const fetchClientAndProjects = async () => {
    const cliRes = await fetch(`/api/clients/${clientId}`);
    if (cliRes.ok) setClient(await cliRes.json());
  };

  const fetchLedger = async (
    start = currentStart,
    end = currentEnd,
    p = currentPage,
    search = currentSearch,
  ) => {
    setLoading(true);
    let url = `/api/clients/${clientId}/ledger`;
    const query = new URLSearchParams();
    if (start) query.append("startDate", start);
    if (end) query.append("endDate", end);
    if (search) query.append("search", search);
    query.append("page", p.toString());
    query.append("limit", "50");
    url += `?${query.toString()}`;

    const res = await fetch(url);
    if (res.ok) {
      setLedgerData(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientAndProjects();
    fetchLedger();
  }, [clientId]);

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      clientId: clientId,
      projectId: formData.get("projectId"),
      date: formData.get("date"),
      details: formData.get("details") || undefined,
      lineItems: lineItems.map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
      })),
    };

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setInvoiceOpen(false);
        setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
        fetchClientAndProjects();
        fetchLedger();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create invoice");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));

    const payload: any = {
      amount,
      date: formData.get("date"),
      method: formData.get("method"),
      note: formData.get("note") || undefined,
    };

    if (paymentMode === "SINGLE") {
      if (!selectedInvoiceId) {
        alert("Please select an invoice.");
        setSaving(false);
        return;
      }
      payload.invoiceId = selectedInvoiceId;
    } else {
      const allocs = Object.entries(allocations)
        .filter(([_, val]) => val && Number(val) > 0)
        .map(([invId, val]) => ({ invoiceId: invId, amount: Number(val) }));

      const sumAllocated = allocs.reduce((sum, a) => sum + a.amount, 0);
      if (sumAllocated > amount) {
        alert("Allocations cannot exceed the total payment amount.");
        setSaving(false);
        return;
      }

      if (allocs.length > 0) {
        payload.allocations = allocs;
      }
    }

    try {
      const res = await fetch(`/api/clients/${clientId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdTxn = await res.json();
        setSuccessPaymentData({
          ...payload,
          id: createdTxn.id,
          clientName: client?.name,
          clientPhone: client?.phone,
          projectName:
            paymentMode === "SINGLE" && selectedInvoiceId
              ? client?.invoices.find((i) => i.id === selectedInvoiceId)
                  ?.project?.name
              : "Multiple Projects/Advance",
          balance: ledgerData ? ledgerData.closingBalance - payload.amount : 0,
        });
        setSelectedInvoiceId("");
        setPaymentAmount("");
        setAllocations({});
        fetchClientAndProjects();
        fetchLedger();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log payment");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setCurrentStart(start);
    setCurrentEnd(end);
    setCurrentPage(1);
    fetchLedger(start, end, 1, currentSearch);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchLedger(currentStart, currentEnd, newPage, currentSearch);
  };

  const handleSearchChange = (search: string) => {
    setCurrentSearch(search);
    setCurrentPage(1);
    fetchLedger(currentStart, currentEnd, 1, search);
  };

  const formatCurrency = (val: number) => {
    return `₹${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const unpaidInvoices =
    client?.invoices?.filter(
      (i) => i.status !== "VOID" && i.status !== "PAID",
    ) || [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Clients
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {client?.name || "Loading..."}
            </h1>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
            {client?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 shrink-0" /> {client.phone}
              </div>
            )}
            {client?.address && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 shrink-0" />{" "}
                <span className="break-words">{client.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Create Invoice Sheet */}
          <Sheet
            open={invoiceOpen}
            onOpenChange={(open) => {
              setInvoiceOpen(open);
              if (open && projects.length === 0) {
                fetch("/api/projects").then((r) => {
                  if (r.ok) r.json().then(setProjects);
                });
              }
            }}
          >
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                />
              }
            >
              <Plus className="h-4 w-4" /> Create Invoice
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl overflow-y-auto p-4">
              <SheetHeader className="p-0">
                <SheetTitle>Generate Invoice</SheetTitle>
                <SheetDescription>
                  Bill {client?.name} for a specific project.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSaveInvoice} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project *</label>
                  <select
                    name="projectId"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Issued Date *</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>

                <div className="border rounded-md p-4 space-y-3 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold">Line Items</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLineItems([
                          ...lineItems,
                          { description: "", quantity: 1, unitPrice: 0 },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Row
                    </Button>
                  </div>
                  {lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-start gap-2"
                    >
                      {/* <div className="flex-1"> */}
                      <input
                        required
                        placeholder="Description"
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].description = e.target.value;
                          setLineItems(newItems);
                        }}
                      />
                      {/* </div> */}
                      <div className="flex flex-row gap-x-4">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          required
                          placeholder="Qty"
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...lineItems];
                            newItems[index].quantity = Number(e.target.value);
                            setLineItems(newItems);
                          }}
                        />
                        {/* </div> */}
                        {/* <div className="w-28"> */}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="Price"
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newItems = [...lineItems];
                            newItems[index].unitPrice = Number(e.target.value);
                            setLineItems(newItems);
                          }}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500"
                          onClick={() =>
                            setLineItems(
                              lineItems.filter((_, i) => i !== index),
                            )
                          }
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right font-bold pt-2 border-t mt-2">
                    Total: ₹
                    {lineItems
                      .reduce(
                        (acc, curr) => acc + curr.quantity * curr.unitPrice,
                        0,
                      )
                      .toLocaleString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Internal Notes</label>
                  <textarea
                    name="details"
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    placeholder="Milestone 1, extra work..."
                  />
                </div>

                <SheetFooter className="mt-6">
                  <SheetClose
                    render={<Button variant="outline" type="button" />}
                  >
                    Cancel
                  </SheetClose>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Create Invoice"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>

          {/* Record Payment Sheet */}
          <Sheet
            open={paymentOpen}
            onOpenChange={(open) => {
              setPaymentOpen(open);
              if (!open) setTimeout(() => setSuccessPaymentData(null), 300);
            }}
          >
            <SheetTrigger
              render={
                <Button className="flex items-center justify-center gap-2 flex-1 sm:flex-initial" />
              }
            >
              <IndianRupee className="h-4 w-4" /> Record Payment
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto p-4">
              {successPaymentData ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                  <h3 className="text-xl font-bold text-slate-800">
                    Payment Recorded!
                  </h3>
                  <p className="text-slate-500 text-center text-sm px-4">
                    Successfully logged ₹
                    {successPaymentData.amount.toLocaleString()} for{" "}
                    {successPaymentData.projectName}.
                  </p>
                  <div className="pt-6 w-full space-y-3">
                    <ShareViaWhatsAppButton
                      phone={successPaymentData.clientPhone}
                      message={`Hi ${successPaymentData.clientName}, I've received your payment of ₹${successPaymentData.amount} on ${new Date(successPaymentData.date).toLocaleDateString()} for ${successPaymentData.projectName}. Thank you! — Bismillah Construction`}
                      onShare={() => setPaymentOpen(false)}
                      className="w-full font-bold h-11"
                      size="lg"
                      logType="CLIENT_RECEIPT"
                      referenceId={successPaymentData.id || "unknown"}
                      referenceType="ClientPayment"
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
                    <SheetTitle>Record Payment Received</SheetTitle>
                    <SheetDescription>
                      Log incoming funds from {client?.name}.
                    </SheetDescription>
                  </SheetHeader>
                  <form onSubmit={handleSavePayment} className="space-y-4 mt-6">
                    <div className="space-y-3 bg-slate-50 p-3 rounded-md border">
                      <label className="text-sm font-bold block mb-2">
                        Payment Allocation Mode
                      </label>
                      <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          checked={paymentMode === "SINGLE"}
                          onChange={() => {
                            setPaymentMode("SINGLE");
                            setAllocations({});
                          }}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-semibold">
                            Pay against specific invoice
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Link payment directly to one invoice.
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 text-sm cursor-pointer mt-2">
                        <input
                          type="radio"
                          name="mode"
                          checked={paymentMode === "MULTI"}
                          onChange={() => {
                            setPaymentMode("MULTI");
                            setSelectedInvoiceId("");
                          }}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-semibold">
                            Advance / Split Payment
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Record advance funds or split payment across
                            multiple invoices.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Total Amount Received (₹) *
                      </label>
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-bold text-lg"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    {paymentMode === "SINGLE" && (
                      <div className="space-y-2 border-l-2 border-blue-500 pl-3 py-2">
                        <label className="text-sm font-medium">
                          Select Invoice *
                        </label>
                        <select
                          required
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={selectedInvoiceId}
                          onChange={(e) => setSelectedInvoiceId(e.target.value)}
                        >
                          <option value="">
                            -- Choose an unpaid invoice --
                          </option>
                          {unpaidInvoices.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} - ₹
                              {Number(inv.amount).toLocaleString()} (
                              {inv.project?.name || "No Project"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {paymentMode === "MULTI" && unpaidInvoices.length > 0 && (
                      <div className="space-y-2 border-l-2 border-blue-500 pl-3 py-2">
                        <label className="text-sm font-medium block">
                          Allocate to Invoices (Optional)
                        </label>
                        <div className="text-xs text-muted-foreground mb-3">
                          Any unallocated amount will remain as an advance
                          credit on the ledger.
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {unpaidInvoices.map((inv) => {
                            const directPaid =
                              inv.clientPayments?.reduce(
                                (acc, p) => acc + Number(p.amount),
                                0,
                              ) || 0;
                            const allocatedPaid =
                              inv.paymentAllocations?.reduce(
                                (acc, p) => acc + Number(p.allocatedAmount),
                                0,
                              ) || 0;
                            const balance =
                              Number(inv.amount) - (directPaid + allocatedPaid);

                            return (
                              <div
                                key={inv.id}
                                className="flex items-center gap-2 text-sm bg-white p-2 border rounded-md"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {inv.invoiceNumber}
                                  </div>
                                  <div className="text-xs text-orange-600">
                                    Due: ₹
                                    {balance.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={balance}
                                  placeholder="Amount"
                                  className="w-24 h-8 rounded border px-2 text-right text-xs"
                                  value={allocations[inv.id] || ""}
                                  onChange={(e) =>
                                    setAllocations((prev) => ({
                                      ...prev,
                                      [inv.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date *</label>
                        <input
                          name="date"
                          type="date"
                          required
                          defaultValue={new Date().toISOString().split("T")[0]}
                          className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Payment Method
                        </label>
                        <select
                          name="method"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="CASH">Cash</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Note / Ref No
                      </label>
                      <input
                        name="note"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        placeholder="Txn ID, etc..."
                      />
                    </div>

                    <SheetFooter className="mt-6">
                      <SheetClose
                        render={<Button variant="outline" type="button" />}
                      >
                        Cancel
                      </SheetClose>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Processing..." : "Confirm Payment"}
                      </Button>
                    </SheetFooter>
                  </form>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {ledgerData && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Outstanding Balance
            </h3>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 break-all">
                {formatCurrency(ledgerData.closingBalance)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                {ledgerData.closingBalance >= 0
                  ? "(Receivable)"
                  : "(Payable/Advance)"}
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
          debitLabel="Invoiced (₹)"
          creditLabel="Received (₹)"
          currencyOrUnit="currency"
          onDateRangeChange={handleDateRangeChange}
          onSearchChange={handleSearchChange}
          loading={loading}
          page={ledgerData.page || currentPage}
          totalPages={ledgerData.totalPages || 1}
          total={ledgerData.total || 0}
          onPageChange={handlePageChange}
          pdfReportType="client_ledger"
          pdfParams={{ contactId: clientId }}
          contactName={client?.name}
          contactPhone={client?.phone}
          shareLinkType="client_ledger"
        />
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          Loading ledger...
        </div>
      )}
    </div>
  );
}
