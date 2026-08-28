"use client";

import { useState, use } from "react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LockKeyhole, CheckCircle, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function ProjectClosurePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const {
    data: report,
    loading,
    refetch,
  } = useApiResource<any>(`/api/projects/${projectId}/closure`);
  const [closing, setClosing] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const closeProject = useApiMutation<undefined, unknown>("POST");

  const handleCloseProject = async () => {
    setClosing(true);
    try {
      await closeProject.mutate(`/api/projects/${projectId}/closure`);
      refetch();
      alert("Project successfully closed!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to close project");
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Checking project status...</div>;

  if (report) {
    const data = report.summaryJson;
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Link>
        <div className="flex items-center gap-3 text-green-600">
          <CheckCircle className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">Project Closed</h1>
        </div>
        <p className="text-muted-foreground">This project was officially closed on {new Date(data.closureDate).toLocaleString()}.</p>

        <Card>
          <CardHeader>
            <CardTitle>Closure Summary</CardTitle>
            <CardDescription>Final financial snapshot at the time of closure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoiced (Billed)</p>
                <p className="text-xl font-bold">₹{data.totalBilled.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-green-600">₹{data.totalCollected.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Receivables</p>
                <p className="text-xl font-bold text-orange-600">₹{data.outstandingReceivables.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unbilled Extra Work</p>
                <p className="text-xl font-bold text-red-600">₹{data.unbilledExtraWork.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Site Expenses</p>
                <p className="text-xl font-bold">₹{data.totalSiteExpenses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Material Cost</p>
                <p className="text-xl font-bold">₹{data.estimatedMaterialCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-2">
              <DownloadPdfButton
                reportType="closure_report"
                params={{ projectId }}
                buttonText="Download PDF Report"
                variant="outline"
                className="w-full sm:w-auto"
              />
              {report?.project?.client?.phone && (
                <ShareViaWhatsAppButton
                  phone={report.project.client.phone}
                  message={`Hi ${report.project.client.name}, here is the Project Closure Report for ${report.project.name}. View it here: ${typeof window !== 'undefined' ? window.location.origin : ''}/share/closure-report/${projectId} — Bismillah Construction`}
                  variant="secondary"
                  className="w-full sm:w-auto"
                  logType="PROJECT_CLOSURE"
                  referenceId={projectId}
                  referenceType="Project"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Link href={`/projects/${projectId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
      </Link>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-red-600">Close Project</h1>
        <p className="text-muted-foreground">You are about to generate a final closure report and lock this project.</p>
      </div>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <LockKeyhole className="h-5 w-5" /> Warning: Irreversible Action
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-red-700 space-y-4">
          <p>Closing a project will:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Change the project status to <strong>CLOSED</strong>.</li>
            <li>Generate a static JSON snapshot of all current financials (Invoices, Expenses, Extra Work).</li>
            <li>Prevent further attendance marking or inventory issuing for this site (if enforced by UI logic).</li>
          </ul>
          <p className="font-semibold">Ensure all pending invoices have been generated and extra work billed before closing.</p>
          <div className="pt-4">
            <Button variant="destructive" onClick={() => setConfirmCloseOpen(true)} disabled={closing}>
              {closing ? "Generating Report..." : "Confirm & Close Project"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title="Close this project?"
        description="This will generate a final snapshot of the financials and lock the project."
        confirmLabel="Close Project"
        onConfirm={handleCloseProject}
      />
    </div>
  );
}
