import { NextResponse, type NextRequest } from "next/server";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { reviewRatingSchema } from "@/lib/validation/schemas";

const freeAnswerSchema = {
  safeParse: (value: unknown) => {
    try {
      const obj = value as Record<string, unknown>;
      const parsed = reviewRatingSchema.safeParse(obj.rating);
      if (!parsed.success) {
        return { success: false, error: { flatten: () => ({ fieldErrors: { rating: ["invalid rating"] } }) } };
      }
      if (typeof obj.progressId !== "string" || obj.progressId.length === 0) {
        return { success: false, error: { flatten: () => ({ fieldErrors: { progressId: ["required"] } }) } };
      }
      if (typeof obj.sessionId !== "string" || obj.sessionId.length === 0) {
        return { success: false, error: { flatten: () => ({ fieldErrors: { sessionId: ["required"] } }) } };
      }
      return {
        success: true,
        data: {
          progressId: obj.progressId,
          rating: parsed.data,
          sessionId: obj.sessionId,
        },
      };
    } catch {
      return { success: false, error: { flatten: () => ({ fieldErrors: { _root: ["invalid body"] } }) } };
    }
  },
};

export async function POST(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const parsed = freeAnswerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error?.flatten?.() ?? "invalid request" },
      { status: 400 },
    );
  }

  // Free Zen mode: no DB writes. Return a synthetic reviewLogId.
  const reviewLogId = `free-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return NextResponse.json({
    ok: true,
    nextDueAt: new Date().toISOString(),
    state: "new",
    reviewLogId,
  });
}
