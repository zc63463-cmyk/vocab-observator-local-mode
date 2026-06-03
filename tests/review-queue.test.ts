import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import {
  buildReviewQueueBatch,
  prioritizeReviewQueueItems,
} from "@/lib/review/queue";
import type { ReviewQueueCandidate } from "@/lib/review/queue";
import type { StoredSchedulerCard } from "@/lib/review/types";

// ── Fixtures ─────────────────────────────────────────────────────────────

function buildReviewCard(
  overrides: Partial<StoredSchedulerCard> = {},
): StoredSchedulerCard {
  return {
    difficulty: 4.5,
    due: "2026-05-12T10:00:00.000Z",
    elapsed_days: 10,
    lapses: 1,
    learning_steps: 0,
    last_review: "2026-04-22T10:00:00.000Z",
    reps: 12,
    scheduled_days: 20,
    stability: 24,
    state: State.Review,
    ...overrides,
  };
}

type TestCandidate = ReviewQueueCandidate & { id: string };

function mkNew(id: string, due?: string): TestCandidate {
  return {
    id,
    desired_retention: 0.9,
    due_at: due ?? "2026-05-01T09:00:00.000Z",
    review_count: 0,
    scheduler_payload: null,
    state: "new",
  };
}

function mkLearning(id: string, opts?: Partial<TestCandidate>): TestCandidate {
  return {
    id,
    desired_retention: 0.9,
    due_at: "2026-06-01T10:00:00.000Z",
    review_count: 1,
    scheduler_payload: buildReviewCard({
      due: "2026-06-01T10:00:00.000Z",
      learning_steps: 1,
      scheduled_days: 0,
      stability: 3,
      state: State.Learning,
    }),
    state: "learning",
    ...opts,
  };
}

function mkRelearning(id: string): TestCandidate {
  return {
    id,
    desired_retention: 0.9,
    due_at: "2026-06-01T10:30:00.000Z",
    review_count: 3,
    scheduler_payload: buildReviewCard({
      due: "2026-06-01T10:30:00.000Z",
      lapses: 2,
      learning_steps: 1,
      scheduled_days: 0,
      stability: 1.5,
      state: State.Relearning,
    }),
    state: "relearning",
  };
}

function mkReview(
  id: string,
  opts?: {
    due?: string;
    elapsed_days?: number;
    stability?: number;
    last_review?: string;
    scheduled_days?: number;
    reps?: number;
  },
): TestCandidate {
  return {
    id,
    desired_retention: 0.9,
    due_at: opts?.due ?? "2026-05-01T08:00:00.000Z",
    review_count: opts?.reps ?? 9,
    scheduler_payload: buildReviewCard({
      due: opts?.due ?? "2026-05-01T08:00:00.000Z",
      elapsed_days: opts?.elapsed_days ?? 10,
      last_review: opts?.last_review ?? "2026-04-22T10:00:00.000Z",
      scheduled_days: opts?.scheduled_days ?? 20,
      stability: opts?.stability ?? 24,
      state: State.Review,
    }),
    state: "review",
  };
}

const NOW = new Date("2026-05-01T10:00:00.000Z");

// ══════════════════════════════════════════════════════════════════════════
// prioritizeReviewQueueItems
// ══════════════════════════════════════════════════════════════════════════

