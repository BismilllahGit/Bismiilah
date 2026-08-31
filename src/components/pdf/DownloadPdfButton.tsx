"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";

export interface DownloadPdfButtonProps {
  reportType: string;
  params?: Record<string, string | undefined>;
  buttonText?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export function DownloadPdfButton({
  reportType,
  params = {},
  buttonText = "Download PDF",
  variant = "outline",
  size = "default",
  className = "",
  disabled = false,
}: DownloadPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    // Open the tab synchronously, inside the click handler, so browsers still
    // treat it as a direct result of the user gesture (avoids popup blockers)
    // — we point it at the PDF once it's ready below.
    const newTab = window.open("", "_blank");
    try {
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType,
          params,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF report");
      }

      // Server streams the PDF bytes directly (no object storage involved),
      // so pull it down as a blob: open it in the reserved tab, and also
      // save a copy via a download link.
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const fileNameMatch = disposition.match(/filename="?([^";]+)"?/);
      const fileName = fileNameMatch?.[1] || `${reportType}.pdf`;
      const blobUrl = window.URL.createObjectURL(blob);

      if (newTab) {
        newTab.location.href = blobUrl;
      } else {
        // Popup was blocked despite the synchronous open — fall back to
        // navigating the current tab.
        window.location.href = blobUrl;
      }

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Give the tab time to actually load the blob before freeing it.
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      newTab?.close();
      console.error("PDF Export error:", err);
      const message = err instanceof Error ? err.message : undefined;
      setError(message || "Export failed");
      alert(`Error generating PDF: ${message || "Please try again later."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading || disabled}
      className={`max-sm:h-10 max-sm:min-h-10 max-sm:px-3 font-medium transition-colors ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
      ) : (
        <FileDown className="h-4 w-4 mr-2 shrink-0 text-slate-700" />
      )}
      {buttonText}
    </Button>
  );
}
