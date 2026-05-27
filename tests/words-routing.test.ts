import { describe, expect, it } from "vitest";
import { buildWordDetailHref, buildWordsListHref } from "@/lib/words-routing";

describe("words routing helpers", () => {
  it("carries active word filters into detail links", () => {
    const searchParams = new URLSearchParams();
    searchParams.set("q", "state");
    searchParams.set("semantic", "abstract");
    searchParams.set("freq", "B2");
    searchParams.set("review", "due");
    searchParams.set("ignored", "1");

    expect(buildWordDetailHref("status", searchParams)).toBe(
      "/p/status?q=state&semantic=abstract&freq=B2&review=due",
    );
  });

  it("rebuilds the filtered words list href from detail search params", () => {
    expect(
      buildWordsListHref({
        freq: "B2",
        q: "state",
        review: "due",
        semantic: "abstract",
      }),
    ).toBe("/words?q=state&semantic=abstract&freq=B2&review=due");
  });

  it("falls back to the plain words index when no filters are present", () => {
    expect(buildWordDetailHref("status")).toBe("/p/status");
    expect(buildWordsListHref()).toBe("/words");
  });
});
