import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { resolveWordbookId } from "@/lib/wordbook";
import { sql } from "@/lib/db";

/**
 * DELETE /api/highlights/:id
 *
 * Remove a single highlight.  The highlight must belong to the
 * current user + active wordbook; otherwise the call is a no-op
 * (204 regardless) to avoid leaking existence information.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const wordbookId = await resolveWordbookId(supabase, userId, null);

  const { id: highlightId } = await params;

  // Validate UUID shape so we can safely interpolate
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(highlightId)) {
    return NextResponse.json({ error: "Invalid highlight id" }, { status: 400 });
  }

  const { error } = await sql`
    DELETE FROM word_highlights
    WHERE id = ${highlightId}
      AND user_id = ${userId}
      AND wordbook_id = ${wordbookId}
  `;

  if (error) {
    return apiErrorResponse(error, "api/highlights/[id]");
  }

  return new NextResponse(null, { status: 204 });
}
