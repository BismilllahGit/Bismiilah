"use client";

import { useState } from "react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";
import { PageShell } from "@/components/ui/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceFormSheet } from "./InvoiceFormSheet";
import { InvoicesMobileList } from "./InvoicesMobileList";
import { InvoicesDesktopTable } from "./InvoicesDesktopTable";

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
  status: string;
  notes: string | null;
  voidReason: string | null;
  client: { name: string; phone: string | null };
  project: { name: string };
  clientPayments: { amount: number; paymentDate: string; method: string }[];
  paymentAllocations: { allocatedAmount: number }[];
  lineItems: InvoiceLineItem[];
};

type InvoicePaymentPayload = {
  amount: number;
  date: string | null;
  method: string | null;
  note: string | undefined;
};

type SuccessInvoicePaymentData = InvoicePaymentPayload & {
  id: string;
  clientName: string;
  clientPhone: string | null;
  projectName: string;
  balance: number;
};

export default function InvoicesPage() {
  const {
    data: invoicesData,
    loading: invoicesLoading,
    refetch: refetchInvoices,
  } = useApiResource<Invoice[]>("/api/invoices");
  const { data: clientsData, loading: clientsLoading } =
    useApiResource<{ id: string; name: string }[]>("/api/clients");
  const { data: projectsData, loading: projectsLoading } =
    useApiResource<{ id: string; name: string }[]>("/api/projects");

  const invoices = invoicesData || [];
  const clients = clientsData || [];
  const projects = projectsData || [];
  const loading = invoicesLoading || clientsLoading || projectsLoading;

  const createInvoice = useApiMutation<Record<string, unknown>, Invoice>(
    "POST",
  );
  const recordPayment = useApiMutation<
    Record<string, unknown>,
    { id: string }
  >("POST");
  const changeInvoiceStatus = useApiMutation<Record<string, unknown>, Invoice>(
    "PATCH",
  );
  const saving =
    createInvoice.mutating ||
    recordPayment.mutating ||
    changeInvoiceStatus.mutating;

  const [successPaymentData, setSuccessPaymentData] =
    useState<SuccessInvoicePaymentData | null>(null);
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const payload = {
      clientId: formData.get("clientId"),
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
      await createInvoice.mutate("/api/invoices", payload);
      setOpen(false);
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      refetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const formData = new FormData(e.currentTarget);
    const payload: InvoicePaymentPayload = {
      amount: Number(formData.get("amount")),
      // These fields come from text/date/select inputs (never file inputs),
      // so FormDataEntryValue is always a string here.
      date: formData.get("date") as string | null,
      method: formData.get("method") as string | null,
      note: (formData.get("note") as string | null) || undefined,
    };

    try {
      const createdTxn = await recordPayment.mutate(
        `/api/invoices/${selectedInvoice.id}/payments`,
        payload,
      );
      const totalPaidBefore =
        selectedInvoice.clientPayments.reduce(
          (a, p) => a + Number(p.amount),
          0,
        ) +
        selectedInvoice.paymentAllocations.reduce(
          (a, p) => a + Number(p.allocatedAmount),
          0,
        );
      const balanceAfter =
        Number(selectedInvoice.amount) - (totalPaidBefore + payload.amount);

      setSuccessPaymentData({
        ...payload,
        id: createdTxn.id,
        clientName: selectedInvoice.client.name,
        clientPhone: selectedInvoice.client.phone,
        projectName: selectedInvoice.project.name,
        balance: balanceAfter > 0 ? balanceAfter : 0,
      });
      refetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to log payment");
    }
  };

  const handleChangeStatus = async (status: string, voidReason?: string) => {
    if (!selectedInvoice) return;
    try {
      await changeInvoiceStatus.mutate(`/api/invoices/${selectedInvoice.id}`, {
        status,
        voidReason,
      });
      refetchInvoices();
      setDetailOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleVoidInvoice = () => {
    const reason = prompt("Enter reason for voiding this invoice:");
    if (reason) {
      handleChangeStatus("VOID", reason);
    }
  };

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentOpen(true);
  };

  const handleOpenDetail = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setDetailOpen(true);
  };

  const totalReceivables = invoices
    .filter((i) => i.status !== "VOID" && i.status !== "PAID")
    .reduce((acc, curr) => {
      const directPaid = curr.clientPayments.reduce(
        (pAcc, p) => pAcc + Number(p.amount),
        0,
      );
      const allocatedPaid = curr.paymentAllocations.reduce(
        (pAcc, p) => pAcc + Number(p.allocatedAmount),
        0,
      );
      const paid = directPaid + allocatedPaid;
      return acc + (Number(curr.amount) - paid);
    }, 0);

  return (
    <PageShell>
      <PageHeader
        title="Accounts Receivable"
        subtitle="Manage client invoices and incoming payments."
        action={
          <InvoiceFormSheet
            open={open}
            onOpenChange={setOpen}
            clients={clients}
            projects={projects}
            lineItems={lineItems}
            setLineItems={setLineItems}
            saving={saving}
            onSubmit={handleSaveInvoice}
          />
        }
      />

      <Card className="mb-6 w-full max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pending Receivables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            ₹
            {totalReceivables.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </CardContent>
      </Card>

      <InvoicesMobileList
        invoices={invoices}
        loading={loading}
        onOpenPayment={handleOpenPayment}
        onOpenDetail={handleOpenDetail}
      />

      <InvoicesDesktopTable
        invoices={invoices}
        loading={loading}
        onOpenPayment={handleOpenPayment}
        onOpenDetail={handleOpenDetail}
      />

      {/* Invoice Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto p-4 lg:min-w-2xl">
          {selectedInvoice && (
            <>
              <SheetHeader className="p-0">
                <SheetTitle>Invoice {selectedInvoice.invoiceNumber}</SheetTitle>
                <SheetDescription>
                  Details for {selectedInvoice.client.name} -{" "}
                  {selectedInvoice.project.name}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-md">
                  <div>
                    <span className="text-muted-foreground">Issued Date:</span>
                    <br />
                    <span className="font-medium">
                      {new Date(
                        selectedInvoice.issuedDate,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>
                    <br />
                    <span className="font-medium">
                      {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-row w-full gap-x-1 items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <br />
                    <Badge variant="outline">{selectedInvoice.status}</Badge>
                  </div>
                  {selectedInvoice.voidReason && (
                    <div className="col-span-2 bg-red-50 p-2 rounded text-red-800">
                      <strong>Void Reason:</strong> {selectedInvoice.voidReason}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-bold mb-2">Line Items</h3>
                  <div className="sm:hidden space-y-2">
                    {selectedInvoice.lineItems?.map((li) => (
                      <div
                        key={li.id}
                        className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1.5 text-xs"
                      >
                        <div className="font-semibold text-slate-900 text-sm break-words">
                          {li.description}
                        </div>
                        <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                          <span className="font-mono">
                            {Number(li.quantity)} x ₹
                            {Number(li.unitPrice).toLocaleString()}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ₹{Number(li.total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden sm:block border rounded-md overflow-hidden">
                    <Table className="min-w-[450px] mb-3">
                      <TableHeader className="bg-slate-50 text-xs">
                        <TableRow>
                          <TableHead className="w-[220px] font-semibold text-slate-700">
                            Description
                          </TableHead>
                          <TableHead className="text-right font-semibold text-slate-700">
                            Qty
                          </TableHead>
                          <TableHead className="text-right font-semibold text-slate-700">
                            Price
                          </TableHead>
                          <TableHead className="text-right font-semibold text-slate-700">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.lineItems?.map((li) => (
                          <TableRow key={li.id}>
                            <TableCell className="font-medium text-slate-800">
                              {li.description}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {Number(li.quantity)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-600">
                              ₹{Number(li.unitPrice).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900">
                              ₹{Number(li.total).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="text-right mt-2 text-lg font-bold">
                    Grand Total: ₹
                    {Number(selectedInvoice.amount).toLocaleString()}
                  </div>
                </div>

                {selectedInvoice.clientPayments.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-2">Payment History</h3>
                    <div className="space-y-2 text-sm">
                      {selectedInvoice.clientPayments.map((p, idx) => (
                        <div key={idx} className="flex justify-between pb-1">
                          <span>
                            {new Date(p.paymentDate).toLocaleDateString()} -{" "}
                            {p.method}
                          </span>
                          <span className="text-green-600 font-medium">
                            ₹{Number(p.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedInvoice.status !== "VOID" && (
                  <div className="border-t pt-4 flex flex-wrap gap-2 mt-4">
                    {selectedInvoice.status === "DRAFT" && (
                      <Button
                        onClick={() => handleChangeStatus("SENT")}
                        disabled={saving}
                        className="w-full sm:w-auto"
                      >
                        Mark as Sent
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={handleVoidInvoice}
                      disabled={saving}
                      className="w-full sm:w-auto"
                    >
                      Void Invoice
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Sheet */}
      <Sheet
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) setTimeout(() => setSuccessPaymentData(null), 300);
        }}
      >
        <SheetContent className="sm:max-w-md p-4">
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
                  message={`Hi ${successPaymentData.clientName}, I've received your payment of ₹${successPaymentData.amount} on ${new Date(successPaymentData.date ?? "").toLocaleDateString()} for ${successPaymentData.projectName}. Thank you! — Bismillah Construction`}
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
                <SheetTitle>Log Payment Received</SheetTitle>
                <SheetDescription>
                  Record an incoming payment for {selectedInvoice?.client.name}.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSavePayment} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Amount Received (₹) *
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    max={
                      selectedInvoice
                        ? Number(selectedInvoice.amount) -
                          (selectedInvoice.clientPayments.reduce(
                            (a, p) => a + Number(p.amount),
                            0,
                          ) +
                            selectedInvoice.paymentAllocations.reduce(
                              (a, p) => a + Number(p.allocatedAmount),
                              0,
                            ))
                        : undefined
                    }
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue={
                      selectedInvoice
                        ? Number(selectedInvoice.amount) -
                          (selectedInvoice.clientPayments.reduce(
                            (a, p) => a + Number(p.amount),
                            0,
                          ) +
                            selectedInvoice.paymentAllocations.reduce(
                              (a, p) => a + Number(p.allocatedAmount),
                              0,
                            ))
                        : ""
                    }
                  />
                </div>
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
                  <label className="text-sm font-medium">Payment Method</label>
                  <select
                    name="method"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="BANK_TRANSFER">
                      Bank Transfer (NEFT/RTGS/IMPS)
                    </option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Note / Ref No</label>
                  <input
                    name="note"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="Txn ID..."
                  />
                </div>
                <SheetFooter className="mt-6">
                  <SheetClose
                    render={
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setSelectedInvoice(null)}
                      />
                    }
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
    </PageShell>
  );
}
