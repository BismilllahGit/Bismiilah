import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const extraWorkSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  date: z.string(),
  status: z.enum(["UNBILLED", "BILLED", "COLLECTED"]).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.extraWork.findMany({
      where: { projectId: (await params).id },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch extra work" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = extraWorkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { description, amount, date, status } = parsed.data;

    const id = (await params).id;
    await ensureProjectActive(id);

    const extra = await prisma.$transaction(async (tx) => {
      const voucherNumber = await nextVoucherNumber(tx, 'EXT', 'EXTRA_WORK');

      return tx.extraWork.create({
        data: {
          projectId: id,
          description,
          amount,
          date: new Date(date),
          status: status || "UNBILLED",
          voucherNumber,
        }
      });
    });

    return NextResponse.json(extra, { status: 201 });
  } catch (error: any) {
    console.error(error);
    if (error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create extra work" }, { status: 500 });
  }
}
