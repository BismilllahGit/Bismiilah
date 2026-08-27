import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { requireSession } from "./auth-guard";
import { parseJsonBody } from "./body";
import { withApiHandler } from "./handler";

type IdParams = { params: Promise<{ id: string }> };

/**
 * Replaces the repeated:
 *   const data: any = {};
 *   if (parsed.data.x !== undefined) data.x = parsed.data.x;
 *   if (parsed.data.y !== undefined) data.y = parsed.data.y;
 *   ...
 * Zod's `.optional()` fields are already `undefined` when absent from the
 * request body, so this is a safe, generic replacement for that per-field
 * filtering — it never sends `undefined` to Prisma.
 */
export function buildUpdateData<T extends Record<string, unknown>>(parsed: T): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(parsed)) {
    if (parsed[key] !== undefined) {
      data[key] = parsed[key];
    }
  }
  return data;
}

/**
 * Only for routes with NO business rules beyond "validate, filter undefined,
 * update by id, return the record" — see the plan's file structure section
 * for which routes qualify. Anything that needs a status check, a side
 * effect, or a uniqueness lookup stays a hand-written route built on the
 * smaller helpers instead.
 */
export function makePatchHandler<Schema extends ZodSchema<any>>(config: {
  schema: Schema;
  fallbackMessage: string;
  authOptions?: { allowTestBypass?: boolean };
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
}) {
  return withApiHandler<IdParams>(config.fallbackMessage, async (request, { params }) => {
    await requireSession(config.authOptions);
    const { id } = await params;
    const parsed = await parseJsonBody(request, config.schema);
    const data = buildUpdateData(parsed as Record<string, unknown>);
    const updated = await config.update(id, data);
    return NextResponse.json(updated);
  });
}

export function makeDeleteHandler(config: {
  fallbackMessage: string;
  authOptions?: { allowTestBypass?: boolean };
  remove: (id: string) => Promise<unknown>;
}) {
  return withApiHandler<IdParams>(config.fallbackMessage, async (request, { params }) => {
    await requireSession(config.authOptions);
    const { id } = await params;
    await config.remove(id);
    return NextResponse.json({ success: true });
  });
}
