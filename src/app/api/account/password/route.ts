import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";
import { ApiError } from "@/app/api/_lib/errors";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

// PATCH: Changes the current user's own password after verifying their current one.
export const PATCH = withApiHandler("Failed to update password", async (request) => {
  const session = await requireSession();
  if (!session) throw new ApiError("Unauthorized", 401);
  const { currentPassword, newPassword } = await parseJsonBody(request, changePasswordSchema);

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new ApiError("User not found", 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError("Current password is incorrect", 400);

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
});
