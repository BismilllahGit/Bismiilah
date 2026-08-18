import prisma from "./prisma";

/**
 * Recalculates the amount for all BOQPaymentMilestones of a given BOQ.
 * Should be called whenever a line item's amount changes, or a milestone's percentage changes.
 */
export async function recalculateBOQMilestones(boqId: string) {
  // 1. Compute the BOQ grand total (sum of all line item amounts)
  const lineItems = await prisma.bOQLineItem.findMany({
    where: { section: { boqId } },
    select: { amount: true },
  });

  const boqGrandTotal = lineItems.reduce((acc, li) => acc + Number(li.amount || 0), 0);

  // 2. Fetch all milestones for this BOQ
  const milestones = await prisma.bOQPaymentMilestone.findMany({
    where: { boqId },
  });

  // 3. Update each milestone's amount based on its percentage and the new grand total
  const updatePromises = milestones.map((m) => {
    const percentage = Number(m.percentage || 0);
    const amount = (percentage / 100) * boqGrandTotal;

    return prisma.bOQPaymentMilestone.update({
      where: { id: m.id },
      data: { amount },
    });
  });

  await Promise.all(updatePromises);
}