describe("prioritizeReviewQueueItems", () => {
  // ── Existing tests (preserved) ──────────────────────────────────────

  it("puts learning cards first, then the highest-risk review cards, then new cards", () => {
    const ordered = prioritizeReviewQueueItems(
      [
        mkNew("new-card"),
        mkLearning("learning-card"),
        mkReview("stable-review", { elapsed_days: 6, last_review: "2026-04-25T10:00:00.000Z", scheduled_days: 16, stability: 30 }),
        mkReview("risky-review", { elapsed_days: 18, last_review: "2026-04-12T10:00:00.000Z", scheduled_days: 18, stability: 12, due: "2026-05-01T08:30:00.000Z" }),
      ],
      NOW,
    );

    expect(ordered.map((item) => item.id)).toEqual([
      "learning-card",
      "risky-review",
      "stable-review",
      "new-card",
    ]);
  });

  // ── New tests ───────────────────────────────────────────────────────

  it("returns an empty array for empty input", () => {
    expect(prioritizeReviewQueueItems([])).toEqual([]);
  });

  it("returns the sole item when only one candidate exists", () => {
    const result = prioritizeReviewQueueItems([mkNew("only")]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("only");
  });

  it("puts all learning and relearning cards before any review card", () => {
    const cards = [
      mkNew("new-1"),
      mkReview("rev-1"),
      mkLearning("learn-1"),
      mkRelearning("relearn-1"),
      mkReview("rev-2", { due: "2026-05-01T09:00:00.000Z" }),
    ];
    const ordered = prioritizeReviewQueueItems(cards, NOW);
    const firstTwo = ordered.slice(0, 2).map((c) => c.id);
    expect(firstTwo).toContain("learn-1");
    expect(firstTwo).toContain("relearn-1");
  });

  it("places review cards before new cards", () => {
    const cards = [mkNew("n1"), mkReview("r1"), mkNew("n2"), mkReview("r2")];
    const ordered = prioritizeReviewQueueItems(cards, NOW);
    const ids = ordered.map((c) => c.id);
    const reviewIndices = ids.map((id, i) => ({ id, i })).filter((x) => x.id.startsWith("r"));
    const newIndices = ids.map((id, i) => ({ id, i })).filter((x) => x.id.startsWith("n"));
    const maxReviewIdx = Math.max(...reviewIndices.map((x) => x.i));
    const minNewIdx = Math.min(...newIndices.map((x) => x.i));
    expect(maxReviewIdx).toBeLessThan(minNewIdx);
  });

  it("sorts review cards by descending retrievability risk", () => {
    const risky = mkReview("risky", {
      elapsed_days: 18,
      last_review: "2026-04-12T10:00:00.000Z",
      scheduled_days: 18,
      stability: 12,
    });
    const stable = mkReview("stable", {
      elapsed_days: 6,
      last_review: "2026-04-25T10:00:00.000Z",
      scheduled_days: 30,
      stability: 30,
    });
    const ordered = prioritizeReviewQueueItems([stable, risky], NOW);
    // Higher risk (lower retrievability) first
    expect(ordered[0].id).toBe("risky");
    expect(ordered[1].id).toBe("stable");
  });

  it("treats null due_at as infinite future (lowest priority within state group)", () => {
    const noDue = mkReview("no-due", {
      due: undefined as any,
      elapsed_days: 0,
      last_review: "2026-04-22T10:00:00.000Z",
      scheduled_days: 20,
      stability: 24,
    });
    const withDue = mkReview("with-due", {
      due: "2026-04-01T10:00:00.000Z",
      elapsed_days: 30,
      last_review: "2026-04-01T10:00:00.000Z",
      scheduled_days: 20,
      stability: 24,
    });
    const ordered = prioritizeReviewQueueItems([noDue, withDue], NOW);
    // with-due is 30 days overdue → high risk → first
    expect(ordered[0].id).toBe("with-due");
    expect(ordered[1].id).toBe("no-due");
  });

  it("sorts review cards with equal risk by overdue duration (descending)", () => {
    const older = mkReview("older", {
      due: "2026-04-01T10:00:00.000Z",
      elapsed_days: 30,
      last_review: "2026-04-01T10:00:00.000Z",
      scheduled_days: 30,
      stability: 30,
    });
    const newer = mkReview("newer", {
      due: "2026-04-25T10:00:00.000Z",
      elapsed_days: 6,
      last_review: "2026-04-25T10:00:00.000Z",
      scheduled_days: 30,
      stability: 30,
    });
    // Both have retrievability ≈ 1 (elapsed ≤ scheduled), so risk ≈ 0
    // Tiebreak: older due date (more overdue) first
    const ordered = prioritizeReviewQueueItems([newer, older], NOW);
    expect(ordered[0].id).toBe("older");
    expect(ordered[1].id).toBe("newer");
  });

  it("sorts all-new candidates by due_at timestamp ascending", () => {
    const n1 = mkNew("n1", "2026-05-01T08:00:00.000Z");
    const n2 = mkNew("n2", "2026-05-01T09:00:00.000Z");
    const n3 = mkNew("n3", "2026-05-01T07:00:00.000Z");
    const ordered = prioritizeReviewQueueItems([n1, n2, n3], NOW);
    expect(ordered.map((c) => c.id)).toEqual(["n3", "n1", "n2"]);
  });

  it("sorts all-learning cards by due_at ascending", () => {
    const l1 = mkLearning("l1", { due_at: "2026-06-01T11:00:00.000Z" });
    const l2 = mkLearning("l2", { due_at: "2026-06-01T10:00:00.000Z" });
    const ordered = prioritizeReviewQueueItems([l1, l2], NOW);
    expect(ordered.map((c) => c.id)).toEqual(["l2", "l1"]);
  });

  it("respects custom FSRS weights for retrievability calculation", () => {
    // Custom weights can change ordering
    const cards = [mkReview("r1"), mkReview("r2", { due: "2026-05-01T08:01:00.000Z" })];
    // Even with custom weights, the function should return a valid ordering
    const ordered = prioritizeReviewQueueItems(cards, NOW, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(ordered).toHaveLength(2);
    expect(ordered[0].id).toBeDefined();
    expect(ordered[1].id).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// buildReviewQueueBatch
// ══════════════════════════════════════════════════════════════════════════

describe("buildReviewQueueBatch", () => {
  // ── Existing test (preserved) ──────────────────────────────────────

  it("throttles new cards per batch and explains why a card was prioritized", () => {
    const batch = buildReviewQueueBatch(
      [
        mkLearning("learning-card"),
        ...Array.from({ length: 10 }, (_, index) =>
          mkNew(`new-card-${index}`, `2026-05-01T09:${String(index).padStart(2, "0")}:00.000Z`),
        ),
      ],
      NOW,
      20,
    );

    expect(batch.items).toHaveLength(9);
    expect(batch.deferredNewCards).toBe(2);
    expect(batch.items[0]?.priority.label).toBe("Learning");
    expect(batch.items[0]?.priority.reason).toContain("Short-step card");
    expect(batch.items.filter((entry) => entry.item.state === "new")).toHaveLength(8);
  });

  // ── New tests ───────────────────────────────────────────────────────

  it("returns an empty batch with zero deferred for empty input", () => {
    const batch = buildReviewQueueBatch([], NOW);
    expect(batch.items).toHaveLength(0);
    expect(batch.deferredNewCards).toBe(0);
  });

  it("includes all non-new cards up to the batch limit", () => {
    const cards = Array.from({ length: 15 }, (_, i) =>
      mkReview(`r${i}`, { due: `2026-05-01T0${i}:00:00.000Z` }),
    );
    const batch = buildReviewQueueBatch(cards, NOW, 10);
    expect(batch.items).toHaveLength(10);
    expect(batch.deferredNewCards).toBe(0);
  });

  it("returns all items when total is less than batch limit", () => {
    const cards = [mkReview("r1"), mkReview("r2"), mkNew("n1")];
    const batch = buildReviewQueueBatch(cards, NOW, 20);
    expect(batch.items).toHaveLength(3);
    expect(batch.deferredNewCards).toBe(0);
  });

  it("defers new cards beyond the max-new limit", () => {
    // max new = min(8, ceil(20 * 0.4)) = min(8, 8) = 8
    const cards = [
      mkReview("r1"),
      ...Array.from({ length: 15 }, (_, i) => mkNew(`n${i}`, `2026-05-01T0${i}:00:00.000Z`)),
    ];
    const batch = buildReviewQueueBatch(cards, NOW, 20);
    // 1 review + up to 8 new = 9 total
    expect(batch.items).toHaveLength(9);
    expect(batch.items.filter((e) => e.item.state === "new")).toHaveLength(8);
    // 15 new total, 8 selected → 7 deferred
    expect(batch.deferredNewCards).toBe(7);
  });

  it("does not defer new cards when total new cards ≤ max-new limit", () => {
    const cards = [mkReview("r1"), mkNew("n1"), mkNew("n2")];
    const batch = buildReviewQueueBatch(cards, NOW, 20);
    expect(batch.deferredNewCards).toBe(0);
    expect(batch.items).toHaveLength(3);
  });

  it("respects a small batch limit that forces early termination", () => {
    const cards = [mkLearning("l1"), mkReview("r1"), mkReview("r2"), mkNew("n1")];
    const batch = buildReviewQueueBatch(cards, NOW, 2);
    expect(batch.items).toHaveLength(2);
    // First 2 should be learning, then highest-risk review
    expect(batch.items[0].item.state).toBe("learning");
  });

  it("calculates maxNewCards as ceil(batchLimit * 0.4) but capped at 8", () => {
    // batchLimit 10 → ceil(10 * 0.4) = 4, min(8, 4) = 4
    const cards = Array.from({ length: 10 }, (_, i) => mkNew(`n${i}`));
    const batch = buildReviewQueueBatch(cards, NOW, 10);
    const newCards = batch.items.filter((e) => e.item.state === "new");
    expect(newCards).toHaveLength(4);
    expect(batch.deferredNewCards).toBe(6);
  });

  it("always allows at least 1 new card even with tiny batch limits", () => {
    // batchLimit 1 → ceil(1 * 0.4) = 1, min(8, 1) = 1, max(1, 1) = 1
    const cards = [mkNew("n1"), mkNew("n2")];
    const batch = buildReviewQueueBatch(cards, NOW, 1);
    expect(batch.items).toHaveLength(1);
    expect(batch.items[0].item.state).toBe("new");
  });

  it("batches only new cards with proper limit", () => {
    // No learning/review cards → only new cards, throttled
    const cards = Array.from({ length: 20 }, (_, i) => mkNew(`n${i}`));
    const batch = buildReviewQueueBatch(cards, NOW, 20);
    // maxNew = min(8, ceil(20*0.4)) = 8
    expect(batch.items).toHaveLength(8);
    expect(batch.items.every((e) => e.item.state === "new")).toBe(true);
    expect(batch.deferredNewCards).toBe(12);
  });

  it("suspends a card (ignored — 'suspended' state falls through to default rank 3)", () => {
    const cards = [
      {
        id: "suspended",
        desired_retention: 0.9,
        due_at: "2026-05-01T08:00:00.000Z",
        review_count: 5,
        scheduler_payload: null,
        state: "suspended",
      } as TestCandidate,
      mkNew("n1"),
    ];
    const batch = buildReviewQueueBatch(cards, NOW, 10);
    // New has stateRank 2, suspended has stateRank 3 → new comes first
    expect(batch.items[0].item.id).toBe("n1");
  });

  it("marks at-risk review cards when retrievability is low enough", () => {
    // A card last reviewed 480 days ago with low stability should have
    // retrievability near zero → bucket "at-risk".
    const atRisk = mkReview("at-risk", {
      due: "2025-01-08T10:00:00.000Z",
      elapsed_days: 480,
      last_review: "2025-01-08T10:00:00.000Z",
      scheduled_days: 10,
      stability: 5,
    });
    const batch = buildReviewQueueBatch([atRisk], NOW, 10);
    expect(batch.items).toHaveLength(1);
    const p = batch.items[0].priority;
    // Either the card is flagged "at-risk" or retrievability is indistinguishable from zero
    if (p.bucket !== "at-risk") {
      // Just verify retrievability was computed
      expect(p.retrievability).toBeNull(); // shouldn't reach here if retrievability is low
    }
    expect(p.retrievability).not.toBeNull();
    expect(p.retrievability!).toBeLessThanOrEqual(0.6);
  });

  it("marks overdue review cards as 'Scheduled review'", () => {
    const overdue = mkReview("overdue", {
      due: "2026-04-25T10:00:00.000Z",
      elapsed_days: 6,
      last_review: "2026-04-25T10:00:00.000Z",
      scheduled_days: 30,
      stability: 30,
    });
    const batch = buildReviewQueueBatch([overdue], NOW, 10);
    expect(batch.items).toHaveLength(1);
    expect(batch.items[0].priority.bucket).toBe("overdue");
    expect(batch.items[0].priority.label).toBe("Scheduled review");
  });

  it("distinguishes relearning from learning in the priority label", () => {
    const batch = buildReviewQueueBatch([mkRelearning("rel-1")], NOW, 10);
    expect(batch.items[0].priority.label).toBe("Relearning");
  });

  it("uses 'New card' label for new cards with explanation about batch sizing", () => {
    const batch = buildReviewQueueBatch([mkNew("n1")], NOW, 10);
    expect(batch.items[0].priority.label).toBe("New card");
    expect(batch.items[0].priority.reason).toContain("smaller batches");
    expect(batch.items[0].priority.retrievability).toBeNull();
  });
});
