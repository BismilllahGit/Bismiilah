"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, User, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { LedgerTable, LedgerRow } from "@/components/ui/ledger-table";
import { CreateInvoiceSheet } from "./CreateInvoiceSheet";
import { RecordPaymentSheet } from "./RecordPaymentSheet";

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

type PaymentPayload = {
  amount: number;
  date: string | null;
  method: string | null;
  note: string | undefined;
  invoiceId?: string;
  allocations?: { invoiceId: string; amount: number }[];
};

export type SuccessPaymentData = PaymentPayload & {
  id: string;
  clientName?: string;
  clientPhone?: string | null;
  projectName?: string;
  balance: number;
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
  const [successPaymentData, setSuccessPaymentData] =
    useState<SuccessPaymentData | null>(null);

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
    } catch {
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

    const payload: PaymentPayload = {
      amount,
      // These fields come from text/date/select inputs (never file inputs),
      // so FormDataEntryValue is always a string here.
      date: formData.get("date") as string | null,
      method: formData.get("method") as string | null,
      note: (formData.get("note") as string | null) || undefined,
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    } catch {
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
          <CreateInvoiceSheet
            invoiceOpen={invoiceOpen}
            setInvoiceOpen={setInvoiceOpen}
            clientName={client?.name}
            projects={projects}
            setProjects={setProjects}
            lineItems={lineItems}
            setLineItems={setLineItems}
            saving={saving}
            handleSaveInvoice={handleSaveInvoice}
          />

          {/* Record Payment Sheet */}
          <RecordPaymentSheet
            paymentOpen={paymentOpen}
            setPaymentOpen={setPaymentOpen}
            successPaymentData={successPaymentData}
            setSuccessPaymentData={setSuccessPaymentData}
            clientName={client?.name}
            handleSavePayment={handleSavePayment}
            paymentMode={paymentMode}
            setPaymentMode={setPaymentMode}
            selectedInvoiceId={selectedInvoiceId}
            setSelectedInvoiceId={setSelectedInvoiceId}
            paymentAmount={paymentAmount}
            setPaymentAmount={setPaymentAmount}
            allocations={allocations}
            setAllocations={setAllocations}
            unpaidInvoices={unpaidInvoices}
            saving={saving}
          />
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
