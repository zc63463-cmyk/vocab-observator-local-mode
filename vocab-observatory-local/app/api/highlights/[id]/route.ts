import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { sql } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const userId = ownerSession.user!.id;
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Highlight id is required" }, { status: 400 });
  }

  const { data, error } = await sql<{ id: string }>`
    DELETE FROM word_highlights
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;

  if (error) {
    return apiErrorResponse(error, "api/highlights/[id]");
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
