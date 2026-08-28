"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { SaturdaySummaryCards } from "./SaturdaySummaryCards";
import { ClientDuesView } from "./ClientDuesView";
import { LabourDuesView } from "./LabourDuesView";
import { ClientPaymentSheet } from "./ClientPaymentSheet";
import { LabourPaymentSheet } from "./LabourPaymentSheet";

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

      <SaturdaySummaryCards
        totalClientDues={totalClientDues}
        totalLabourDues={totalLabourDues}
        netPicture={netPicture}
        clientDuesCount={clientDues.length}
        labourDuesCount={labourDues.length}
      />

      <ClientDuesView
        clientDues={clientDues}
        totalClientDues={totalClientDues}
        today={today}
        onOpenClientPayment={handleOpenClientPayment}
      />

      <LabourDuesView
        labourDues={labourDues}
        totalLabourDues={totalLabourDues}
        onOpenLabourPayment={handleOpenLabourPayment}
      />

      <ClientPaymentSheet
        open={clientSheetOpen}
        setOpen={setClientSheetOpen}
        selectedClientDue={selectedClientDue}
        clientPayAmount={clientPayAmount}
        setClientPayAmount={setClientPayAmount}
        saving={savingClient}
        successData={successClientData}
        setSuccessData={setSuccessClientData}
        onSave={handleSaveClientPayment}
        today={today}
      />

      <LabourPaymentSheet
        open={labourSheetOpen}
        setOpen={setLabourSheetOpen}
        selectedContractor={selectedContractor}
        labourPayAmount={labourPayAmount}
        setLabourPayAmount={setLabourPayAmount}
        saving={savingLabour}
        successData={successLabourData}
        setSuccessData={setSuccessLabourData}
        onSave={handleSaveLabourPayment}
        today={today}
      />
    </div>
  );
}
