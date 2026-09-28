"use client";

import { Badge } from "@/components/ui/badge";
import { PackageOpen, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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

export function InventoryMobileList({
  inventory,
  loading,
  onSelectItem,
  onEditItem,
  onDeleteItem,
}: {
  inventory: InventoryBalance[];
  loading: boolean;
  onSelectItem: (inv: InventoryBalance) => void;
  onEditItem?: (inv: InventoryBalance) => void;
  onDeleteItem?: (inv: InventoryBalance) => void;
}) {
  return (
    <div className="lg:hidden space-y-3.5">
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
          Loading inventory...
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-white shadow-sm">
          <EmptyState
            icon={PackageOpen}
            message="No inventory logged for this site."
          />
        </div>
      ) : (
        inventory.map((inv) => {
          const stock =
            Number(inv.qtyBought) +
            Number(inv.qtyTransferredIn) -
            Number(inv.qtyIssued) -
            Number(inv.qtyReturned) -
            Number(inv.qtyTransferredOut);
          return (
            <div
              key={inv.id}
              onClick={() => onSelectItem(inv)}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3 active:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                <div className="space-y-0.5">
                  <span className="font-bold text-blue-600 text-base block break-words">
                    {inv.item.name}
                  </span>
                  <span className="text-xs text-slate-500 font-medium block">
                    Unit: {inv.item.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={stock <= 0 ? "destructive" : "outline"}
                    className="text-xs font-mono font-bold px-2.5 py-1"
                  >
                    Stock:{" "}
                    {stock.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {inv.item.unit}
                  </Badge>
                  {(onEditItem || onDeleteItem) && (
                    <div className="flex items-center gap-1">
                      {onEditItem && (
                        <button
                          type="button"
                          aria-label="Edit item"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem(inv);
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onDeleteItem && (
                        <button
                          type="button"
                          aria-label="Delete item"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(inv);
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="bg-green-50/80 rounded-lg p-2 text-center border border-green-100/80 flex flex-col justify-center">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Bought
                  </span>
                  <span className="text-green-700 font-mono font-bold text-sm sm:text-base mt-0.5">
                    +{Number(inv.qtyBought).toLocaleString()}
                  </span>
                </div>
                <div className="bg-orange-50/80 rounded-lg p-2 text-center border border-orange-100/80 flex flex-col justify-center">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Issued
                  </span>
                  <span className="text-orange-700 font-mono font-bold text-sm sm:text-base mt-0.5">
                    -{Number(inv.qtyIssued).toLocaleString()}
                  </span>
                </div>
                <div className="bg-blue-50/80 rounded-lg p-2 text-center border border-blue-100/80 flex flex-col justify-center">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Returned
                  </span>
                  <span className="text-blue-700 font-mono font-bold text-sm sm:text-base mt-0.5">
                    -{Number(inv.qtyReturned).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
