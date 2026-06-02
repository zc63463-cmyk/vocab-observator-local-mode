"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FreeZenWordPicker } from "@/components/review/free/FreeZenWordPicker";
import { springs } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { useWordbook } from "@/components/wordbook/WordbookContext";

interface FreeZenCandidate {
  id: string;
  slug: string;
  title: string;
  lemma: string;
  ipa: string | null;
  short_definition: string | null;
  metadata: unknown;
  prefixes?: string[];
  suffixes?: string[];
}

export default function FreeZenSelectPage() {
  const router = useRouter();
  const { activeWordbook } = useWordbook();
  const activeWordbookId = activeWordbook?.id ?? null;
  const [candidates, setCandidates] = useState<FreeZenCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const url = activeWordbookId
          ? `/api/review/zen-candidates?wordbookId=${encodeURIComponent(activeWordbookId)}`
          : "/api/review/zen-candidates";
        const res = await fetch(url);
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error ?? "加载词条失败");
        }
        const payload = (await res.json()) as { items: FreeZenCandidate[] };
        if (!mounted) return;
        setCandidates(payload.items ?? []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "加载词条失败");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [activeWordbookId]);

  const handleStart = useCallback((selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    const ids = selectedIds.join(",");
    router.push(`/review/free/zen?wordIds=${encodeURIComponent(ids)}`);
  }, [router]);

  const handleExit = useCallback(() => {
    router.push("/review");
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-sm text-[var(--color-ink-soft)] opacity-60">
          正在加载复习队列…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel rounded-[1.75rem] p-6 text-center">
        <p className="text-sm text-[var(--color-accent-2)]">{error}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => window.location.reload()}>
            再试一次
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleExit}>
            返回复习页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", ...springs.smooth }}
    >
      <FreeZenWordPicker
        candidates={candidates}
        onStart={handleStart}
        onExit={handleExit}
      />
    </motion.div>
  );
}
