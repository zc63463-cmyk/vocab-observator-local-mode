export interface RetentionGapPoint {
  againRate: number;
  date: string;
  gap: number;
  reviewCount: number;
  targetForgettingRate: number;
}

export interface RetentionLoadForecast {
  desiredRetention: number;
  due14d: number;
  due7d: number;
  dueNow: number;
}

export interface RetentionPresetForecast extends RetentionLoadForecast {
  description: string;
  id: "sprint" | "balanced" | "conservative";
  label: string;
}

export interface DailyForecastDay {
  date: string;
  weekday: string;
  dateLabel: string;
  dueCount: number;
  isToday: boolean;
  isPast: boolean;
  actualReviewCount: number | null;
}
