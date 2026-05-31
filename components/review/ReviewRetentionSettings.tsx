"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  getNearestReviewRetentionPreset,
  REVIEW_RETENTION_PRESETS,
} from "@/lib/review/settings";
import { useWordbook } from "@/components/wordbook/WordbookContext";

interface ReviewRetentionSettingsProps {
  averageDesiredRetention: number;
  initialDesiredRetention: number;
  trackedWords: number;
}

function toPercent(value: number) {
  return Math.round(value * 100);
}

export function ReviewRetentionSettings({
  averageDesiredRetention,
  initialDesiredRetention,
  trackedWords,
}: ReviewRetentionSettingsProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { activeWordbook } = useWordbook();
  const [pending, setPending] = useState(false);
  const [retentionPercent, setRetentionPercent] = useState(() =>
    String(toPercent(initialDesiredRetention)),
  );
  const [retuneExisting, setRetuneExisting] = useState(false);

  const parsedPercent = Number(retentionPercent);
  const isValidPercent =
    Number.isFinite(parsedPercent) && parsedPercent >= 70 && parsedPercent <= 99;
  const desiredRetention = isValidPercent
    ? parsedPercent / 100
    : initialDesiredRetention;
  const averagePercent = toPercent(averageDesiredRetention);
  const hasMixedRetention =
    Math.abs(averageDesiredRetention - initialDesiredRetention) >= 0.005;
  const hasChanges =
    (isValidPercent &&
      Math.abs(desiredRetention - initialDesiredRetention) >= 0.0005) ||
    retuneExisting;
  const selectedPreset = useMemo(
    () =>
      getNearestReviewRetentionPreset(
        isValidPercent ? desiredRetention : initialDesiredRetention,
      ),
    [desiredRetention, initialDesiredRetention, isValidPercent],
  );

  function handleSave() {
    if (!isValidPercent || pending) {
      return;
    }

    setPending(true);
    startTransition(async () => {
      try {
        const url = activeWordbook?.id
          ? `/api/review/settings?wordbookId=${activeWordbook.id}`
          : "/api/review/settings";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            desiredRetention,
            retuneExisting,
            wordbookId: activeWordbook?.id,
          }),
        });
        const payload = (await response.json()) as {
          desiredRetention?: number;
          error?: string;
          retunedCount?: number;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "保存设置失败");
        }

        setRetuneExisting(false);
        addToast(
          retuneExisting && payload.retunedCount
            ? `已保存 retention 目标，并重新计算了 ${payload.retunedCount} 张卡片的到期日。`
            : "Retention 目标已保存。",
          "success",
        );
        router.refresh();
      } catch (error) {
        addToast(
          error instanceof Error
            ? error.message
            : "保存设置失败，请重试。",
          "error",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            目标记忆保持率
          </p>
          <p className="text-sm text-[var(--color-ink-soft)]">
            当前方案：{selectedPreset.label}（{toPercent(initialDesiredRetention)}%）
            {hasMixedRetention
              ? `。活跃卡片的平均目标为 ${averagePercent}%，存在混合设置。`
              : "，所有活跃卡片目标一致。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {REVIEW_RETENTION_PRESETS.map((preset) => {
            const presetPercent = toPercent(preset.desiredRetention);
            return (
              <Button
                key={preset.id}
                type="button"
                variant="ghost"
                size="sm"
                active={parsedPercent === presetPercent}
                onClick={() => setRetentionPercent(String(presetPercent))}
              >
                {preset.label} {presetPercent}%
              </Button>
            );
          })}
        </div>
      </div>

      {/* Selected preset description */}
      <div className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink-soft)]">
        {selectedPreset.description}
      </div>

      {/* How to choose — educational block */}
      <div className="mt-3 rounded-[1rem] border border-[rgba(15,111,98,0.12)] bg-[var(--color-surface-muted)] px-4 py-3">
        <p className="text-xs font-semibold text-[var(--color-ink)]">
          📖 如何选择合适的 retention 目标？
        </p>
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--color-ink-soft)]">
          <li>
            <strong className="text-[var(--color-ink)]">冲刺（Sprint, 94%）：</strong>
            间隔短、复习频繁，适合考前突击或核心词汇攻坚。时间成本高。
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">均衡（Balanced, 90%）：</strong>
            大多数用户的推荐起点。兼顾记忆强度与复习效率。
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">保守（Conservative, 85%）：</strong>
            间隔更长、复习量更少，适合时间有限或词汇已较熟悉的阶段。
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">自定义：</strong>
            可在 70%–99% 之间手动输入。数值越高，系统越频繁地要求复习；越低，间隔拉得越长。
          </li>
        </ul>
      </div>

      {/* Input + actions */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            目标 retention（%）
          </span>
          <Input
            type="number"
            min={70}
            max={99}
            step={1}
            value={retentionPercent}
            onChange={(event) => setRetentionPercent(event.target.value)}
            inputMode="numeric"
            aria-invalid={!isValidPercent}
          />
          {!isValidPercent && (
            <span className="text-xs text-[var(--color-accent-2)]">
              请输入 70 到 99 之间的整数。
            </span>
          )}
        </label>

        <div className="flex flex-col justify-between gap-4 rounded-[1.1rem] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <label className="flex items-start gap-3 text-sm text-[var(--color-ink-soft)]">
            <input
              type="checkbox"
              checked={retuneExisting}
              disabled={trackedWords === 0}
              onChange={(event) => setRetuneExisting(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border border-[var(--color-border)] accent-[var(--color-accent)]"
            />
            <span>
              <strong className="text-[var(--color-ink)]">同时重新计算已有卡片的到期日</strong>
              <br />
              勾选后，系统会立即根据新的 retention 目标重新排程所有已存在的复习卡片。
              {trackedWords > 0
                ? ` 当前共 ${trackedWords} 张跟踪卡片。`
                : " 当前尚无跟踪卡片。"}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={!isValidPercent || !hasChanges || pending}
              onClick={handleSave}
            >
              {pending ? "保存中…" : "保存目标"}
            </Button>
            {isValidPercent && (
              <span className="text-xs text-[var(--color-ink-soft)]">
                {parsedPercent > toPercent(initialDesiredRetention)
                  ? "目标提高 → 复习间隔缩短 → 工作量增加"
                  : parsedPercent < toPercent(initialDesiredRetention)
                    ? "目标降低 → 复习间隔拉长 → 工作量减少"
                    : "目标未变更"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
