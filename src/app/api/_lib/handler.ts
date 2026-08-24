import { NextResponse } from "next/server";
import { errorResponse } from "./errors";

type RouteHandler<Context> = (request: Request, context: Context) => Promise<NextResponse>;

/**
 * Replaces the repeated try { ... } catch (error) { console.error(...); return
 * NextResponse.json({ error: fallbackMessage }, { status: 500 }); } wrapper that
 * every route handler had around its body.
 */
export function withApiHandler<Context>(
  fallbackMessage: string,
  handler: RouteHandler<Context>,
): RouteHandler<Context> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error, fallbackMessage);
    }
  };
}
