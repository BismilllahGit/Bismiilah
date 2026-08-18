import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "VOID"]),
  voidReason: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { status, voidReason } = parsed.data;

    if (status === "VOID" && !voidReason) {
      return NextResponse.json({ error: "Void reason is required when voiding an invoice" }, { status: 400 });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        voidReason: status === "VOID" ? voidReason : null,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
