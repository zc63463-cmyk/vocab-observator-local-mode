"use client";

import { useCallback, useRef, useState } from "react";
import type { ReviewQueueItem, ReviewQueueStats, ReviewSessionSummary } from "@/lib/review/types";
import type { RatingKey } from "./types";

interface QueueResponse {
  items: ReviewQueueItem[];
  session: ReviewSessionSummary | null;
  stats: ReviewQueueStats | null;
}

interface UseZenReviewReturn {
  items: ReviewQueueItem[];
  setItems: React.Dispatch<React.SetStateAction<ReviewQueueItem[]>>;
  session: ReviewSessionSummary | null;
  setSession: React.Dispatch<React.SetStateAction<ReviewSessionSummary | null>>;
  stats: ReviewQueueStats | null;
  setStats: React.Dispatch<React.SetStateAction<ReviewQueueStats | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  fetchQueue: () => Promise<QueueResponse>;
  submitRating: (item: ReviewQueueItem, rating: RatingKey) => Promise<string>;
  submitUndo: (reviewLogId: string) => Promise<ReviewQueueItem | null>;
  skipItem: (item: ReviewQueueItem) => Promise<ReviewQueueItem | null>;
}

export function useZenReview({
  mode = "queue",
  wordIds,
}: { mode?: "queue" | "free"; wordIds?: string[] } = {}): UseZenReviewReturn {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [session, setSession] = useState<ReviewSessionSummary | null>(null);
  const [stats, setStats] = useState<ReviewQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Free-mode only: maps synthetic reviewLogId → ReviewQueueItem so undo can
  // restore the card locally without any DB round-trip.
  const freeLogMapRef = useRef<Map<string, ReviewQueueItem>>(new Map());

  const fetchQueue = useCallback(async (): Promise<QueueResponse> => {
    if (mode === "free") {
      const ids = wordIds?.join(",") ?? "";
      const response = await fetch(
        `/api/review/free/queue?wordIds=${encodeURIComponent(ids)}`,
      );
      const payload = (await response.json()) as QueueResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "加载自由复习队列失败");
      }
      return {
        items: payload.items ?? [],
        session: payload.session ?? null,
        stats: payload.stats ?? null,
      };
    }

    const response = await fetch("/api/review/queue");
    const payload = (await response.json()) as QueueResponse & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "加载复习队列失败");
    }
    return {
      items: payload.items ?? [],
      session: payload.session ?? null,
      stats: payload.stats ?? null,
    };
  }, [mode, wordIds]);

  const submitRating = useCallback(
    async (item: ReviewQueueItem, rating: RatingKey): Promise<string> => {
      if (!session) throw new Error("无活跃会话");

      if (mode === "free") {
        const response = await fetch("/api/review/free/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progressId: item.progress_id,
            rating,
            sessionId: session.id,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "提交评分失败");
        }
        const reviewLogId = payload.reviewLogId as string;
        // Remember the item so undo can restore it locally.
        freeLogMapRef.current.set(reviewLogId, item);
        return reviewLogId;
      }

      const response = await fetch("/api/review/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: item.progress_id,
          rating,
          sessionId: session.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "提交评分失败");
      }
      return payload.reviewLogId as string;
    },
    [session, mode],
  );

  const submitUndo = useCallback(
    async (reviewLogId: string): Promise<ReviewQueueItem | null> => {
      if (!session) throw new Error("无活跃会话");

      if (mode === "free") {
        const item = freeLogMapRef.current.get(reviewLogId) ?? null;
        freeLogMapRef.current.delete(reviewLogId);
        return item;
      }

      const response = await fetch("/api/review/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewLogId,
          sessionId: session.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "撤销失败");
      }
      return (payload.restoredItem as ReviewQueueItem) ?? null;
    },
    [session, mode],
  );

  const skipItem = useCallback(
    async (item: ReviewQueueItem): Promise<ReviewQueueItem | null> => {
      if (!session) return null;

      if (mode === "free") {
        return item;
      }

      const response = await fetch("/api/review/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: item.progress_id,
          sessionId: session.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "跳过失败");
      }

      return item;
    },
    [session, mode],
  );

  return {
    items,
    setItems,
    session,
    setSession,
    stats,
    setStats,
    loading,
    setLoading,
    error,
    setError,
    fetchQueue,
    submitRating,
    submitUndo,
    skipItem,
  };
}
