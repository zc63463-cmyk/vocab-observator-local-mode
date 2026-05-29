import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planWordSync } from "@/lib/sync/import-plan";
import { parseWordMarkdown } from "@/lib/sync/parseMarkdown";

function parseFixture(name: string) {
  const content = readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
  return parseWordMarkdown(content, `Wiki/L0_单词集合/${name}`);
}

describe("planWordSync", () => {
  it("treats identical imports as unchanged", () => {
    const ability = parseFixture("ability.md");
    const plan = planWordSync(
      [
        {
          content_hash: ability.contentHash,
          is_deleted: false,
          slug: ability.slug,
          source_path: ability.sourcePath,
        },
      ],
      [ability],
    );

    expect(plan.create).toHaveLength(0);
    expect(plan.update).toHaveLength(0);
    expect(plan.unchanged).toHaveLength(1);
    expect(plan.softDelete).toHaveLength(0);
    expect(plan.skip).toHaveLength(0);
  });

  it("marks changed content as update and missing files as soft delete", () => {
    const abandon = parseFixture("abandon.md");
    const abstract = parseFixture("abstract.md");
    const changedAbandon = {
      ...abandon,
      contentHash: `${abandon.contentHash.slice(0, 63)}0`,
    };

    const plan = planWordSync(
      [
        {
          content_hash: "older",
          is_deleted: false,
          slug: abandon.slug,
          source_path: abandon.sourcePath,
        },
        {
          content_hash: abstract.contentHash,
          is_deleted: false,
          slug: abstract.slug,
          source_path: abstract.sourcePath,
        },
      ],
      [changedAbandon],
    );

    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].slug).toBe("abandon");
    expect(plan.softDelete).toHaveLength(1);
    expect(plan.softDelete[0].slug).toBe("abstract");
    expect(plan.skip).toHaveLength(0);
  });

  it("skips lower-priority corpus when slug conflict with higher-priority existing word", () => {
    const abandon = parseFixture("abandon.md");
    // Existing word is from kaoyan (L0_ prefix = priority 0)
    const existing = {
      content_hash: "existing-hash",
      is_deleted: false,
      slug: "abandon",
      source_path: "Wiki/L0_基础词/abandon.md",
    };
    // Incoming word is from ielts (L1_ prefix = priority 1)
    const incoming = {
      ...abandon,
      sourcePath: "Wiki/L1_雅思词汇/abandon.md",
    };

    const plan = planWordSync([existing], [incoming]);

    expect(plan.skip).toHaveLength(1);
    expect(plan.skip[0].word.slug).toBe("abandon");
    expect(plan.skip[0].reason).toContain("cross-corpus skip");
    expect(plan.create).toHaveLength(0);
    expect(plan.update).toHaveLength(0);
    expect(plan.unchanged).toHaveLength(0);
  });

  it("allows higher-priority incoming word to override lower-priority existing word", () => {
    const abandon = parseFixture("abandon.md");
    // Existing word is from ielts (priority 1)
    const existing = {
      content_hash: "existing-hash",
      is_deleted: false,
      slug: "abandon",
      source_path: "Wiki/L1_雅思词汇/abandon.md",
    };
    // Incoming word is from kaoyan (priority 0)
    const incoming = {
      ...abandon,
      sourcePath: "Wiki/L0_基础词/abandon.md",
    };

    const plan = planWordSync([existing], [incoming]);

    expect(plan.skip).toHaveLength(0);
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].slug).toBe("abandon");
  });

  it("allows same-corpus update (different source_path within same prefix)", () => {
    const abandon = parseFixture("abandon.md");
    const existing = {
      content_hash: "existing-hash",
      is_deleted: false,
      slug: "abandon",
      source_path: "Wiki/L0_基础词/abandon.md",
    };
    const incoming = {
      ...abandon,
      contentHash: `${abandon.contentHash.slice(0, 63)}0`,
      sourcePath: "Wiki/L0_单词集合/abandon.md",
    };

    const plan = planWordSync([existing], [incoming]);

    expect(plan.skip).toHaveLength(0);
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].slug).toBe("abandon");
  });
});
