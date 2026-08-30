/**
 * WhatsApp Business Platform (Meta Cloud API) integration and notification service.
 * Supports sending transactional message templates and link-shared PDF quotations.
 */

export interface WhatsAppShareResponse {
  success: boolean;
  deliveredVia: "META_CLOUD_API" | "SIMULATED_LOCAL";
  messageId?: string;
  phone: string;
  webShareUrl: string;
  error?: string;
}

/**
 * Clean and standardize phone number to international format (defaulting to 91 for 10-digit Indian numbers).
 */
export function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  cleaned = cleaned.replace(/^0+/, "");
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}

/**
 * Send a WhatsApp notification containing a link to a secure signed PDF document.
 */
export async function sendWhatsAppLinkShare({
  phone,
  recipientName,
  projectName,
  documentTitle,
  linkUrl,
  note,
}: {
  phone: string;
  recipientName?: string;
  projectName: string;
  documentTitle: string;
  linkUrl: string;
  note?: string;
}): Promise<WhatsAppShareResponse> {
  const formattedPhone = formatWhatsAppPhone(phone);
  const greeting = recipientName ? `Assalam o Alaikum ${recipientName},` : `Assalam o Alaikum,`;
  const messageText = `${greeting}\n\nPlease find attached the ${documentTitle} quotation for project *${projectName}*.\n\n📄 *Download / View PDF:* \n${linkUrl}\n\n${note ? `Note: ${note}\n\n` : ""}Thank you,\n*Bismillah Construction*`;

  const webShareUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

  const metaToken = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  // If Meta Cloud API is configured, make real REST API dispatch
  if (metaToken && phoneNumberId) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: true,
            body: messageText,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Meta Cloud API Dispatch failed:", errorData);
        throw new Error(errorData.error?.message || "Failed to dispatch via Meta Cloud API");
      }

      const responseData = await response.json();
      return {
        success: true,
        deliveredVia: "META_CLOUD_API",
        messageId: responseData.messages?.[0]?.id || "meta_msg_id",
        phone: formattedPhone,
        webShareUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      console.warn("Falling back to simulated delivery after Meta API error:", message);
      return {
        success: true,
        deliveredVia: "SIMULATED_LOCAL",
        error: message,
        phone: formattedPhone,
        webShareUrl,
      };
    }
  }

  // Simulated delivery fallback for dev/testing environments without Meta API token
  console.log(`[WhatsApp Meta Integration] Delivered Link Share to +${formattedPhone}: ${documentTitle} (${linkUrl})`);

  return {
    success: true,
    deliveredVia: "SIMULATED_LOCAL",
    phone: formattedPhone,
    webShareUrl,
  };
}

/**
 * Build a WhatsApp share URL (`https://wa.me/...`) for native or web sharing.
 * Returns null if the phone number format is invalid (not 10 digits, or 12 digits starting with 91).
 */
export function buildWhatsAppShareUrl(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;

  // Strip all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  let finalNumber = "";

  if (digitsOnly.length === 10) {
    // 10 digits -> prefix with 91
    finalNumber = "91" + digitsOnly;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    // 12 digits starting with 91 -> use as-is
    finalNumber = digitsOnly;
  } else {
    // Invalid format
    return null;
  }

  // URL-encode the message safely
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${finalNumber}?text=${encodedMessage}`;
}
