import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { resolveWordbookId } from "@/lib/wordbook";
import { sql } from "@/lib/db";

/**
 * DELETE /api/annotations/:id
 *
 * Delete an annotation. Restricted to the owner of the annotation
 * within the current active wordbook.
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

  const { id } = await params;

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { error } = await sql`
    DELETE FROM word_annotations
    WHERE id = ${id}::uuid
      AND user_id = ${userId}
      AND wordbook_id = ${wordbookId}
  `;

  if (error) {
    return apiErrorResponse(error, "api/annotations/[id]");
  }

  return new NextResponse(null, { status: 204 });
}
