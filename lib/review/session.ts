import type { SupabaseClient } from "@/lib/db";
import type { Database } from "@/types/database.types";
// Import the shared, TZ-pinned version so session-day cutoffs match every
// other "today" caller (`@/lib/dashboard.ts`, hydration-safe formatters).
// See `@/lib/utils.ts` startOfTodayIso JSDoc for why the local copy used to
// produce an 8-hour drift between Vercel SSR (UTC) and a Shanghai CSR.
import { startOfTodayIso } from "@/lib/utils";

type OwnerSupabaseClient = SupabaseClient<Database>;

export async function getOrCreateReviewSession(
  supabase: OwnerSupabaseClient,
  userId: string,
  wordbookId: string,
): Promise<{ session: { cards_seen: number; id: string; started_at: string } | null; error: { message: string } | null }> {
  const todayIso = startOfTodayIso();
  const { data: existingSession, error } = await supabase
    .from("sessions")
    .select("id, started_at, cards_seen, mode, ended_at")
    .eq("user_id", userId)
    .eq("wordbook_id", wordbookId)
    .eq("mode", "review")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { session: null, error };
  }

  if (existingSession && existingSession.started_at >= todayIso) {
    return {
      session: {
        cards_seen: existingSession.cards_seen,
        id: existingSession.id,
        started_at: existingSession.started_at,
      },
      error: null,
    };
  }

  if (existingSession) {
    const { error: endError } = await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", existingSession.id);

    if (endError) {
      return { session: null, error: endError };
    }
  }

  const { data: session, error: createError } = await supabase
    .from("sessions")
    .insert({
      mode: "review",
      user_id: userId,
      wordbook_id: wordbookId,
    })
    .select("id, started_at, cards_seen")
    .single();

  if (createError) {
    return { session: null, error: createError };
  }

  return { session, error: null };
}

export async function getActiveReviewSession(
  supabase: OwnerSupabaseClient,
  userId: string,
  wordbookId: string,
) {
  const todayIso = startOfTodayIso();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, started_at, cards_seen")
    .eq("user_id", userId)
    .eq("wordbook_id", wordbookId)
    .eq("mode", "review")
    .is("ended_at", null)
    .gte("started_at", todayIso)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function incrementSessionCardsSeen(
  supabase: OwnerSupabaseClient,
  sessionId: string,
) {
  const { data: session, error } = await supabase
    .from("sessions")
    .select("cards_seen")
    .eq("id", sessionId)
    .single();

  if (error) {
    throw error;
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      cards_seen: session.cards_seen + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateError) {
    throw updateError;
  }
}
