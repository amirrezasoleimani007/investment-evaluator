import {
  DEFAULT_SETTINGS,
  normalizeText,
  type AxisBundle,
  type AxisComponent,
  type AxisResult,
  type Band,
  type FinancialModel,
  type ModelSettings,
  type NatureCategory,
} from "./financial-engine";
import {
  BASE_RANKING_WEIGHTS,
  RANKING_METRICS,
  buildDynamicRanking,
  type DynamicRankingRow,
  type RankingMetricResult,
} from "./dynamic-ranking-engine";

export const PERFORMANCE_DIMENSION_KEYS = [
  "growth",
  "profitability",
  "capitalReturn",
  "cashQuality",
  "resilience",
  "workingCapital",
] as const;

export type PerformanceDimensionKey = (typeof PERFORMANCE_DIMENSION_KEYS)[number];
export type ConfidenceLevel = "high" | "suitable" | "limited" | "unreliable";
export type PerformanceClass = "excellent" | "desirable" | "average" | "weak" | "critical";
export type TrendClass =
  | "continuous-improvement"
  | "mild-improvement"
  | "stable"
  | "mild-decline"
  | "continuous-decline";

export interface PerformanceDimension extends AxisResult {
  key: PerformanceDimensionKey;
  absoluteScore: number | null;
  relativeScore: number | null;
  calibratedScore: number | null;
  modelWeight: number;
  adjustedModelWeight: number;
  baseContribution: number;
  yearOverYearChange: number | null;
  portfolioRank: number | null;
}

export interface RiskPenalty {
  key: string;
  label: string;
  value: number;
  cap: number | null;
  severity: "warning" | "critical";
  evidence: string;
}

export interface PerformanceRanking {
  overallRank: number | null;
  peerRank: number | null;
  totalCompanies: number;
  peerCompanies: number;
  percentile: number | null;
  gapToLeader: number | null;
  gapToAverage: number | null;
  gapToMedian: number | null;
  rankChange: number | null;
}

export interface PerformanceResult {
  company: string;
  nature: string;
  year: number;
  modelVersion: string;
  comparisonGroup: string;
  dimensions: Record<PerformanceDimensionKey, PerformanceDimension>;
  absoluteScore: number | null;
  relativeScore: number | null;
  calibratedBaseScore: number | null;
  currentBaseScore: number | null;
  baseCoverage: number;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  weightedHistoryScore: number | null;
  historyMethod: "three-year" | "two-year" | "single-year" | "unavailable";
  historyLabel: string;
  valueCreationAdjustment: number;
  valueCreationEvidence: string;
  trendAdjustment: number;
  trendClass: TrendClass;
  trendLabel: string;
  trendSlope: number | null;
  penalties: RiskPenalty[];
  totalPenalty: number;
  riskCap: number | null;
  finalScore: number | null;
  classification: PerformanceClass | null;
  classificationLabel: string;
  absoluteClassificationLabel: string;
  warnings: string[];
  narrative: string;
  ranking: PerformanceRanking;
  baseAnnualScore: number | null;
  customAnnualScore: number | null;
  dataCoverage: number;
  scoreValidity: "valid" | "temporary" | "insufficient";
  baseRank: number | null;
  customRank: number | null;
}

export interface PerformanceDistribution {
  year: number;
  count: number;
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  minimum: number | null;
  maximum: number | null;
  bins: { from: number; to: number; count: number }[];
  classes: Record<"excellent" | "desirable" | "average" | "weak" | "critical", number>;
  lowShare: number;
  highShare: number;
}

export type PerformanceMatrix = Map<string, Map<number, PerformanceResult>>;

const FORMULAS: Record<PerformanceDimensionKey, string> = {
  growth: "کد ۱۴۴ × ۴۰٪ + کد ۱۸۶ × ۴۵٪ + کد ۱۸۷ × ۱۵٪",
  profitability: "کد ۱۴۶ × ۱۰۰٪",
  capitalReturn: "کد ۱۷۶ × ۱۰۰٪",
  cashQuality: "کد ۱۶۲ × ۴۰٪ + کد ۱۷۵ × ۴۰٪ + کد ۱۶۹ × ۲۰٪",
  resilience: "کد ۱۷۴ × ۵۰٪ + کد ۱۷۳ × ۳۰٪ + کد ۱۶۴ × ۲۰٪",
  workingCapital: "کد ۱۵۲ × ۶۰٪ + کد ۱۶۸ × ۴۰٪",
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length % 2
    ? sorted[Math.floor(sorted.length / 2)]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
}

