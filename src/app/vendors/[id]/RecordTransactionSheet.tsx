"use client";

import { Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";

type Project = { id: string; name: string };

export function RecordTransactionSheet({
  open,
  setOpen,
  successTxnData,
  setSuccessTxnData,
  projects,
  setProjects,
  vendorName,
  handleSaveTransaction,
  saving,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  successTxnData: any;
  setSuccessTxnData: React.Dispatch<React.SetStateAction<any>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  vendorName?: string;
  handleSaveTransaction: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
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
                Record a material purchase or a payment made to {vendorName}.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSaveTransaction} className="space-y-4 mt-6">
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
                  <label className="text-sm font-medium">Amount (₹) *</label>
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
                    defaultValue={new Date().toISOString().split("T")[0]}
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
                <label className="text-sm font-medium">Description</label>
                <input
                  name="description"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="Bill number, items..."
                />
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
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
  );
}
