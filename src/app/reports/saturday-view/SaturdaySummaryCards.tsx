import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, HardHat, Wallet } from "lucide-react";
import { formatCurrency } from "./utils";

interface SaturdaySummaryCardsProps {
  totalClientDues: number;
  totalLabourDues: number;
  netPicture: number;
  clientDuesCount: number;
  labourDuesCount: number;
}

export function SaturdaySummaryCards({
  totalClientDues,
  totalLabourDues,
  netPicture,
  clientDuesCount,
  labourDuesCount,
}: SaturdaySummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Expected Incoming (Clients)</span>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(totalClientDues)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            From {clientDuesCount} pending client invoice
            {clientDuesCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Payable Out (Labour)</span>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(totalLabourDues)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            To {labourDuesCount} contractor
            {labourDuesCount !== 1 ? "s" : ""} on weekly cycle
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Net Weekly Position</span>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(netPicture)}{" "}
            {netPicture >= 0 ? "(Surplus)" : "(Deficit)"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Net cash flow projected for this week
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
