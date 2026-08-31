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
import { PageShell } from "@/components/ui/page-shell";
import { PageHeader } from "@/components/ui/page-header";

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
    if (
      log.referenceType === "Contact" ||
      log.referenceType === "DailyLabourEntry" ||
      log.referenceType === "VendorTransaction"
    ) {
      return (
        <span className="font-mono text-xs text-slate-500 break-all">
          {log.referenceId.slice(0, 8)}...
        </span>
      );
    }
    if (log.referenceType === "BOQ") {
      return (
        <span className="font-mono text-xs text-slate-500 break-all">
          {log.referenceId.slice(0, 8)}...
        </span>
      );
    }
    if (log.referenceType === "Project") {
      return (
        <Link
          href={`/projects/${log.referenceId}/closure`}
          className="text-blue-600 hover:underline flex items-center justify-end md:justify-start gap-1 text-xs text-right"
        >
          View Project <ExternalLink className="h-3 w-3 shrink-0" />
        </Link>
      );
    }
    return (
      <span className="font-mono text-xs text-slate-500 break-all">
        {log.referenceId.slice(0, 8)}...
      </span>
    );
  };

  return (
    <PageShell>
      <PageHeader
        layout="plain"
        title="Communication Logs"
        titleClassName="text-slate-900"
        subtitle="Read-only audit trail of WhatsApp share events triggered across the application."
        subtitleClassName="text-muted-foreground mt-1"
      />

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
        <CardContent className="p-4 md:p-0">
          <Table className="block md:table w-full">
            <TableHeader className="hidden md:table-header-group bg-slate-50">
              <TableRow>
                <TableHead className="w-45">Triggered At</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient Phone</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            {/* Added p-1 and pb-4 to prevent the overflow container from clipping the shadows */}
            <TableBody className="flex flex-col gap-4 p-1 pb-4 md:p-0 md:pb-0 md:table-row-group md:gap-0">
              {loading ? (
                <TableRow className="flex md:table-row border border-slate-200 md:border-0 rounded-lg md:rounded-none">
                  <TableCell
                    colSpan={4}
                    className="h-32 flex flex-col items-center justify-center md:table-cell text-center text-muted-foreground w-full border-none"
                  >
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-300" />
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : (logs || []).length === 0 ? (
                <TableRow className="flex md:table-row border border-slate-200 md:border-0 rounded-lg md:rounded-none">
                  <TableCell
                    colSpan={4}
                    className="h-32 flex items-center justify-center md:table-cell text-center text-muted-foreground w-full border-none"
                  >
                    No share logs recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                (logs || []).map((log) => (
                  <TableRow
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors flex flex-col md:table-row border border-slate-200 shadow-sm md:shadow-none md:border-0 md:border-b md:last:border-b-0 rounded-lg md:rounded-none bg-white overflow-hidden"
                  >
                    <TableCell className="font-medium text-slate-700 flex flex-row items-center justify-between gap-4 md:table-cell border-b border-slate-100 md:border-none py-3 px-4 md:py-4">
                      <span className="md:hidden text-xs font-semibold uppercase text-slate-500 shrink-0">
                        Triggered At
                      </span>
                      <div className="flex items-center gap-2 text-right md:text-left">
                        <Calendar className="h-4 w-4 text-slate-400 hidden md:block" />
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

                    <TableCell className="flex flex-row items-center justify-between gap-4 md:table-cell border-b border-slate-100 md:border-none py-3 px-4 md:py-4">
                      <span className="md:hidden text-xs font-semibold uppercase text-slate-500 shrink-0">
                        Type
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 font-semibold text-right"
                      >
                        {getTypeLabel(log.type)}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono text-slate-800 flex flex-row items-center justify-between gap-4 md:table-cell border-b border-slate-100 md:border-none py-3 px-4 md:py-4">
                      <span className="md:hidden text-xs font-semibold uppercase text-slate-500 shrink-0">
                        Recipient
                      </span>
                      {/* Fixed the double plus sign issue */}
                      <span className="text-right break-all">
                        {log.recipientPhone}
                      </span>
                    </TableCell>

                    <TableCell className="flex flex-row items-center justify-between gap-4 md:table-cell py-3 px-4 md:py-4 border-none">
                      <span className="md:hidden text-xs font-semibold uppercase text-slate-500 shrink-0">
                        Reference
                      </span>
                      <div className="text-right">{getReferenceLink(log)}</div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
