import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import {
  createWordbook,
  getUserWordbooksWithStats,
} from "@/lib/wordbook";
import { wordbookCreateSchema } from "@/lib/validation/schemas";

export async function GET() {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;

  try {
    const wordbooks = await getUserWordbooksWithStats(supabase, userId);
    return NextResponse.json({ wordbooks });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks",
    );
  }
}

export async function POST(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const body = wordbookCreateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;

  try {
    const wordbook = await createWordbook(
      supabase,
      userId,
      body.data.name,
      body.data.description,
    );
    return NextResponse.json({ wordbook });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks",
    );
  }
}