function standardDeviation(values: number[]): number | null {
  const mean = average(values);
  if (mean === null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function band(score: number | null, settings: ModelSettings): Band | null {
  if (score === null) return null;
  if (score < settings.lowBoundary) return "weak";
  if (score < settings.highBoundary) return "medium";
  return "good";
}

export function natureCategory(nature: string): NatureCategory {
  const normalized = normalizeText(nature);
  if (/مالی|بانک|کارگزار|صندوق|سرمایه.?گذاری/.test(normalized)) return "financial";
  if (/خدمات|پیمان|مشاور|سرویس/.test(normalized)) return "service";
  if (/بازرگان|تجاری|فروش/.test(normalized)) return "trade";
  return "production";
}

function componentFor(indicator: RankingMetricResult["indicators"][number]): AxisComponent {
  return {
    key: indicator.code,
    label: indicator.label,
    variable: `کد متغیر ${indicator.code}`,
    score: indicator.score,
    value: indicator.value,
    unit: indicator.unit,
    originalWeight: indicator.weight,
    adjustedWeight: indicator.effectiveWeight,
    contribution: indicator.contribution,
    method: indicator.issue ?? "امتیاز نرمال‌شده صفر تا ۱۰ موجود در دیتابیس؛ بدون نرمال‌سازی مجدد",
    absoluteScore: indicator.score,
    relativeScore: null,
    adjustedScore: indicator.score,
    comparisonGroup: "مدل مطلق مصوب",
    scoreMethod: "امتیاز ورودی دیتابیس",
    missing: indicator.score === null,
  };
}

function dimensionFor(
  metric: RankingMetricResult,
  settings: ModelSettings,
  previousScore: number | null,
): PerformanceDimension {
  return {
    key: metric.key,
    label: metric.label,
    score: metric.score,
    coverage: metric.coverage,
    band: band(metric.score, settings),
    components: metric.indicators.map(componentFor),
    missing: metric.indicators.filter((indicator) => indicator.score === null).map((indicator) => indicator.label),
    warnings: metric.warnings,
    formula: FORMULAS[metric.key],
    absoluteScore: metric.score,
    relativeScore: null,
    calibratedScore: metric.score,
    modelWeight: metric.configuredWeight,
    adjustedModelWeight: metric.effectiveWeight,
    baseContribution: round(metric.contribution, 4),
    yearOverYearChange:
      metric.score !== null && previousScore !== null ? round(metric.score - previousScore, 2) : null,
    portfolioRank: null,
  };
}

function classify(score: number | null): { key: PerformanceClass | null; label: string } {
  if (score === null) return { key: null, label: "غیرقابل اتکا" };
  if (score >= 8) return { key: "excellent", label: "ممتاز" };
  if (score >= 6.5) return { key: "desirable", label: "مطلوب" };
  if (score >= 5) return { key: "average", label: "متوسط" };
  if (score >= 3.5) return { key: "weak", label: "ضعیف" };
  return { key: "critical", label: "بحرانی" };
}

function confidence(coverage: number): { level: ConfidenceLevel; label: string } {
  if (coverage >= 0.9) return { level: "high", label: "بالا" };
  if (coverage >= 0.75) return { level: "suitable", label: "معتبر" };
  if (coverage >= 0.6) return { level: "limited", label: "موقت با هشدار" };
  return { level: "unreliable", label: "غیرقابل اتکا" };
}

function historyMethod(label: string): PerformanceResult["historyMethod"] {
  if (label.startsWith("سه‌ساله")) return "three-year";
  if (label.startsWith("دوساله")) return "two-year";
  if (label.includes("یک سال")) return "single-year";
  return "unavailable";
}

function slope(rows: DynamicRankingRow[], company: string, year: number): number | null {
  const points = rows
    .filter((row) => row.company === company && row.year <= year && row.score !== null)
    .sort((a, b) => a.year - b.year)
    .slice(-3);
  if (points.length < 2) return null;
  const meanX = average(points.map((point) => point.year)) ?? 0;
  const meanY = average(points.map((point) => point.score as number)) ?? 0;
  const denominator = points.reduce((sum, point) => sum + (point.year - meanX) ** 2, 0);
  if (!denominator) return null;
  return round(points.reduce((sum, point) => sum + (point.year - meanX) * ((point.score as number) - meanY), 0) / denominator, 3);
}

function trendFor(value: number | null): { key: TrendClass; label: string } {
  if (value === null || Math.abs(value) < 0.05) return { key: "stable", label: "باثبات" };
  if (value >= 0.25) return { key: "continuous-improvement", label: "بهبود مستمر" };
  if (value > 0) return { key: "mild-improvement", label: "بهبود ملایم" };
  if (value <= -0.25) return { key: "continuous-decline", label: "افت مستمر" };
  return { key: "mild-decline", label: "افت ملایم" };
}

function compatible(nature: string) {
  return natureCategory(nature) === "financial" ? "شرکت‌های مالی" : "شرکت‌های غیرمالی";
}

export function buildPerformanceMatrix(
  model: FinancialModel,
  _axisMatrix: Map<string, Map<number, AxisBundle>>,
  settings: ModelSettings,
): PerformanceMatrix {
  const byYearRows = new Map<number, DynamicRankingRow[]>();
  for (const year of model.years) {
    // The baseline shown on the home page and exported from the global report must
    // be identical to the official baseline in the ranking module. Scenario weights
    // remain an explicit, temporary analysis inside that module.
    const rows = buildDynamicRanking(model, year, BASE_RANKING_WEIGHTS);
    byYearRows.set(year, rows);
  }
  const allRows = [...byYearRows.values()].flat();
  const matrix: PerformanceMatrix = new Map();
  for (const row of allRows) {
    const previous = allRows.find((candidate) => candidate.company === row.company && candidate.year === row.year - 1);
    const dimensions = Object.fromEntries(
      RANKING_METRICS.map((metric) => [
        metric.key,
        dimensionFor(row.metrics[metric.key], settings, previous?.metrics[metric.key].score ?? null),
      ]),
    ) as Record<PerformanceDimensionKey, PerformanceDimension>;
    const group = allRows.filter(
      (candidate) =>
        candidate.year === row.year &&
        compatible(candidate.nature) === compatible(row.nature) &&
        candidate.validity === "valid" &&
        candidate.score !== null,
    );
    const values = group.map((candidate) => candidate.score as number);
    const leader = values.length ? Math.max(...values) : null;
    const avg = average(values);
    const mid = median(values);
    const trendSlope = slope(allRows, row.company, row.year);
    const trend = trendFor(trendSlope);
    const finalClass = classify(row.score);
    const baseClass = classify(row.baseScore);
    const confidenceResult = confidence(row.coverage);
    const result: PerformanceResult = {
      company: row.company,
      nature: row.nature,
      year: row.year,
      modelVersion: settings.performance?.modelVersion ?? DEFAULT_SETTINGS.performance.modelVersion,
      comparisonGroup: compatible(row.nature),
      dimensions,
      absoluteScore: row.baseScore,
      relativeScore: null,
      calibratedBaseScore: row.baseScore,
      currentBaseScore: row.baseScore,
      baseCoverage: row.coverage,
      confidence: confidenceResult.level,
      confidenceLabel: confidenceResult.label,
      weightedHistoryScore: row.threeYearScore,
      historyMethod: historyMethod(row.historyLabel),
      historyLabel: row.historyLabel,
      valueCreationAdjustment: 0,
      valueCreationEvidence: "ارزش‌آفرینی از کد ۱۷۶ مستقیماً در بُعد ارزش‌آفرینی محاسبه شده است.",
      trendAdjustment: 0,
      trendClass: trend.key,
      trendLabel: trend.label,
      trendSlope,
      penalties: [],
      totalPenalty: 0,
      riskCap: null,
      finalScore: row.score,
      classification: finalClass.key,
      classificationLabel: finalClass.label,
      absoluteClassificationLabel: baseClass.label,
      warnings: row.warnings,
      narrative: row.score === null
        ? `پوشش مدل ${Math.round(row.coverage * 100)}٪ است؛ امتیاز و رتبه رسمی محاسبه نشد.`
        : `امتیاز سالانه ${row.score.toLocaleString("fa-IR", { maximumFractionDigits: 2 })} با پوشش ${Math.round(row.coverage * 100).toLocaleString("fa-IR")}٪ محاسبه شده است.`,
      ranking: {
        overallRank: row.overallRank,
        peerRank: row.peerRank,
        totalCompanies: row.totalRanked,
        peerCompanies: row.peerRanked,
        percentile: row.overallRank === null || row.totalRanked <= 1 ? null : round(((row.totalRanked - row.overallRank) / (row.totalRanked - 1)) * 100, 1),
        gapToLeader: leader === null || row.score === null ? null : round(leader - row.score, 2),
        gapToAverage: avg === null || row.score === null ? null : round(row.score - avg, 2),
        gapToMedian: mid === null || row.score === null ? null : round(row.score - mid, 2),
        rankChange: row.baseRank === null || row.overallRank === null ? null : row.baseRank - row.overallRank,
      },
      baseAnnualScore: row.baseScore,
      customAnnualScore: row.score,
      dataCoverage: row.coverage,
      scoreValidity: row.validity,
      baseRank: row.baseRank,
      customRank: row.overallRank,
    };
    const byYear = matrix.get(row.company) ?? new Map<number, PerformanceResult>();
    byYear.set(row.year, result);
    matrix.set(row.company, byYear);
  }
  for (const year of model.years) {
    for (const key of PERFORMANCE_DIMENSION_KEYS) {
      const available = [...matrix.values()]
        .map((byYear) => byYear.get(year))
        .filter((result): result is PerformanceResult => Boolean(result?.dimensions[key].score !== null))
        .sort((a, b) => (b.dimensions[key].score ?? -1) - (a.dimensions[key].score ?? -1));
      const distinct: number[] = [];
      for (const result of available) {
        const value = result.dimensions[key].score as number;
        if (!distinct.some((candidate) => Math.abs(candidate - value) < 1e-9)) distinct.push(value);
        result.dimensions[key].portfolioRank = distinct.findIndex((candidate) => Math.abs(candidate - value) < 1e-9) + 1;
      }
    }
  }
  return matrix;
}

export function distributionForYear(matrix: PerformanceMatrix, year: number): PerformanceDistribution {
  const values = [...matrix.values()].map((byYear) => byYear.get(year)?.finalScore ?? null).filter((value): value is number => value !== null);
  return {
    year,
    count: values.length,
    mean: average(values),
    median: median(values),
    standardDeviation: standardDeviation(values),
    minimum: values.length ? Math.min(...values) : null,
    maximum: values.length ? Math.max(...values) : null,
    bins: Array.from({ length: 10 }, (_, index) => ({ from: index, to: index + 1, count: values.filter((value) => value >= index && (index === 9 ? value <= 10 : value < index + 1)).length })),
    classes: {
      excellent: values.filter((value) => value >= 8).length,
      desirable: values.filter((value) => value >= 6.5 && value < 8).length,
      average: values.filter((value) => value >= 5 && value < 6.5).length,
      weak: values.filter((value) => value >= 3.5 && value < 5).length,
      critical: values.filter((value) => value < 3.5).length,
    },
    lowShare: values.length ? values.filter((value) => value < 5).length / values.length : 0,
    highShare: values.length ? values.filter((value) => value >= 8).length / values.length : 0,
  };
}

export function calibrationWarningsFor(matrix: PerformanceMatrix, years: number[]): Map<number, string> {
  const warnings = new Map<number, string>();
  for (const year of years) {
    const distribution = distributionForYear(matrix, year);
    if (distribution.count && distribution.lowShare > 0.7) warnings.set(year, "بیش از ۷۰٪ شرکت‌های دارای امتیاز، امتیاز کمتر از ۵ دارند.");
    else if (distribution.count && distribution.highShare > 0.7) warnings.set(year, "بیش از ۷۰٪ شرکت‌های دارای امتیاز، امتیاز ۸ یا بیشتر دارند.");
  }
  return warnings;
}

export function performanceAt(matrix: PerformanceMatrix, company: string, year: number): PerformanceResult | null {
  return matrix.get(company)?.get(year) ?? null;
}

export function performanceRows(matrix: PerformanceMatrix, year: number, nature = "همه"): PerformanceResult[] {
  return [...matrix.values()]
    .map((byYear) => byYear.get(year))
    .filter((result): result is PerformanceResult => result !== undefined && (nature === "همه" || result.nature === nature))
    .sort((a, b) => {
      if (a.finalScore === null && b.finalScore === null) return a.company.localeCompare(b.company, "fa");
      if (a.finalScore === null) return 1;
      if (b.finalScore === null) return -1;
      return b.finalScore - a.finalScore || a.company.localeCompare(b.company, "fa");
    });
}

export function normalizedVariable(value: string): string {
  return normalizeText(value);
}
