import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Turns any error thrown inside a route handler into the NextResponse the
 * route used to build by hand in its catch block:
 *   - ApiError            -> { error: message } at error.status
 *   - ZodError            -> { error: error.format() } at 400
 *   - anything else       -> logs it, { error: fallbackMessage } at 500
 */
export function errorResponse(
  error: unknown,
  fallbackMessage: string,
): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.format() }, { status: 400 });
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
