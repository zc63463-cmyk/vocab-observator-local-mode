"use client";

import { useSearchParams } from "next/navigation";
import { ZenReviewPage } from "@/components/review/zen/ZenReviewPage";

export default function FreeZenSessionPage() {
  const searchParams = useSearchParams();
  const wordIdsParam = searchParams.get("wordIds");
  const wordIds = wordIdsParam?.split(",").filter(Boolean) ?? [];

  return <ZenReviewPage mode="free" wordIds={wordIds} />;
}
