import type { ZodSchema } from "zod";

/**
 * Replaces the repeated:
 *   const body = await request.json();
 *   const parsed = schema.safeParse(body);
 *   if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
 *
 * `parsed.error` from a failed safeParse IS a ZodError instance, so throwing
 * it here lets `errorResponse()` (Task 1) format it identically to before.
 */
export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}
