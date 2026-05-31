import { NextResponse, type NextRequest } from "next/server";
import { getOwnerWordSidebarData } from "@/lib/owner-word-sidebar";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { getOrCreateDefaultWordbook } from "@/lib/wordbook";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const { slug: wordId } = await context.params;
  const { searchParams } = new URL(request.url);
  const wordbookId = searchParams.get("wordbookId")
    ?? await getOrCreateDefaultWordbook(ownerSession.supabase!, ownerSession.user!.id);

  return NextResponse.json(
    await getOwnerWordSidebarData(
      ownerSession.supabase!,
      ownerSession.user!.id,
      wordId,
      wordbookId,
    ),
  );
}
