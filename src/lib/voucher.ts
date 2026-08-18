import { Prisma } from "@prisma/client";

/**
 * Generates the next sequential voucher number for a given code.
 * Example: `nextVoucherNumber(tx, 'PUR', 'VENDOR_PUR')` returns 'PUR-0001'
 * 
 * Must be run inside a Prisma Interactive Transaction to ensure atomicity.
 * 
 * @param tx Prisma transaction client
 * @param prefix The human readable prefix (e.g., 'PUR', 'INV')
 * @param code The unique sequence identifier in VoucherSequence table
 * @returns The formatted voucher string
 */
export async function nextVoucherNumber(
  tx: Omit<
    Prisma.TransactionClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  prefix: string,
  code: string
): Promise<string> {
  const sequence = await tx.voucherSequence.upsert({
    where: { id: code },
    update: {
      nextVal: { increment: 1 },
    },
    create: {
      id: code,
      nextVal: 2, // The current caller gets 1, the next will get 2
    },
  });

  // If this was an update, sequence.nextVal is the incremented value.
  // Wait, if it's an update, `increment: 1` happens and it returns the new value.
  // E.g., if previous was 1, update sets to 2 and returns 2. So the current caller should get 2.
  // If it was created, it sets to 2 and returns 2. But the current caller should get 1!
  // To handle this correctly and atomically, it's better to update and get the returned value.
  // Let's refine the logic.
  
  // Upsert returns the state AFTER the operation.
  // If we want 1-based indexing, when we create we want to use 1.
  // So if it's a create, it sets nextVal=2, we use 1.
  // If it's an update, it increments nextVal from X to X+1, and returns X+1. We use X!
  // Wait, no. If we increment, we just use the returned value directly if we structure it right.
  // Let's change the approach.
  // A cleaner approach:
  // upsert: update increment 1, create nextVal 1.
  // Upsert returns the NEW value.
  // Create -> returns 1.
  // Update (was 1) -> returns 2.
  // We can just use the returned nextVal directly!
  
  const seq = await tx.voucherSequence.upsert({
    where: { id: code },
    update: {
      nextVal: { increment: 1 },
    },
    create: {
      id: code,
      nextVal: 1,
    },
  });

  const value = seq.nextVal;
  
  // Pad with 4 zeros: 1 -> 0001
  const padded = value.toString().padStart(4, '0');
  return `${prefix}-${padded}`;
}
