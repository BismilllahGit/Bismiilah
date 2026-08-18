"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";

export interface DownloadPdfButtonProps {
  reportType: string;
  params?: Record<string, any>;
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
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
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

      const { url } = await res.json();

      if (url) {
        // Open signed URL in a new tab / trigger download
        window.open(url, "_blank");
      } else {
        throw new Error("No download URL returned from server");
      }
    } catch (err: any) {
      console.error("PDF Export error:", err);
      setError(err.message || "Export failed");
      alert(`Error generating PDF: ${err.message || "Please try again later."}`);
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
      className={`max-sm:h-10 max-sm:min-h-[40px] max-sm:px-3 font-medium transition-colors ${className}`}
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
