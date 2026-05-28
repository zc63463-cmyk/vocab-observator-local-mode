import { NextResponse } from "next/server";

/**
 * Wrap an unexpected error into a generic 500 response to avoid leaking
 * internal details (database schema, SQL, stack traces) to API consumers.
 * Always log the original error server-side for observability.
 */
export function apiErrorResponse(
  error: unknown,
  context: string,
  status = 500,
  message?: string,
) {
  console.error(`[${context}] Internal error:`, error);
  return NextResponse.json(
    { error: message ?? "Internal server error" },
    { status },
  );
}
