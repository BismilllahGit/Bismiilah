"use client";

import React from "react";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface ShareViaWhatsAppButtonProps extends Omit<React.ComponentProps<typeof Button>, "onClick"> {
  phone: string | null | undefined;
  message: string;
  label?: string;
  onShare?: () => void;
  // Analytics / Logging
  logType?: string; // e.g. "CLIENT_INVOICE", "BOQ", "VENDOR_LEDGER"
  referenceId?: string;
  referenceType?: string;
}

export function ShareViaWhatsAppButton({
  phone,
  message,
  label = "Share via WhatsApp",
  onShare,
  logType,
  referenceId,
  referenceType,
  className,
  variant = "outline",
  size = "sm",
  ...props
}: ShareViaWhatsAppButtonProps) {
  const shareUrl = buildWhatsAppShareUrl(phone, message);
  const isDisabled = !shareUrl;

  const handleShare = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
      if (onShare) {
        onShare();
      }
      
      // Fire-and-forget logging if tracking details are provided
      if (logType && referenceId && referenceType && phone) {
        fetch("/api/share-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: logType,
            referenceId,
            referenceType,
            recipientPhone: phone, // Log the raw phone number that was attempted
          }),
        }).catch(err => console.error("Failed to log WhatsApp share:", err));
      }
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={isDisabled}
      onClick={handleShare}
      title={isDisabled ? "No valid phone number on file for this contact" : undefined}
      {...props}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
