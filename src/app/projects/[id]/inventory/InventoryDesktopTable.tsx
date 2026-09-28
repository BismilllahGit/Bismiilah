"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function InventoryDesktopTable({
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
  const showActions = !!(onEditItem || onDeleteItem);
  return (
    <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
      <Table className="min-w-[650px]">
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[200px]">Item Name</TableHead>
            <TableHead className="text-right">Total Bought</TableHead>
            <TableHead className="text-right">Total Issued</TableHead>
            <TableHead className="text-right">Total Returned</TableHead>
            <TableHead className="text-right">Current Stock</TableHead>
            {showActions && <TableHead className="w-[80px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? 6 : 5}
                className="text-center py-10 text-muted-foreground"
              >
                Loading inventory...
              </TableCell>
            </TableRow>
          ) : inventory.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? 6 : 5}
                className="text-center py-10"
              >
                <EmptyState
                  icon={PackageOpen}
                  message="No inventory logged for this site."
                  messageClassName="text-muted-foreground"
                  variant="cell"
                  compact
                />
              </TableCell>
            </TableRow>
          ) : (
            inventory.map((inv) => {
              const stock =
                Number(inv.qtyBought) +
                Number(inv.qtyTransferredIn) -
                Number(inv.qtyIssued) -
                Number(inv.qtyReturned) -
                Number(inv.qtyTransferredOut);
              return (
                <TableRow
                  key={inv.id}
                  className="hover:bg-slate-50/50 cursor-pointer group"
                  onClick={() => onSelectItem(inv)}
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    <span className="text-blue-600 hover:underline">
                      {inv.item.name}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">
                      ({inv.item.unit})
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-mono">
                    +{Number(inv.qtyBought).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-orange-600 font-mono">
                    -{Number(inv.qtyIssued).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 font-mono">
                    -{Number(inv.qtyReturned).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono">
                    <Badge
                      variant={stock <= 0 ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {stock.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {inv.item.unit}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
