"use client";

import { FsrsTrainingPanel } from "@/components/review/FsrsTrainingPanel";
import type { DashboardSummary } from "../types";
import { InsightBanner } from "./_shared";

interface FsrsTrainingBodyProps {
  summary: Pick<DashboardSummary, "fsrsTrainingStatus">;
}

/**
 * FSRS 训练 section body.
 *
 * Layout: contextual alert (top) → control panel (FsrsTrainingPanel).
 * The panel itself carries its own status header, progress bar, and
 * weight inspector — we only add the dashboard-level insight here.
 */
export function FsrsTrainingBody({ summary }: FsrsTrainingBodyProps) {
  const { eligibility, weights } = summary.fsrsTrainingStatus;

  const hasTrained = weights != null;
  const sampleSize = weights?.sampleSize ?? 0;
  const growthSinceTrain = hasTrained
    ? Math.max(0, eligibility.totalReviews - sampleSize)
    : 0;
  const shouldRetrain = hasTrained && growthSinceTrain > 200;

  return (
    <div className="space-y-4">
      {/* Contextual alert — driven by dashboard-level heuristics */}
      {shouldRetrain ? (
        <InsightBanner
          tone="warm"
          text={`自上次训练以来新增了 ${growthSinceTrain.toLocaleString()} 条复习日志，模型可能已偏离当前记忆模式。建议重新训练以恢复校准精度。`}
        />
      ) : hasTrained ? (
        <InsightBanner
          tone="cool"
          text="FSRS 权重已训练并生效。系统正基于你的个人遗忘曲线预测最佳复习间隔。"
        />
      ) : eligibility.canTrain ? (
        <InsightBanner
          tone="info"
          text={`复习日志已满足最低训练门槛（${eligibility.minRequired} 条）。点击下方「开始训练」生成个性化遗忘曲线。`}
        />
      ) : (
        <InsightBanner
          tone="info"
          text={`当前复习日志 ${eligibility.totalReviews.toLocaleString()} 条，距离首次训练还差 ${(
            eligibility.minRequired - eligibility.totalReviews
          ).toLocaleString()} 条。继续每日复习，达到门槛后即可生成个性化遗忘曲线。`}
        />
      )}

      <FsrsTrainingPanel initialStatus={summary.fsrsTrainingStatus} />
    </div>
  );
}
