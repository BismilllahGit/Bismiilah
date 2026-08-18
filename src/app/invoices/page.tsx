"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, ReceiptIndianRupee, IndianRupee, Trash2, Eye, CheckCircle2, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";
import { cn } from "@/lib/utils";

type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Invoice = {
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successPaymentData, setSuccessPaymentData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);

  const fetchData = async () => {
    setLoading(true);
    const [invRes, cliRes, projRes] = await Promise.all([
      fetch("/api/invoices"),
      fetch("/api/clients"),
      fetch("/api/projects")
    ]);
    if (invRes.ok) setInvoices(await invRes.json());
    if (cliRes.ok) setClients(await cliRes.json());
    if (projRes.ok) setProjects(await projRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }
    
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      clientId: formData.get("clientId"),
      projectId: formData.get("projectId"),
      date: formData.get("date"),
      details: formData.get("details") || undefined,
      lineItems: lineItems.map(li => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice)
      }))
    };

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
        fetchData();
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
    if (!selectedInvoice) return;
    
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      amount: Number(formData.get("amount")),
      date: formData.get("date"),
      method: formData.get("method"),
      note: formData.get("note") || undefined,
    };

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdTxn = await res.json();
        const totalPaidBefore = selectedInvoice.clientPayments.reduce((a, p) => a + Number(p.amount), 0) + selectedInvoice.paymentAllocations.reduce((a, p) => a + Number(p.allocatedAmount), 0);
        const balanceAfter = Number(selectedInvoice.amount) - (totalPaidBefore + payload.amount);
        
        setSuccessPaymentData({
          ...payload,
          id: createdTxn.id,
          clientName: selectedInvoice.client.name,
          clientPhone: selectedInvoice.client.phone,
          projectName: selectedInvoice.project.name,
          balance: balanceAfter > 0 ? balanceAfter : 0,
        });
        fetchData();
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

  const handleChangeStatus = async (status: string, voidReason?: string) => {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, voidReason }),
      });
      if (res.ok) {
        fetchData();
        setDetailOpen(false);
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleVoidInvoice = () => {
    const reason = prompt("Enter reason for voiding this invoice:");
    if (reason) {
      handleChangeStatus("VOID", reason);
    }
  };

  const totalReceivables = invoices
    .filter(i => i.status !== "VOID" && i.status !== "PAID")
    .reduce((acc, curr) => {
      const directPaid = curr.clientPayments.reduce((pAcc, p) => pAcc + Number(p.amount), 0);
      const allocatedPaid = curr.paymentAllocations.reduce((pAcc, p) => pAcc + Number(p.allocatedAmount), 0);
      const paid = directPaid + allocatedPaid;
      return acc + (Number(curr.amount) - paid);
    }, 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts Receivable</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client invoices and incoming payments.</p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="h-4 w-4" /> Create Invoice
          </SheetTrigger>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Generate Invoice</SheetTitle>
              <SheetDescription>Bill a client for a specific project with detailed line items.</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSaveInvoice} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client *</label>
                  <select name="clientId" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="">Select Client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project *</label>
                  <select name="projectId" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="">Select Project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Issued Date *</label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
              </div>

              <div className="border rounded-md p-4 space-y-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold">Line Items</label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }])}>
                    <Plus className="h-4 w-4 mr-1" /> Add Row
                  </Button>
                </div>
                {lineItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <input 
                        required placeholder="Description" 
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].description = e.target.value;
                          setLineItems(newItems);
                        }}
                      />
                    </div>
                    <div className="w-20">
                      <input 
                        type="number" min="0.01" step="any" required placeholder="Qty" 
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].quantity = Number(e.target.value);
                          setLineItems(newItems);
                        }}
                      />
                    </div>
                    <div className="w-28">
                      <input 
                        type="number" min="0" step="0.01" required placeholder="Price" 
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].unitPrice = Number(e.target.value);
                          setLineItems(newItems);
                        }}
                      />
                    </div>
                    <Button 
                      type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500"
                      onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-right font-bold pt-2 border-t mt-2">
                  Total: ₹{lineItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toLocaleString()}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Internal Notes</label>
                <textarea name="details" rows={2} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" placeholder="Milestone 1, extra work..." />
              </div>

              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create Invoice"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="mb-6 w-full max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Receivables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">₹{totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </CardContent>
      </Card>

      {/* Mobile & Tablet Stacked Card View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
            <ReceiptIndianRupee className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm font-medium">No invoices generated yet.</p>
          </div>
        ) : (
          invoices.map((inv) => {
            const totalPaid = inv.clientPayments.reduce((acc, p) => acc + Number(p.amount), 0) + inv.paymentAllocations.reduce((acc, p) => acc + Number(p.allocatedAmount), 0);
            const balance = Number(inv.amount) - totalPaid;
            
            return (
              <div key={inv.id} className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{new Date(inv.issuedDate).toLocaleDateString()}</span>
                  </div>
                  <Badge variant={inv.status === "PAID" ? "default" : inv.status === "SENT" ? "secondary" : "outline"} 
                         className={cn("text-xs font-bold", inv.status === "PAID" ? "bg-green-600 text-white" : inv.status === "SENT" ? "bg-blue-100 text-blue-800 border-blue-200" : inv.status === "VOID" ? "bg-red-100 text-red-800 border-red-200" : "")}>
                    {inv.status}
                  </Badge>
                </div>

                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 text-base break-words">{inv.client.name}</h3>
                  <p className="text-xs font-medium text-slate-500">{inv.project.name}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">Total</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5">₹{Number(inv.amount).toLocaleString()}</span>
                  </div>
                  <div className="bg-green-50/70 rounded-lg p-2 text-center border border-green-100/80 flex flex-col justify-center">
                    <span className="text-green-700 text-[10px] uppercase font-semibold">Paid</span>
                    <span className="font-mono font-bold text-green-700 text-sm mt-0.5">₹{totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="bg-orange-50/70 rounded-lg p-2 text-center border border-orange-100/80 flex flex-col justify-center">
                    <span className="text-orange-700 text-[10px] uppercase font-semibold">Due Balance</span>
                    <span className="font-mono font-bold text-orange-700 text-sm sm:text-base mt-0.5">₹{balance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  {inv.status !== "PAID" && inv.status !== "VOID" && (
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(inv); setPaymentOpen(true); }} className="flex-1 font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 h-9 border border-green-200/60">
                      <IndianRupee className="h-4 w-4 mr-1" /> Record Pay
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setSelectedInvoice(inv); setDetailOpen(true); }} className="flex-1 font-semibold h-9 shadow-sm">
                    <Eye className="h-4 w-4 mr-1.5" /> View Details
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
              <TableHead className="w-[140px] font-semibold text-slate-700">Invoice #</TableHead>
              <TableHead className="font-semibold text-slate-700">Date</TableHead>
              <TableHead className="font-semibold text-slate-700">Client & Project</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Total Amount</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Paid</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Balance Due</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading invoices...</TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <ReceiptIndianRupee className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                  <p className="text-muted-foreground font-medium">No invoices generated yet.</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const totalPaid = inv.clientPayments.reduce((acc, p) => acc + Number(p.amount), 0) + inv.paymentAllocations.reduce((acc, p) => acc + Number(p.allocatedAmount), 0);
                const balance = Number(inv.amount) - totalPaid;
                
                return (
                  <TableRow key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-mono text-sm font-bold text-slate-900">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap text-slate-600">
                      {new Date(inv.issuedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800">{inv.client.name}</div>
                      <div className="text-xs text-muted-foreground">{inv.project.name}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-900">
                      ₹{Number(inv.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600 font-semibold">
                      ₹{totalPaid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-orange-600">
                      ₹{balance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={inv.status === "PAID" ? "default" : inv.status === "SENT" ? "secondary" : "outline"} 
                             className={cn("text-xs font-semibold", inv.status === "PAID" ? "bg-green-600 text-white" : inv.status === "SENT" ? "bg-blue-100 text-blue-800 border-blue-200" : inv.status === "VOID" ? "bg-red-100 text-red-800 border-red-200" : "")}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {inv.status !== "PAID" && inv.status !== "VOID" && (
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(inv); setPaymentOpen(true); }} className="text-green-700 hover:text-green-800 hover:bg-green-50/80 font-semibold">
                            <IndianRupee className="h-4 w-4 mr-1" /> Pay
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { setSelectedInvoice(inv); setDetailOpen(true); }} className="font-semibold shadow-sm">
                          <Eye className="h-4 w-4 mr-1.5" /> View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedInvoice && (
            <>
              <SheetHeader>
                <SheetTitle>Invoice {selectedInvoice.invoiceNumber}</SheetTitle>
                <SheetDescription>
                  Details for {selectedInvoice.client.name} - {selectedInvoice.project.name}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-md">
                  <div>
                    <span className="text-muted-foreground">Issued Date:</span><br/>
                    <span className="font-medium">{new Date(selectedInvoice.issuedDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date:</span><br/>
                    <span className="font-medium">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span><br/>
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
                    {selectedInvoice.lineItems?.map(li => (
                      <div key={li.id} className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1.5 text-xs">
                        <div className="font-semibold text-slate-900 text-sm break-words">{li.description}</div>
                        <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                          <span className="font-mono">{Number(li.quantity)} x ₹{Number(li.unitPrice).toLocaleString()}</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">₹{Number(li.total).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden sm:block border rounded-md overflow-hidden">
                    <Table className="min-w-[450px]">
                      <TableHeader className="bg-slate-50 text-xs">
                        <TableRow>
                          <TableHead className="w-[220px] font-semibold text-slate-700">Description</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700">Qty</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700">Price</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.lineItems?.map(li => (
                          <TableRow key={li.id}>
                            <TableCell className="font-medium text-slate-800">{li.description}</TableCell>
                            <TableCell className="text-right text-slate-600">{Number(li.quantity)}</TableCell>
                            <TableCell className="text-right font-mono text-slate-600">₹{Number(li.unitPrice).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900">₹{Number(li.total).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="text-right mt-2 text-lg font-bold">
                    Grand Total: ₹{Number(selectedInvoice.amount).toLocaleString()}
                  </div>
                </div>

                {selectedInvoice.clientPayments.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-2">Payment History</h3>
                    <div className="space-y-2 text-sm">
                      {selectedInvoice.clientPayments.map((p, idx) => (
                        <div key={idx} className="flex justify-between border-b pb-1">
                          <span>{new Date(p.paymentDate).toLocaleDateString()} - {p.method}</span>
                          <span className="text-green-600 font-medium">₹{Number(p.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedInvoice.status !== "VOID" && (
                  <div className="border-t pt-4 flex flex-wrap gap-2 mt-4">
                    {selectedInvoice.status === "DRAFT" && (
                      <Button onClick={() => handleChangeStatus("SENT")} disabled={saving} className="w-full sm:w-auto">
                        Mark as Sent
                      </Button>
                    )}
                    <Button variant="destructive" onClick={handleVoidInvoice} disabled={saving} className="w-full sm:w-auto">
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
      <Sheet open={paymentOpen} onOpenChange={(open) => {
        setPaymentOpen(open);
        if (!open) setTimeout(() => setSuccessPaymentData(null), 300);
      }}>
        <SheetContent className="sm:max-w-md">
          {successPaymentData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <h3 className="text-xl font-bold text-slate-800">Payment Recorded!</h3>
              <p className="text-slate-500 text-center text-sm px-4">
                Successfully logged ₹{successPaymentData.amount.toLocaleString()} for {successPaymentData.projectName}.
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
                <Button variant="outline" className="w-full font-bold h-11 shadow-sm" onClick={() => setPaymentOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Log Payment Received</SheetTitle>
                <SheetDescription>
                  Record an incoming payment for {selectedInvoice?.client.name}.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSavePayment} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Received (₹) *</label>
                  <input name="amount" type="number" step="0.01" min="1" 
                    max={selectedInvoice ? Number(selectedInvoice.amount) - (selectedInvoice.clientPayments.reduce((a,p)=>a+Number(p.amount),0) + selectedInvoice.paymentAllocations.reduce((a,p)=>a+Number(p.allocatedAmount),0)) : undefined} 
                    required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" 
                    defaultValue={selectedInvoice ? Number(selectedInvoice.amount) - (selectedInvoice.clientPayments.reduce((a,p)=>a+Number(p.amount),0) + selectedInvoice.paymentAllocations.reduce((a,p)=>a+Number(p.allocatedAmount),0)) : ""} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date *</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <select name="method" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Note / Ref No</label>
                  <input name="note" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="Txn ID..." />
                </div>
                <SheetFooter className="mt-6">
                  <SheetClose render={<Button variant="outline" type="button" onClick={() => setSelectedInvoice(null)} />}>
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
  );
}
