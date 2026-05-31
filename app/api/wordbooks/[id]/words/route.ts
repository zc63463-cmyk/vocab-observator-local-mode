import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import {
  addWordsToWordbook,
  getWordbookWordIds,
  removeWordsFromWordbook,
} from "@/lib/wordbook";
import { wordbookAddWordsSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const { id } = await params;
  const supabase = ownerSession.supabase!;

  try {
    const wordIds = await getWordbookWordIds(supabase, id);
    return NextResponse.json({ wordIds });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks/[id]/words",
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const { id } = await params;
  const body = wordbookAddWordsSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const supabase = ownerSession.supabase!;

  try {
    await addWordsToWordbook(supabase, id, body.data.wordIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks/[id]/words",
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const { id } = await params;
  const body = wordbookAddWordsSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const supabase = ownerSession.supabase!;

  try {
    await removeWordsFromWordbook(supabase, id, body.data.wordIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks/[id]/words",
    );
  }
}
