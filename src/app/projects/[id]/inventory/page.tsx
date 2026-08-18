"use client";

import { useEffect, useState, use } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, PackageOpen, ArrowRightLeft } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { LedgerTable } from "@/components/ui/ledger-table";

type Item = { id: string; name: string; unit: string; unitCost: number };
type InventoryBalance = {
  id: string;
  itemId: string;
  qtyBought: number;
  qtyIssued: number;
  qtyReturned: number;
  qtyTransferredIn: number;
  qtyTransferredOut: number;
  item: Item;
};

export default function ProjectInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  
  const [inventory, setInventory] = useState<InventoryBalance[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [savingTxn, setSavingTxn] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Combobox state for Transaction
  const [itemName, setItemName] = useState("");
  const [itemCost, setItemCost] = useState("");

  // Ledger state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [currentStart, setCurrentStart] = useState("");
  const [currentEnd, setCurrentEnd] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [invRes, itemRes, projRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/inventory`),
      fetch('/api/items'),
      fetch('/api/projects')
    ]);
    if (invRes.ok) setInventory(await invRes.json());
    if (itemRes.ok) setItems(await itemRes.json());
    if (projRes.ok) {
      const allProjs = await projRes.json();
      setProjects(allProjs.filter((p: any) => p.id !== projectId && p.status === "ACTIVE"));
    }
    setLoading(false);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearch, setCurrentSearch] = useState("");

  const fetchLedger = async (itemId: string, start = currentStart, end = currentEnd, p = currentPage, search = currentSearch) => {
    setLedgerLoading(true);
    let url = `/api/projects/${projectId}/inventory/${itemId}/ledger`;
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
    setLedgerLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // Handle auto-fill cost when typing/selecting item name
  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setItemName(val);
    const found = items.find(i => i.name.toLowerCase() === val.toLowerCase());
    if (found) {
      setItemCost(found.unitCost.toString());
    }
  };

  const handleLogTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingTxn(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      itemName: itemName, // send string, backend handles lookup/creation
      type: formData.get("type"),
      quantity: Number(formData.get("quantity")),
      unitCost: Number(itemCost || formData.get("unitCost")),
      date: formData.get("date"),
      note: formData.get("note") || undefined,
    };

    try {
      const res = await fetch(`/api/projects/${projectId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTxnOpen(false);
        setItemName("");
        setItemCost("");
        fetchData();
        if (selectedItem) {
          fetchLedger(selectedItem.id);
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log transaction");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSavingTxn(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingTransfer(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      itemId: formData.get("itemId"),
      destinationProjectId: formData.get("destinationProjectId"),
      quantity: Number(formData.get("quantity")),
      date: formData.get("date"),
      note: formData.get("note") || undefined,
    };

    try {
      const res = await fetch(`/api/projects/${projectId}/inventory/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTransferOpen(false);
        fetchData();
        if (selectedItem) {
          fetchLedger(selectedItem.id);
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to transfer");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setCurrentStart(start);
    setCurrentEnd(end);
    setCurrentPage(1);
    if (selectedItem) {
      fetchLedger(selectedItem.id, start, end, 1, currentSearch);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (selectedItem) {
      fetchLedger(selectedItem.id, currentStart, currentEnd, newPage, currentSearch);
    }
  };

  const handleSearchChange = (search: string) => {
    setCurrentSearch(search);
    setCurrentPage(1);
    if (selectedItem) {
      fetchLedger(selectedItem.id, currentStart, currentEnd, 1, search);
    }
  };

  const mapLedgerRows = () => {
    if (!ledgerData) return [];
    return ledgerData.rows.map((row: any) => ({
      ...row,
      debit: row.qtyIn,
      credit: row.qtyOut,
      runningBalance: row.runningQtyBalance,
      runningValueBalance: row.runningValueBalance,
      description: (
        <div className="flex items-center gap-2">
          <span>{row.description || (row.type === "TRANSFER_IN" ? "Transferred In" : row.type === "TRANSFER_OUT" ? "Transferred Out" : row.type)}</span>
          {(row.type === 'TRANSFER_IN' || row.type === 'TRANSFER_OUT') && row.linkedProjectName && (
            <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700" title={`Linked Project: ${row.linkedProjectName}`}>
              {row.type === 'TRANSFER_IN' ? 'From' : 'To'}: {row.linkedProjectName}
            </Badge>
          )}
        </div>
      )
    }));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {selectedItem ? (
        <button 
          onClick={() => { setSelectedItem(null); setLedgerData(null); }}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer border-none bg-transparent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory List
        </button>
      ) : (
        <Link href={`/projects/${projectId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Link>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {selectedItem ? `${selectedItem.name} Ledger` : "Site Inventory Ledger"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedItem ? `Tracking detailed balance for ${selectedItem.name} (${selectedItem.unit}).` : "Track material and tool balances at the site."}
          </p>
        </div>

        <div className="flex gap-2">
          {/* Transfer Drawer */}
          <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
            <SheetTrigger render={<Button variant="outline" className="flex items-center gap-2" />}>
              <ArrowRightLeft className="h-4 w-4" /> Transfer Out
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Transfer Stock to Another Site</SheetTitle>
                <SheetDescription>
                  Move materials from this site to another active site.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleTransfer} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination Project *</label>
                  <select name="destinationProjectId" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item to Transfer *</label>
                  <select name="itemId" required defaultValue={selectedItem?.id || ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="">Select from current stock...</option>
                    {inventory.map(inv => {
                      const stock = Number(inv.qtyBought) + Number(inv.qtyTransferredIn) - Number(inv.qtyIssued) - Number(inv.qtyReturned) - Number(inv.qtyTransferredOut);
                      if (stock <= 0) return null;
                      return <option key={inv.item.id} value={inv.item.id}>{inv.item.name} (Max: {stock})</option>
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity *</label>
                  <input name="quantity" type="number" step="0.01" min="0.01" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date *</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Note / Reason</label>
                  <input name="note" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="e.g., Requested by Site Engineer" />
                </div>
                <SheetFooter className="mt-6">
                  <SheetClose render={<Button variant="outline" type="button" />}>Cancel</SheetClose>
                  <Button type="submit" disabled={savingTransfer}>
                    {savingTransfer ? "Transferring..." : "Transfer Stock"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>

          {/* Standard Log Transaction Drawer */}
          <Sheet open={txnOpen} onOpenChange={setTxnOpen}>
            <SheetTrigger render={<Button className="flex items-center gap-2" />}>
              <Plus className="h-4 w-4" /> Log Transaction
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Log Inventory Transaction</SheetTitle>
                <SheetDescription>
                  Record buying, issuing, or returning an item.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleLogTransaction} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item Name *</label>
                  <Input 
                    required 
                    value={itemName}
                    onChange={handleItemNameChange}
                    list="items-list" 
                    placeholder="Type to search or add new..." 
                  />
                  <datalist id="items-list">
                    {items.map(i => <option key={i.id} value={i.name} />)}
                  </datalist>
                  <p className="text-[10px] text-muted-foreground">If the item doesn't exist, it will be automatically created.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Type *</label>
                  <select name="type" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="BUY">Buy (Inward to Site)</option>
                    <option value="ISSUE">Issue (Used on Site)</option>
                    <option value="RETURN">Return (Outward from Site)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity *</label>
                    <input name="quantity" type="number" step="0.01" min="0.01" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit Cost (₹) *</label>
                    <input id="unitCost" name="unitCost" type="number" step="0.01" value={itemCost} onChange={e=>setItemCost(e.target.value)} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date *</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Note / Reference</label>
                  <input name="note" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="Invoice or slip number..." />
                </div>
                <SheetFooter className="mt-6">
                  <SheetClose render={<Button variant="outline" type="button" />}>Cancel</SheetClose>
                  <Button type="submit" disabled={savingTxn}>
                    {savingTxn ? "Saving..." : "Log Transaction"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {selectedItem ? (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Current Stock ({selectedItem.unit})</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {ledgerData ? Math.abs(ledgerData.closingQtyBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "..."}
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  Value: ₹{ledgerData ? Math.abs(ledgerData.closingValueBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."}
                </span>
              </div>
            </div>
          </div>
          <LedgerTable
            openingBalance={ledgerData?.openingQtyBalance || 0}
            rows={mapLedgerRows()}
            totalDebit={ledgerData?.totalQtyIn || 0}
            totalCredit={ledgerData?.totalQtyOut || 0}
            closingBalance={ledgerData?.closingQtyBalance || 0}
            debitLabel="In (Qty)"
            creditLabel="Out (Qty)"
            currencyOrUnit="quantity"
            onDateRangeChange={handleDateRangeChange}
            onSearchChange={handleSearchChange}
            loading={ledgerLoading}
            showValueBalance={true}
            page={ledgerData?.page || currentPage}
            totalPages={ledgerData?.totalPages || 1}
            total={ledgerData?.total || 0}
            onPageChange={handlePageChange}
            pdfReportType="inventory_ledger"
            pdfParams={{ projectId, itemId: selectedItem.id }}
          />
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
          <div className="lg:hidden space-y-3.5">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
                Loading inventory...
              </div>
            ) : inventory.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-white shadow-sm">
                <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                <p className="text-muted-foreground font-medium text-sm">No inventory logged for this site.</p>
              </div>
            ) : (
              inventory.map((inv) => {
                const stock = Number(inv.qtyBought) + Number(inv.qtyTransferredIn) - Number(inv.qtyIssued) - Number(inv.qtyReturned) - Number(inv.qtyTransferredOut);
                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setSelectedItem(inv.item);
                      fetchLedger(inv.item.id);
                      setItemName(inv.item.name);
                      setItemCost(inv.item.unitCost.toString());
                    }}
                    className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3 active:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-blue-600 text-base block break-words">
                          {inv.item.name}
                        </span>
                        <span className="text-xs text-slate-500 font-medium block">Unit: {inv.item.unit}</span>
                      </div>
                      <Badge variant={stock <= 0 ? "destructive" : "outline"} className="text-xs font-mono font-bold shrink-0 px-2.5 py-1">
                        Stock: {stock.toLocaleString(undefined, { maximumFractionDigits: 2 })} {inv.item.unit}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div className="bg-green-50/80 rounded-lg p-2 text-center border border-green-100/80 flex flex-col justify-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bought</span>
                        <span className="text-green-700 font-mono font-bold text-sm sm:text-base mt-0.5">+{Number(inv.qtyBought).toLocaleString()}</span>
                      </div>
                      <div className="bg-orange-50/80 rounded-lg p-2 text-center border border-orange-100/80 flex flex-col justify-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Issued</span>
                        <span className="text-orange-700 font-mono font-bold text-sm sm:text-base mt-0.5">-{Number(inv.qtyIssued).toLocaleString()}</span>
                      </div>
                      <div className="bg-blue-50/80 rounded-lg p-2 text-center border border-blue-100/80 flex flex-col justify-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Returned</span>
                        <span className="text-blue-700 font-mono font-bold text-sm sm:text-base mt-0.5">-{Number(inv.qtyReturned).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (lg breakpoint and above) */}
          <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">Item Name</TableHead>
                  <TableHead className="text-right">Total Bought</TableHead>
                  <TableHead className="text-right">Total Issued</TableHead>
                  <TableHead className="text-right">Total Returned</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading inventory...</TableCell>
                  </TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <PackageOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                      <p className="text-muted-foreground">No inventory logged for this site.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((inv) => {
                    const stock = Number(inv.qtyBought) + Number(inv.qtyTransferredIn) - Number(inv.qtyIssued) - Number(inv.qtyReturned) - Number(inv.qtyTransferredOut);
                    return (
                      <TableRow 
                        key={inv.id} 
                        className="hover:bg-slate-50/50 cursor-pointer group"
                        onClick={() => {
                          setSelectedItem(inv.item);
                          fetchLedger(inv.item.id);
                          setItemName(inv.item.name);
                          setItemCost(inv.item.unitCost.toString());
                        }}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          <span className="text-blue-600 hover:underline">{inv.item.name}</span> <span className="text-xs text-muted-foreground">({inv.item.unit})</span>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-mono">+{Number(inv.qtyBought).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-orange-600 font-mono">-{Number(inv.qtyIssued).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600 font-mono">-{Number(inv.qtyReturned).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          <Badge variant={stock <= 0 ? "destructive" : "outline"} className="text-xs">
                            {stock.toLocaleString(undefined, { maximumFractionDigits: 2 })} {inv.item.unit}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
