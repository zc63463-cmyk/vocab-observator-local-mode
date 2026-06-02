"use client";

import { motion } from "framer-motion";
import { useZenReviewContext } from "./ZenReviewProvider";
import { RATING_CONFIG } from "./types";
import type { RatingKey } from "./types";

const RATING_STYLES: Record<RatingKey, { bg: string; text: string; border: string }> = {
  again: {
    bg: "bg-[var(--color-rating-again-bg)]",
    text: "text-[var(--color-accent-2)]",
    border: "border-[var(--color-rating-again-border)]",
  },
  hard: {
    bg: "bg-[var(--color-rating-hard-bg)]",
    text: "text-[var(--color-ink)]",
    border: "border-[var(--color-rating-hard-border)]",
  },
  good: {
    bg: "bg-[var(--color-surface-muted)]",
    text: "text-[var(--color-accent)]",
    border: "border-[var(--color-rating-good-border)]",
  },
  easy: {
    bg: "bg-[var(--color-rating-easy-bg)]",
    text: "text-[var(--color-accent)]",
    border: "border-[var(--color-rating-easy-border)]",
  },
};

export function ZenRatingButtons() {
  const { rate, phase, isAnimating } = useZenReviewContext();
  const canRate = phase === "back" && !isAnimating;

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {(Object.keys(RATING_CONFIG) as RatingKey[]).map((key) => {
        const config = RATING_CONFIG[key];
        const styles = RATING_STYLES[key];
        
        return (
          <motion.button
            key={key}
            type="button"
            disabled={!canRate}
            onClick={() => rate(key)}
            className={`
              flex min-w-[80px] flex-col items-center justify-center rounded-2xl border px-4 py-3
              transition-all duration-150
              ${styles.bg} ${styles.text} ${styles.border}
              disabled:cursor-not-allowed disabled:opacity-50
              hover:scale-105 hover:opacity-90 active:scale-95
              sm:min-w-[100px] sm:px-6 sm:py-4
            `}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-sm font-semibold sm:text-base">
              {config.label}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[10px] opacity-70 sm:text-xs">
              <kbd className="rounded border border-current/20 px-1">{config.key}</kbd>
              <span className="hidden sm:inline">/</span>
              <kbd className="hidden rounded border border-current/20 px-1 sm:inline">{config.vimKey}</kbd>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
