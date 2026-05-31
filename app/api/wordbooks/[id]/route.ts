import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { deleteWordbook, renameWordbook } from "@/lib/wordbook";
import { z } from "zod";

const renameSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const { id } = await params;
  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;

  try {
    await deleteWordbook(supabase, userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks/[id]",
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const { id } = await params;
  const body = renameSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;

  try {
    await renameWordbook(supabase, userId, id, body.data.name, body.data.description);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks/[id]",
    );
  }
}
