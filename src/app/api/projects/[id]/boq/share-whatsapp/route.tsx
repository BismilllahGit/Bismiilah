import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWhatsAppLinkShare } from "@/lib/whatsapp";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReportLayout } from "@/lib/pdf/ReportLayout";
import { BOQPdfTable } from "@/lib/pdf/BOQPdfTable";
import { uploadPdfAndGetSignedUrl } from "@/lib/storage";
import { getEnrichedProjectBOQ } from "@/lib/queries/boq-queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { boqId, note, phone: customPhone } = body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Resolve recipient phone number (custom override from modal OR auto-discovered from project client)
    let phone = customPhone;
    let recipientName: string | undefined = undefined;

    if (!phone) {
      // Look up client attached to project invoices or fallback to first active client on file
      const client = await prisma.client.findFirst({
        where: {
          invoices: { some: { projectId } },
          phone: { not: null },
        },
      });

      if (client && client.phone) {
        phone = client.phone;
        recipientName = client.name;
      }
    }

    if (!phone) {
      return NextResponse.json(
        { error: "No valid client phone number found on file for this project. Please provide a phone number." },
        { status: 400 }
      );
    }

    // 2. Resolve target BOQ revision (boqId if passed, else current active/latest)
    let versionNumber: number | undefined = undefined;
    const targetBoqId = boqId;
    if (targetBoqId) {
      const target = await prisma.bOQ.findUnique({ where: { id: targetBoqId } });
      if (target) {
        versionNumber = target.versionNumber;
      }
    }

    const boqData = await getEnrichedProjectBOQ(projectId, versionNumber);
    if (!boqData.current) {
      return NextResponse.json({ error: "BOQ estimate not found to share." }, { status: 404 });
    }

    const boq = boqData.current;

    // 3. Generate signed 1-hour PDF URL (if not already cached or passed)
    const title = "Project Bill of Quantities / Quotation";
    const subtitle = `Project: ${project.name} | Location: ${project.location} | Revision: Version ${boq.versionNumber} (${boq.status})`;
    const formatRs = (val: number | null | undefined) => val ? `Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-";
    const summaryItems = [
      { label: "Quotation Version", value: `v${boq.versionNumber} (${boq.status})` },
      { label: "Total Sections", value: (boq.sections || []).length },
      { label: "Grand Total (G-TOTAL)", value: formatRs(boq.grandTotal) },
    ];

    const pdfDocument = (
      <ReportLayout title={title} subtitle={subtitle} summaryItems={summaryItems}>
        <BOQPdfTable boq={boq} />
      </ReportLayout>
    );

    const buffer = await renderToBuffer(pdfDocument);
    const timestamp = Date.now();
    const filePath = `reports/boq/quotation_${projectId}_v${boq.versionNumber}_${timestamp}.pdf`;
    const signedUrl = await uploadPdfAndGetSignedUrl(buffer, filePath);

    // 4. Dispatch notification via Meta Cloud API / WhatsApp service
    const shareResult = await sendWhatsAppLinkShare({
      phone,
      recipientName,
      projectName: project.name,
      documentTitle: `Bill of Quantities (Version ${boq.versionNumber} - ${boq.status})`,
      linkUrl: signedUrl,
      note,
    });

    return NextResponse.json({
      success: true,
      message: `WhatsApp quotation link successfully dispatched to +${shareResult.phone}!`,
      signedUrl,
      whatsapp: shareResult,
    });
  } catch (error) {
    console.error("Error sharing quotation via WhatsApp:", error);
    return NextResponse.json(
      { error: error instanceof Error && error.message ? error.message : "Failed to share quotation via WhatsApp" },
      { status: 500 }
    );
  }
}
