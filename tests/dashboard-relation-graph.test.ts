import { describe, it, expect } from "vitest";
import { buildRelationGraph, type RelationGraphRow } from "@/lib/dashboard";

function row(slug: string, lemma: string, metadata: unknown): RelationGraphRow {
  return { words: { slug, lemma, metadata: metadata as any } };
}

describe("buildRelationGraph", () => {
  it("returns empty graph for empty rows", () => {
    expect(buildRelationGraph([])).toEqual({});
  });

  it("returns empty graph when all rows have null words", () => {
    const rows: RelationGraphRow[] = [{ words: null }];
    expect(buildRelationGraph(rows)).toEqual({});
  });

  it("returns empty graph for words without metadata", () => {
    const rows = [row("abc-123", "test", null)];
    expect(buildRelationGraph(rows)).toEqual({});
  });

  it("builds synonym edge via lemma lookup (1:1)", () => {
    const rows = [
      row("id-a", "happy", { synonyms: "glad" }),
      row("id-b", "glad", null),
    ];
    const graph = buildRelationGraph(rows);

    expect(graph["id-a"]).toBeDefined();
    expect(graph["id-a"]).toEqual([
      { slug: "id-b", lemma: "glad", relation: "近义" },
    ]);
    // Undirected: glad should NOT automatically get happy as a neighbor
    // unless glad's own metadata lists happy.
    expect(graph["id-b"]).toBeUndefined();
  });

  it("builds antonym edge via lemma lookup", () => {
    const rows = [
      row("id-a", "hot", { antonyms: "cold" }),
      row("id-b", "cold", null),
    ];
    const graph = buildRelationGraph(rows);

    expect(graph["id-a"]).toEqual([
      { slug: "id-b", lemma: "cold", relation: "反义" },
    ]);
  });

  it("resolves synonym via slug lookup when lemma doesn't match", () => {
    // Some metadata uses slug values instead of lemma names.
    const rows = [
      row("id-a", "run", { synonyms: "id-b" }),
      row("id-b", "jog", null),
    ];
    const graph = buildRelationGraph(rows);

    expect(graph["id-a"]).toBeDefined();
    expect(graph["id-a"]![0].slug).toBe("id-b");
  });

  it("resolves synonym via slugified label (word-root → word_root)", () => {
    // slugifyLabel("word root") → "word-root"
    // labelToSlugs indexes both "word root" and "word-root"
    const rows = [
      row("id-a", "transport", { synonyms: "word root" }),
      row("id-b", "word root", null),
    ];
    const graph = buildRelationGraph(rows);

    expect(graph["id-a"]).toBeDefined();
    expect(graph["id-a"]![0].slug).toBe("id-b");
  });

  it("maps multiple labels (synonym_items array)", () => {
    const rows = [
      row("id-a", "big", { synonym_items: ["large", "huge"] }),
      row("id-b", "large", null),
      row("id-c", "huge", null),
    ];
    const graph = buildRelationGraph(rows);

    expect(graph["id-a"]).toBeDefined();
    expect(graph["id-a"]!.length).toBe(2);
    const slugs = graph["id-a"]!.map((n) => n.slug).sort();
    expect(slugs).toEqual(["id-b", "id-c"]);
  });

  it("skips self-loop (synonym pointing to own slug)", () => {
    const rows = [row("id-a", "happy", { synonyms: "happy" })];
    expect(buildRelationGraph(rows)).toEqual({});
  });

  it("handles multiple slugs sharing the same lemma (multi-match)", () => {
    // If multiple rows have lemma "run", labelToSlugs maps "run" → ["id-a", "id-b"].
    const rows = [
      row("id-a", "run", { synonyms: "run" }),
      row("id-b", "run", null),
    ];
    const graph = buildRelationGraph(rows);

    // "run" resolves to the first non-self match ("id-b").
    expect(graph["id-a"]).toBeDefined();
    expect(graph["id-a"]![0].slug).toBe("id-b");
  });

  it("groups words by shared root and creates bidirectional edges", () => {
    const rows = [
      row("id-a", "inspect", { word_root: "spect" }),
      row("id-b", "respect", { word_root: "spect" }),
    ];
    const graph = buildRelationGraph(rows);

    // Bidirectional edges from shared root "spect"
    expect(graph["id-a"]).toBeDefined();
    expect(graph["id-a"]!.some((n) => n.slug === "id-b" && n.relation === "词根")).toBe(true);
    expect(graph["id-b"]).toBeDefined();
    expect(graph["id-b"]!.some((n) => n.slug === "id-a" && n.relation === "词根")).toBe(true);
  });

  it("creates edges for 3+ words sharing a root", () => {
    const rows = [
      row("id-a", "inspect", { word_root: "spect" }),
      row("id-b", "respect", { word_root: "spect" }),
      row("id-c", "spectacle", { word_root: "spect" }),
    ];
    const graph = buildRelationGraph(rows);

    expect(graph["id-a"]!.filter((n) => n.relation === "词根").length).toBe(2);
    expect(graph["id-b"]!.filter((n) => n.relation === "词根").length).toBe(2);
    expect(graph["id-c"]!.filter((n) => n.relation === "词根").length).toBe(2);
  });

  it("groups by morphology.parts root kind", () => {
    const rows = [
      row("id-a", "revive", {
        morphology: { parts: [{ text: "viv", kind: "root" }] },
      }),
      row("id-b", "vivid", {
        morphology: { parts: [{ text: "viv", kind: "root" }] },
      }),
    ];
    const graph = buildRelationGraph(rows);

    expect(graph["id-a"]).toBeDefined();
    expect(graph["id-a"]!.some((n) => n.slug === "id-b" && n.relation === "词根")).toBe(true);
  });

  it("ignores root groups with only one member", () => {
    const rows = [
      row("id-a", "unique", { word_root: "uniq" }),
    ];
    const graph = buildRelationGraph(rows);
    // No edges from single-member root group
    expect(graph["id-a"]).toBeUndefined();
  });

  it("allows both synonym and root edges between same pair (different relations)", () => {
    const rows = [
      row("id-a", "happy", {
        synonyms: "glad",
        word_root: "hap",
      }),
      row("id-b", "glad", { word_root: "hap" }),
    ];
    const graph = buildRelationGraph(rows);

    // id-a should have a synonym edge AND a root edge to id-b — both are valid
    const synonyms = graph["id-a"]!.filter((n) => n.relation === "近义");
    const roots = graph["id-a"]!.filter((n) => n.relation === "词根" && n.slug === "id-b");
    expect(synonyms.length).toBe(1);
    expect(roots.length).toBe(1); // different relation → not a duplicate
  });
});
