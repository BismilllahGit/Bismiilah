import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { nextVoucherNumber } from "@/lib/voucher";
import { getDailyLabourReportData } from "@/lib/queries/report-queries";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = (await params).id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const workerType = searchParams.get("workerType");
    const groupBy = searchParams.get("groupBy")?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "1000"));

    // Strictly scope query to this project ID from the path parameter
    const result = await getDailyLabourReportData({
      projectId,
      startDate,
      endDate,
      workerType,
      groupBy,
      page,
      limit
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch project daily labour:", error);
    return NextResponse.json({ error: "Failed to fetch project daily labour" }, { status: 500 });
  }
}

const entrySchema = z.object({
  workerType: z.string().min(1, "Worker type is required"),
  headcount: z.number().int("Headcount must be an integer").positive("Headcount must be positive"),
  wageRate: z.number()
    .positive("Wage rate must be positive")
    .refine((val) => {
      const s = val.toString();
      return !s.includes('.') || s.split('.')[1].length <= 2;
    }, { message: "Wage rate can have at most 2 decimal places" }),
  contractorId: z.string().optional().nullable(),
  paidImmediately: z.boolean().optional().default(false),
  title: z.string().optional(),
  note: z.string().optional(),
});

const batchSchema = z.object({
  date: z.string().min(1, "Date is required"),
  entries: z.array(entrySchema).min(1, "At least one entry is required"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = (await params).id;
    const body = await request.json();
    const parsed = batchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { date, entries } = parsed.data;

    // Check project status
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status === "CLOSED") {
      return NextResponse.json({ error: "Project is CLOSED. Cannot log daily labour." }, { status: 400 });
    }

    // Process all entries in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdRows = [];
      let totalHeadcount = 0;
      let totalSpend = 0;

      for (const entry of entries) {
        const voucherNumber = await nextVoucherNumber(tx as any, 'LAB', 'DAILY_LABOUR');
        
        let workerTypeRecord = await tx.workerType.findUnique({
          where: { name: entry.workerType.trim().toUpperCase() }
        });
        if (!workerTypeRecord) {
          workerTypeRecord = await tx.workerType.findUnique({
            where: { id: entry.workerType }
          });
        }
        if (!workerTypeRecord) {
          // Create custom worker type on the fly
          workerTypeRecord = await tx.workerType.create({
            data: {
              name: entry.workerType.trim().toUpperCase(),
              defaultRate: entry.wageRate,
              paymentCycle: "WEEKLY",
              isCustom: true,
              isActive: true,
            }
          });
        }

        const row = await tx.dailyLabourEntry.create({
          data: {
            projectId,
            voucherNumber,
            date: new Date(date),
            workerTypeId: workerTypeRecord.id,
            headcount: entry.headcount,
            wageRate: entry.wageRate,
            contractorId: entry.contractorId && entry.contractorId !== "" ? entry.contractorId : null,
            paidImmediately: entry.paidImmediately ?? false,
            title: entry.title,
            note: entry.note,
          }
        });

        createdRows.push({
          ...row,
          workerType: workerTypeRecord.name, // return friendly name to client
        });
        totalHeadcount += entry.headcount;
        totalSpend += (entry.headcount * entry.wageRate);
      }

      return {
        rows: createdRows,
        totalHeadcount,
        totalSpend
      };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("Failed to log daily labour:", error);
    return NextResponse.json({ error: "Failed to log daily labour" }, { status: 500 });
  }
}
