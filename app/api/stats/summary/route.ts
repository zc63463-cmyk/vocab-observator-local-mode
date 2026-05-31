import { NextResponse, type NextRequest } from "next/server";
import { getDashboardSummary } from "@/lib/dashboard";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { getOrCreateDefaultWordbook } from "@/lib/wordbook";

export async function GET(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const { searchParams } = new URL(request.url);
  const wordbookId = searchParams.get("wordbookId")
    ?? await getOrCreateDefaultWordbook(ownerSession.supabase!, ownerSession.user!.id);

  return NextResponse.json(await getDashboardSummary(wordbookId));
}
