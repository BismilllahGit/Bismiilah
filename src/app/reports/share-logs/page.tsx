"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ExternalLink, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";

interface ShareLog {
  id: string;
  type: string;
  referenceId: string;
  referenceType: string;
  recipientPhone: string;
  createdAt: string;
}

export default function ShareLogsPage() {
  const { data: logs, loading } = useApiResource<ShareLog[]>(
    "/api/share-logs?limit=200",
  );

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "CLIENT_RECEIPT":
        return "Client Receipt";
      case "VENDOR_PAYMENT":
        return "Vendor Payment";
      case "LABOUR_PAYMENT":
        return "Labour Payment";
      case "BOQ_QUOTATION":
        return "BOQ / Quotation";
      case "CLIENT_LEDGER":
        return "Client Ledger";
      case "VENDOR_LEDGER":
        return "Vendor Ledger";
      case "LABOUR_LEDGER":
        return "Labour Ledger";
      case "PROJECT_CLOSURE":
        return "Closure Report";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getReferenceLink = (log: ShareLog) => {
    // Generate a contextual link back to the originating page if possible
    if (
      log.referenceType === "Contact" ||
      log.referenceType === "DailyLabourEntry" ||
      log.referenceType === "VendorTransaction"
    ) {
      // It's hard to know if it's a client or vendor just from 'Contact', but for logs we can just provide the ID
      return (
        <span className="font-mono text-xs text-slate-500">
          {log.referenceId.slice(0, 8)}...
        </span>
      );
    }
    if (log.referenceType === "BOQ") {
      return (
        <span className="font-mono text-xs text-slate-500">
          {log.referenceId.slice(0, 8)}...
        </span>
      );
    }
    if (log.referenceType === "Project") {
      return (
        <Link
          href={`/projects/${log.referenceId}/closure`}
          className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
        >
          View Project <ExternalLink className="h-3 w-3" />
        </Link>
      );
    }
    return (
      <span className="font-mono text-xs text-slate-500">
        {log.referenceId.slice(0, 8)}...
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Communication Logs
        </h1>
        <p className="text-muted-foreground mt-1">
          Read-only audit trail of WhatsApp share events triggered across the
          application.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            WhatsApp Shares
          </CardTitle>
          <CardDescription>
            Note: These logs indicate when a share was{" "}
            <strong>triggered</strong> from the app to open WhatsApp. They do
            not confirm final delivery or read receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[180px]">Triggered At</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient Phone</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-300" />
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : (logs || []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No share logs recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                (logs || []).map((log) => (
                  <TableRow
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div className="flex flex-col">
                          <span>
                            {new Date(log.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-slate-500 font-normal">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 font-semibold"
                      >
                        {getTypeLabel(log.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-slate-800">
                      +{log.recipientPhone}
                    </TableCell>
                    <TableCell>{getReferenceLink(log)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
