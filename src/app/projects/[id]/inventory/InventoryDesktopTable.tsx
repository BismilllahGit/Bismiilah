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
import { PackageOpen } from "lucide-react";

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
}: {
  inventory: InventoryBalance[];
  loading: boolean;
  onSelectItem: (inv: InventoryBalance) => void;
}) {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-10 text-muted-foreground"
              >
                Loading inventory...
              </TableCell>
            </TableRow>
          ) : inventory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                <PackageOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                <p className="text-muted-foreground">
                  No inventory logged for this site.
                </p>
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
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
