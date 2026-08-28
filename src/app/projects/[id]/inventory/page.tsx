"use client";

import { useState, use } from "react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LedgerTable } from "@/components/ui/ledger-table";
import { TransferStockSheet } from "./TransferStockSheet";
import { LogTransactionSheet } from "./LogTransactionSheet";
import { InventoryMobileList } from "./InventoryMobileList";
import { InventoryDesktopTable } from "./InventoryDesktopTable";

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

export default function ProjectInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const {
    data: inventoryData,
    loading: invLoading,
    refetch: refetchInventory,
  } = useApiResource<InventoryBalance[]>(
    `/api/projects/${projectId}/inventory`,
  );
  const {
    data: itemsData,
    loading: itemsLoading,
    refetch: refetchItems,
  } = useApiResource<Item[]>("/api/items");
  const { data: allProjectsData, loading: projectsLoading } =
    useApiResource<any[]>("/api/projects");

  const inventory = inventoryData || [];
  const items = itemsData || [];
  const projects = (allProjectsData || []).filter(
    (p: any) => p.id !== projectId && p.status === "ACTIVE",
  );
  const loading = invLoading || itemsLoading || projectsLoading;

  const logTransaction = useApiMutation<any, any>("POST");
  const [txnOpen, setTxnOpen] = useState(false);

  const transferStock = useApiMutation<any, any>("POST");
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

  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearch, setCurrentSearch] = useState("");

  const fetchLedger = async (
    itemId: string,
    start = currentStart,
    end = currentEnd,
    p = currentPage,
    search = currentSearch,
  ) => {
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

  // Handle auto-fill cost when typing/selecting item name
  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setItemName(val);
    const found = items.find((i) => i.name.toLowerCase() === val.toLowerCase());
    if (found) {
      setItemCost(found.unitCost.toString());
    }
  };

  const handleLogTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
      await logTransaction.mutate(
        `/api/projects/${projectId}/inventory`,
        payload,
      );
      setTxnOpen(false);
      setItemName("");
      setItemCost("");
      refetchInventory();
      refetchItems({ silent: true });
      if (selectedItem) {
        fetchLedger(selectedItem.id);
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to log transaction",
      );
    }
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const payload = {
      itemId: formData.get("itemId"),
      destinationProjectId: formData.get("destinationProjectId"),
      quantity: Number(formData.get("quantity")),
      date: formData.get("date"),
      note: formData.get("note") || undefined,
    };

    try {
      await transferStock.mutate(
        `/api/projects/${projectId}/inventory/transfer`,
        payload,
      );
      setTransferOpen(false);
      refetchInventory();
      if (selectedItem) {
        fetchLedger(selectedItem.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to transfer");
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
      fetchLedger(
        selectedItem.id,
        currentStart,
        currentEnd,
        newPage,
        currentSearch,
      );
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
          <span>
            {row.description ||
              (row.type === "TRANSFER_IN"
                ? "Transferred In"
                : row.type === "TRANSFER_OUT"
                  ? "Transferred Out"
                  : row.type)}
          </span>
          {(row.type === "TRANSFER_IN" || row.type === "TRANSFER_OUT") &&
            row.linkedProjectName && (
              <Badge
                variant="outline"
                className="text-[10px] bg-slate-100 text-slate-700"
                title={`Linked Project: ${row.linkedProjectName}`}
              >
                {row.type === "TRANSFER_IN" ? "From" : "To"}:{" "}
                {row.linkedProjectName}
              </Badge>
            )}
        </div>
      ),
    }));
  };

  // Row click handler for the inventory list: opens the ledger drill-down.
  const handleSelectItem = (inv: InventoryBalance) => {
    setSelectedItem(inv.item);
    fetchLedger(inv.item.id);
    setItemName(inv.item.name);
    setItemCost(inv.item.unitCost.toString());
  };

  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
      {selectedItem ? (
        <button
          onClick={() => {
            setSelectedItem(null);
            setLedgerData(null);
          }}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer border-none bg-transparent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory List
        </button>
      ) : (
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Link>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            {selectedItem
              ? `${selectedItem.name} Ledger`
              : "Site Inventory Ledger"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedItem
              ? `Tracking detailed balance for ${selectedItem.name} (${selectedItem.unit}).`
              : "Track material and tool balances at the site."}
          </p>
        </div>

        <div className="flex gap-2">
          <TransferStockSheet
            transferOpen={transferOpen}
            setTransferOpen={setTransferOpen}
            projects={projects}
            inventory={inventory}
            selectedItem={selectedItem}
            handleTransfer={handleTransfer}
            mutating={transferStock.mutating}
          />

          <LogTransactionSheet
            txnOpen={txnOpen}
            setTxnOpen={setTxnOpen}
            itemName={itemName}
            itemCost={itemCost}
            setItemCost={setItemCost}
            handleItemNameChange={handleItemNameChange}
            items={items}
            handleLogTransaction={handleLogTransaction}
            mutating={logTransaction.mutating}
          />
        </div>
      </div>

      {selectedItem ? (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Current Stock ({selectedItem.unit})
              </h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {ledgerData
                    ? Math.abs(ledgerData.closingQtyBalance).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 2 },
                      )
                    : "..."}
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  Value: ₹
                  {ledgerData
                    ? Math.abs(ledgerData.closingValueBalance).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )
                    : "..."}
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
          <InventoryMobileList
            inventory={inventory}
            loading={loading}
            onSelectItem={handleSelectItem}
          />

          <InventoryDesktopTable
            inventory={inventory}
            loading={loading}
            onSelectItem={handleSelectItem}
          />
        </>
      )}
    </div>
  );
}
