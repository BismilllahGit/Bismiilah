"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LedgerTable, LedgerRow } from "@/components/ui/ledger-table";
import { PageShell } from "@/components/ui/page-shell";
import { RecordLabourPaymentSheet } from "./RecordLabourPaymentSheet";
import { RecordTransactionSheet } from "./RecordTransactionSheet";

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

type TransactionPayload = {
  type: string | null;
  amount: number;
  date: string | null;
  description: string | undefined;
  projectId: string | undefined;
};

export type SuccessTxnData = TransactionPayload & {
  id: string;
  vendorName?: string;
  vendorPhone?: string | null;
  // Not set by this component's payload — kept optional so the sheet's
  // pre-existing `description || note` fallback continues to type-check.
  note?: string;
};

type LabourPaymentPayload = {
  amount: number;
  paymentDate: string | null;
  method: string;
  note: string | undefined;
};

export type SuccessLabourData = LabourPaymentPayload & {
  id: string;
  contractorName?: string;
  contractorPhone?: string | null;
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

  const [successTxnData, setSuccessTxnData] = useState<SuccessTxnData | null>(
    null,
  );
  const [successLabourData, setSuccessLabourData] =
    useState<SuccessLabourData | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: triggers this component's standard fetch-on-mount pattern
    fetchLedger("", "", undefined, 1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    // These fields come from text/radio/date/select inputs (never file
    // inputs), so FormDataEntryValue is always a string here.
    const payload: TransactionPayload = {
      type: formData.get("type") as string | null,
      amount: Number(formData.get("amount")),
      date: formData.get("date") as string | null,
      description: (formData.get("description") as string | null) || undefined,
      projectId: (formData.get("projectId") as string | null) || undefined,
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
    } catch {
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
    const payload: LabourPaymentPayload = {
      amount: Number(formData.get("amount")),
      paymentDate: formData.get("paymentDate") as string | null,
      method: (formData.get("method") as string | null) || "CASH",
      note: (formData.get("note") as string | null) || undefined,
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
    } catch {
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
    <PageShell>
      <Link
        href="/vendors"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Vendors & Contractors
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight wrap-break-word">
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
            <RecordLabourPaymentSheet
              paymentOpen={paymentOpen}
              setPaymentOpen={setPaymentOpen}
              successLabourData={successLabourData}
              setSuccessLabourData={setSuccessLabourData}
              vendorName={vendor?.name}
              handleSaveLabourPayment={handleSaveLabourPayment}
              saving={saving}
            />
          ) : (
            <RecordTransactionSheet
              open={open}
              setOpen={setOpen}
              successTxnData={successTxnData}
              setSuccessTxnData={setSuccessTxnData}
              projects={projects}
              setProjects={setProjects}
              vendorName={vendor?.name}
              handleSaveTransaction={handleSaveTransaction}
              saving={saving}
            />
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
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 wrap-break-word">
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
    </PageShell>
  );
}
