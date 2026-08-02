import type { FinancialModel, FinancialRecord } from "@/lib/financial-engine";

export const RANKING_METRICS = [
  {
    key: "growth",
    code: "144، 186، 187",
    label: "رشد و پویایی عملکرد",
    shortLabel: "رشد",
    baseWeight: 0.2,
    color: "#7c3aed",
  },
  {
    key: "profitability",
    code: "146",
    label: "سودآوری عملیاتی",
    shortLabel: "سودآوری",
    baseWeight: 0.15,
    color: "#2563eb",
  },
  {
    key: "capitalReturn",
    code: "176",
    label: "ارزش‌آفرینی سرمایه",
    shortLabel: "ارزش‌آفرینی",
    baseWeight: 0.2,
    color: "#4f46e5",
  },
  {
    key: "cashQuality",
    code: "162، 175، 169",
    label: "کیفیت سود و نقدسازی",
    shortLabel: "کیفیت سود",
    baseWeight: 0.15,
    color: "#0891b2",
  },
  {
    key: "resilience",
    code: "174، 173، 164",
    label: "تاب‌آوری مالی و نقدینگی",
    shortLabel: "تاب‌آوری",
    baseWeight: 0.2,
    color: "#059669",
  },
  {
    key: "workingCapital",
    code: "152، 168",
    label: "بهره‌وری و سرمایه در گردش",
    shortLabel: "بهره‌وری",
    baseWeight: 0.1,
    color: "#d97706",
  },
] as const;

export type RankingMetricKey = (typeof RANKING_METRICS)[number]["key"];
export type RankingWeights = Record<RankingMetricKey, number>;
export type RankingScenarioKey =
  | "balanced"
  | "growth"
  | "profitability"
  | "valueCreation"
  | "cashQuality"
  | "resilience"
  | "efficiency";

export const BASE_RANKING_WEIGHTS: RankingWeights = Object.fromEntries(
  RANKING_METRICS.map((metric) => [metric.key, metric.baseWeight]),
) as RankingWeights;

const MINIMUM_DIMENSION_COVERAGE = 0.6;
const MINIMUM_SCORE_COVERAGE = 0.6;
const VALID_SCORE_COVERAGE = 0.75;
const MIN_WEIGHT = 0.05;
const MAX_WEIGHT = 0.4;

const scenario = (overrides: Partial<RankingWeights>): RankingWeights =>
  normalizeBoundedWeights({ ...BASE_RANKING_WEIGHTS, ...overrides });

export const RANKING_SCENARIOS: Record<
  RankingScenarioKey,
  { label: string; description: string; weights: RankingWeights }
> = {
  balanced: {
    label: "متوازن",
    description: "وزن‌های پایه مدل شش‌بُعدی مصوب",
    weights: { ...BASE_RANKING_WEIGHTS },
  },
  growth: {
    label: "رشد‌محور",
    description: "تأکید بیشتر بر رشد درآمد و سود",
    weights: scenario({ growth: 0.35, workingCapital: 0.05 }),
  },
  profitability: {
    label: "سودآوری‌محور",
    description: "تأکید بیشتر بر سودآوری عملیاتی",
    weights: scenario({ profitability: 0.35, workingCapital: 0.05 }),
  },
  valueCreation: {
    label: "ارزش‌آفرینی‌محور",
    description: "تمرکز بر فاصله بازده سرمایه از هزینه سرمایه",
    weights: scenario({ capitalReturn: 0.35, workingCapital: 0.05 }),
  },
  cashQuality: {
    label: "نقدسازی‌محور",
    description: "تأکید بر کیفیت سود و جریان نقد آزاد",
    weights: scenario({ cashQuality: 0.35, workingCapital: 0.05 }),
  },
  resilience: {
    label: "تاب‌آوری‌محور",
    description: "تمرکز بر بدهی، پوشش هزینه مالی و نقدینگی",
    weights: scenario({ resilience: 0.35, workingCapital: 0.05 }),
  },
  efficiency: {
    label: "بهره‌وری‌محور",
    description: "تأکید بر گردش دارایی و چرخه تبدیل نقد",
    weights: scenario({ workingCapital: 0.35, profitability: 0.1 }),
  },
};

export const INDICATOR_DEFINITIONS = {
  growth: [
    { code: "144", label: "رشد سالانه درآمد عملیاتی", weight: 0.4 },
    { code: "186", label: "رشد سالانه سود عملیاتی", weight: 0.45 },
    { code: "187", label: "رشد سالانه سود خالص", weight: 0.15 },
  ],
  profitability: [
    { code: "146", label: "حاشیه سود عملیاتی", weight: 1 },
  ],
  capitalReturn: [
    { code: "176", label: "اسپرد ارزش‌آفرینی ROIC−WACC", weight: 1 },
  ],
  cashQuality: [
    { code: "162", label: "جریان نقد عملیاتی به سود خالص CFO/NI", weight: 0.4 },
    { code: "175", label: "حاشیه جریان نقد آزاد FCF Margin", weight: 0.4 },
    { code: "169", label: "نسبت تعهدی Accruals Ratio", weight: 0.2 },
  ],
  resilience: [
    { code: "174", label: "بدهی خالص به EBITDA", weight: 0.5 },
    { code: "173", label: "پوشش هزینه مالی", weight: 0.3 },
    { code: "164", label: "نسبت آنی", weight: 0.2 },
  ],
  workingCapital: [
    { code: "152", label: "گردش دارایی‌ها", weight: 0.6 },
    { code: "168", label: "چرخه تبدیل نقد CCC", weight: 0.4 },
  ],
} as const satisfies Record<RankingMetricKey, readonly IndicatorDefinition[]>;

export interface IndicatorDefinition {
  code: string;
  label: string;
  weight: number;
}

export interface RankingIndicatorResult extends IndicatorDefinition {
  score: number | null;
  value: number | null;
  unit: string;
  effectiveWeight: number;
  contribution: number;
  issue: string | null;
}

export interface RankingMetricResult {
  key: RankingMetricKey;
  code: string;
  label: string;
  shortLabel: string;
  color: string;
  score: number | null;
  value: number | null;
  unit: string;
  coverage: number;
  configuredWeight: number;
  effectiveWeight: number;
  contribution: number;
  indicators: RankingIndicatorResult[];
  warnings: string[];
}

export interface DynamicRankingRow {
  company: string;
  nature: string;
  year: number;
  score: number | null;
  baseScore: number | null;
  threeYearScore: number | null;
  historyLabel: string;
  coverage: number;
  validity: "valid" | "temporary" | "insufficient";
  validityLabel: string;
  metrics: Record<RankingMetricKey, RankingMetricResult>;
  status: "excellent" | "desirable" | "average" | "weak" | "critical" | "insufficient";
  statusLabel: string;
  overallRank: number | null;
  peerRank: number | null;
  baseRank: number | null;
  totalRanked: number;
  peerRanked: number;
  warnings: string[];
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}

function normalizeBoundedWeights(input: RankingWeights): RankingWeights {
  const keys = RANKING_METRICS.map((metric) => metric.key);
  const values = Object.fromEntries(
    keys.map((key) => [key, clamp(input[key], MIN_WEIGHT, MAX_WEIGHT)]),
  ) as RankingWeights;
  for (let pass = 0; pass < 12; pass += 1) {
    const total = keys.reduce((sum, key) => sum + values[key], 0);
    const difference = 1 - total;
    if (Math.abs(difference) < 1e-12) break;
    const adjustable = keys.filter((key) =>
      difference > 0 ? values[key] < MAX_WEIGHT - 1e-12 : values[key] > MIN_WEIGHT + 1e-12,
    );
    if (!adjustable.length) break;
    const room = adjustable.reduce(
      (sum, key) => sum + (difference > 0 ? MAX_WEIGHT - values[key] : values[key] - MIN_WEIGHT),
      0,
    );
    for (const key of adjustable) {
      const capacity = difference > 0 ? MAX_WEIGHT - values[key] : values[key] - MIN_WEIGHT;
      values[key] += difference * (capacity / room);
    }
  }
  const total = keys.reduce((sum, key) => sum + values[key], 0);
  if (Math.abs(total - 1) > 1e-10) values[keys.at(-1)!] += 1 - total;
  return values;
}

export function normalizedRankingWeights(weights: RankingWeights): RankingWeights {
  return normalizeBoundedWeights(weights);
}

export function blendScenarioWeights(
  scenarioKey: RankingScenarioKey,
  intensity: number,
): RankingWeights {
  const lambda = clamp(intensity, 0, 1);
  const target = RANKING_SCENARIOS[scenarioKey].weights;
  return normalizeBoundedWeights(
    Object.fromEntries(
      RANKING_METRICS.map((metric) => [
        metric.key,
        (1 - lambda) * BASE_RANKING_WEIGHTS[metric.key] + lambda * target[metric.key],
      ]),
    ) as RankingWeights,
  );
}

export function redistributeRankingWeight(
  inputWeights: RankingWeights,
  changedKey: RankingMetricKey,
  nextWeight: number,
): RankingWeights {
  const weights = normalizeBoundedWeights(inputWeights);
  const next = clamp(nextWeight, MIN_WEIGHT, MAX_WEIGHT);
  const otherKeys = RANKING_METRICS.map((metric) => metric.key).filter((key) => key !== changedKey);
  const old = weights[changedKey];
  const otherTotal = 1 - old;
  const remaining = 1 - next;
  const distributed = { ...weights, [changedKey]: next };
  for (const key of otherKeys) {
    distributed[key] = otherTotal > 0 ? weights[key] * (remaining / otherTotal) : remaining / otherKeys.length;
  }
  return normalizeBoundedWeights(distributed);
}

function compatibleGroup(nature: string) {
  return /مالی|بانک|کارگزار|صندوق|سرمایه.?گذاری/.test(nature) ? "مالی" : "غیرمالی";
}

function duplicateFor(model: FinancialModel, company: string, year: number, code: string) {
  return model.validRecords.filter(
    (record) => record.company === company && record.year === year && record.code === code,
  ).length > 1;
}

function recordFor(
  model: FinancialModel,
  company: string,
  year: number,
  definition: IndicatorDefinition,
): { record: FinancialRecord | null; issue: string | null } {
  if (duplicateFor(model, company, year, definition.code)) {
    return { record: null, issue: `کد ${definition.code} برای شرکت و سال انتخاب‌شده تکراری است.` };
  }
  const record = model.codeIndex.get(company)?.get(year)?.get(definition.code) ?? null;
  if (!record) return { record: null, issue: `کد ${definition.code} موجود نیست.` };
  if (record.score === null || !Number.isFinite(record.score)) {
    return { record, issue: `امتیاز کد ${definition.code} خالی یا نامعتبر است.` };
  }
  if (record.score < 0 || record.score > 10) {
    return { record, issue: `امتیاز کد ${definition.code} خارج از بازه صفر تا ۱۰ است.` };
  }
  return { record, issue: null };
}

function dimensionFor(
  model: FinancialModel,
  company: string,
  year: number,
  metricKey: RankingMetricKey,
  configuredWeight: number,
): RankingMetricResult {
  const metric = RANKING_METRICS.find((item) => item.key === metricKey)!;
  const indicators: RankingIndicatorResult[] = INDICATOR_DEFINITIONS[metricKey].map((definition) => {
    const { record, issue } = recordFor(model, company, year, definition);
    return {
      ...definition,
      score: issue ? null : record?.score ?? null,
      value: record?.value ?? null,
      unit: record?.unit ?? "",
      effectiveWeight: 0,
      contribution: 0,
      issue,
    };
  });
  const coverage = indicators.reduce(
    (sum, indicator) => sum + (indicator.score === null ? 0 : indicator.weight),
    0,
  );
  const sufficient = coverage + 1e-9 >= MINIMUM_DIMENSION_COVERAGE;
  if (sufficient) {
    for (const indicator of indicators) {
      if (indicator.score === null) continue;
      indicator.effectiveWeight = indicator.weight / coverage;
      indicator.contribution = indicator.score * indicator.effectiveWeight;
    }
  }
  const score = sufficient
    ? indicators.reduce((sum, indicator) => sum + indicator.contribution, 0)
    : null;
  const warnings = indicators.flatMap((indicator) => indicator.issue ? [indicator.issue] : []);
  if (coverage > 0 && coverage < 1) {
    warnings.push(
      sufficient
        ? `پوشش داخلی بُعد ${Math.round(coverage * 100)}٪ است و وزن شاخص‌های موجود بازتوزیع شد.`
        : `پوشش داخلی بُعد ${Math.round(coverage * 100)}٪ است و به حداقل ۶۰٪ نمی‌رسد.`,
    );
  }
  if (metricKey === "resilience" && indicators.find((item) => item.code === "173")?.score === null) {
    const currentRows = model.validRecords.filter((record) => record.company === company && record.year === year);
    const interestDebt = currentRows.find((record) => /بدهی.*بهره|interest.?bearing/i.test(record.variable));
    const financeCost = currentRows.find((record) => /هزینه.*مالی|finance.*cost/i.test(record.variable));
    if ((interestDebt?.value ?? 0) > 0 && (financeCost?.value === 0 || financeCost?.value === null || financeCost?.value === undefined)) {
      warnings.push("بدهی بهره‌دار وجود دارد، اما هزینه مالی صفر یا نامعتبر است؛ خطای کیفیت داده ثبت شد.");
    }
  }
  return {
    key: metric.key,
    code: metric.code,
    label: metric.label,
    shortLabel: metric.shortLabel,
    color: metric.color,
    score,
    value: null,
    unit: "امتیاز",
    coverage: round(coverage, 4),
    configuredWeight,
    effectiveWeight: 0,
    contribution: 0,
    indicators,
    warnings,
  };
}

function validityFor(coverage: number): Pick<DynamicRankingRow, "validity" | "validityLabel"> {
  if (coverage >= VALID_SCORE_COVERAGE) return { validity: "valid", validityLabel: "امتیاز معتبر" };
  if (coverage >= MINIMUM_SCORE_COVERAGE) return { validity: "temporary", validityLabel: "امتیاز موقت با هشدار" };
  return { validity: "insufficient", validityLabel: "پوشش ناکافی؛ بدون رتبه رسمی" };
}

function statusForScore(score: number | null): Pick<DynamicRankingRow, "status" | "statusLabel"> {
  if (score === null) return { status: "insufficient", statusLabel: "داده ناکافی" };
  if (score >= 8) return { status: "excellent", statusLabel: "ممتاز" };
  if (score >= 6.5) return { status: "desirable", statusLabel: "مطلوب" };
  if (score >= 5) return { status: "average", statusLabel: "متوسط" };
  if (score >= 3.5) return { status: "weak", statusLabel: "ضعیف" };
  return { status: "critical", statusLabel: "بحرانی" };
}

function annualScore(
  model: FinancialModel,
  company: string,
  year: number,
  inputWeights: RankingWeights,
) {
  const weights = normalizeBoundedWeights(inputWeights);
  const metrics = Object.fromEntries(
    RANKING_METRICS.map((metric) => [
      metric.key,
      dimensionFor(model, company, year, metric.key, weights[metric.key]),
    ]),
  ) as Record<RankingMetricKey, RankingMetricResult>;
  const coverage = RANKING_METRICS.reduce(
    (sum, metric) => sum + (metrics[metric.key].score === null ? 0 : metric.baseWeight),
    0,
  );
  const baseAvailableWeight = RANKING_METRICS.reduce(
    (sum, metric) => sum + (metrics[metric.key].score === null ? 0 : metric.baseWeight),
    0,
  );
  const customAvailableWeight = RANKING_METRICS.reduce(
    (sum, metric) => sum + (metrics[metric.key].score === null ? 0 : weights[metric.key]),
    0,
  );
  for (const metric of RANKING_METRICS) {
    const result = metrics[metric.key];
    if (result.score === null || customAvailableWeight <= 0) continue;
    result.effectiveWeight = weights[metric.key] / customAvailableWeight;
    result.contribution = result.score * result.effectiveWeight;
  }
  const canScore = coverage + 1e-9 >= MINIMUM_SCORE_COVERAGE;
  const baseScore = canScore && baseAvailableWeight > 0
    ? RANKING_METRICS.reduce(
        (sum, metric) => sum + (metrics[metric.key].score ?? 0) * (metrics[metric.key].score === null ? 0 : metric.baseWeight / baseAvailableWeight),
        0,
      )
    : null;
  const score = canScore && customAvailableWeight > 0
    ? RANKING_METRICS.reduce((sum, metric) => sum + metrics[metric.key].contribution, 0)
    : null;
  return {
    metrics,
    coverage: round(coverage, 4),
    baseScore,
    score,
  };
}

function stableScore(current: number | null, previous: number | null, twoYearsAgo: number | null) {
  if (current === null) return { score: null, label: "سال جاری فاقد امتیاز است" };
  if (previous !== null && twoYearsAgo !== null) {
    return { score: round(0.5 * current + 0.3 * previous + 0.2 * twoYearsAgo, 2), label: "سه‌ساله ۵۰٪، ۳۰٪ و ۲۰٪" };
  }
  if (previous !== null) {
    return { score: round((0.5 * current + 0.3 * previous) / 0.8, 2), label: "دوساله با بازتوزیع ۵۰٪ و ۳۰٪" };
  }
  return { score: round(current, 2), label: "امتیاز مبتنی بر یک سال" };
}

export function scoreCompanyYear(
  model: FinancialModel,
  company: string,
  year: number,
  inputWeights: RankingWeights,
): DynamicRankingRow {
  const current = annualScore(model, company, year, inputWeights);
  const previous = annualScore(model, company, year - 1, inputWeights).score;
  const twoYearsAgo = annualScore(model, company, year - 2, inputWeights).score;
  const history = stableScore(current.score, previous, twoYearsAgo);
  const validity = validityFor(current.coverage);
  const status = statusForScore(current.score);
  const warnings = RANKING_METRICS.flatMap((metric) => current.metrics[metric.key].warnings);
  if (validity.validity === "temporary") warnings.push("پوشش کل بین ۶۰٪ و ۷۵٪ است؛ امتیاز موقت و همراه هشدار است.");
  if (validity.validity === "insufficient") warnings.push("پوشش کل کمتر از ۶۰٪ است؛ امتیاز و رتبه رسمی محاسبه نشد.");
  return {
    company,
    nature: model.natureByCompany.get(company) ?? "ماهیت نامشخص",
    year,
    score: current.score,
    baseScore: current.baseScore,
    threeYearScore: history.score,
    historyLabel: history.label,
    coverage: current.coverage,
    ...validity,
    metrics: current.metrics,
    ...status,
    overallRank: null,
    peerRank: null,
    baseRank: null,
    totalRanked: 0,
    peerRanked: 0,
    warnings: [...new Set(warnings)],
  };
}

function rankingTieBreak(
  a: DynamicRankingRow,
  b: DynamicRankingRow,
  field: "score" | "baseScore",
) {
  const scoreDifference = (b[field] as number) - (a[field] as number);
  if (Math.abs(scoreDifference) > 1e-12) return scoreDifference;
  for (const key of ["capitalReturn", "cashQuality", "resilience"] as RankingMetricKey[]) {
    const dimensionDifference = (b.metrics[key].score ?? -1) - (a.metrics[key].score ?? -1);
    if (Math.abs(dimensionDifference) > 1e-12) return dimensionDifference;
  }
  if (Math.abs(b.coverage - a.coverage) > 1e-12) return b.coverage - a.coverage;
  return a.company.localeCompare(b.company, "fa");
}

function denseRanks(rows: DynamicRankingRow[], field: "score" | "baseScore") {
  const valid = rows
    .filter((row) => row.validity === "valid" && row[field] !== null)
    .sort((a, b) => rankingTieBreak(a, b, field));
  const distinct: number[] = [];
  for (const row of valid) {
    const value = row[field] as number;
    if (!distinct.some((candidate) => Math.abs(candidate - value) < 1e-9)) distinct.push(value);
    const rank = distinct.findIndex((candidate) => Math.abs(candidate - value) < 1e-9) + 1;
    if (field === "score") row.overallRank = rank;
    else row.baseRank = rank;
  }
}

export function buildDynamicRanking(
  model: FinancialModel,
  year: number,
  weights: RankingWeights,
): DynamicRankingRow[] {
  const rows = model.companies.map((company) => scoreCompanyYear(model, company, year, weights));
  const compatibleGroups = new Map<string, DynamicRankingRow[]>();
  for (const row of rows) {
    const key = compatibleGroup(row.nature);
    compatibleGroups.set(key, [...(compatibleGroups.get(key) ?? []), row]);
  }
  for (const group of compatibleGroups.values()) {
    denseRanks(group, "score");
    denseRanks(group, "baseScore");
    const count = group.filter((row) => row.validity === "valid" && row.score !== null).length;
    group.forEach((row) => { row.totalRanked = count; });
  }
  const peerGroups = new Map<string, DynamicRankingRow[]>();
  for (const row of rows) peerGroups.set(row.nature, [...(peerGroups.get(row.nature) ?? []), row]);
  for (const peers of peerGroups.values()) {
    const ranked = peers
      .filter((row) => row.validity === "valid" && row.score !== null)
      .sort((a, b) => rankingTieBreak(a, b, "score"));
    peers.forEach((row) => { row.peerRanked = ranked.length; });
    const distinct: number[] = [];
    for (const row of ranked) {
      if (!distinct.some((value) => Math.abs(value - (row.score as number)) < 1e-9)) distinct.push(row.score as number);
      row.peerRank = distinct.findIndex((value) => Math.abs(value - (row.score as number)) < 1e-9) + 1;
    }
  }
  return rows.sort((a, b) => {
    const validityOrder = { valid: 0, temporary: 1, insufficient: 2 } as const;
    const validityDifference = validityOrder[a.validity] - validityOrder[b.validity];
    if (validityDifference) return validityDifference;
    if (a.score !== null && b.score !== null) return rankingTieBreak(a, b, "score");
    if (a.score === null && b.score !== null) return 1;
    if (a.score !== null && b.score === null) return -1;
    return a.company.localeCompare(b.company, "fa");
  });
}

export function buildRankingNarrative(
  current: DynamicRankingRow,
  baseline: DynamicRankingRow | undefined,
  currentWeights: RankingWeights,
): string {
  if (current.score === null) {
    return `برای ${current.company} فقط ${Math.round(current.coverage * 100).toLocaleString("fa-IR")}٪ از وزن مدل پوشش دارد؛ بنابراین امتیاز و رتبه رسمی محاسبه نشده است.`;
  }
  const rankChange = baseline?.overallRank && current.overallRank
    ? baseline.overallRank - current.overallRank
    : 0;
  const available = RANKING_METRICS.map((metric) => current.metrics[metric.key])
    .filter((metric) => metric.score !== null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const movement = current.validity !== "valid"
    ? "به‌دلیل پوشش کمتر از ۷۵٪ در رتبه‌بندی رسمی قرار نگرفته"
    : rankChange > 0
      ? `${rankChange.toLocaleString("fa-IR")} رتبه بهبود یافته`
      : rankChange < 0
        ? `${Math.abs(rankChange).toLocaleString("fa-IR")} رتبه کاهش یافته`
        : "نسبت به وزن‌های پایه بدون تغییر رتبه مانده";
  const changed = RANKING_METRICS
    .map((metric) => ({ metric, delta: currentWeights[metric.key] - metric.baseWeight }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const driver = Math.abs(changed.delta) >= 0.005
    ? ` بیشترین تغییر وزن مربوط به «${changed.metric.shortLabel}» بوده است.`
    : " وزن‌ها با حالت پایه یکسان است.";
  const validityNote = current.validity === "temporary"
    ? " این امتیاز موقت است و تا رسیدن پوشش به ۷۵٪ وارد رتبه‌بندی رسمی نمی‌شود."
    : "";
  return `${current.company} با امتیاز سالانه ${current.score.toLocaleString("fa-IR", { maximumFractionDigits: 2 })} و پوشش ${Math.round(current.coverage * 100).toLocaleString("fa-IR")}٪، ${movement} است.${driver} نقطه قوت اصلی «${available[0]?.shortLabel ?? "نامشخص"}» و مهم‌ترین زمینه بهبود «${available.at(-1)?.shortLabel ?? "نامشخص"}» است.${validityNote}`;
}

export function rankingWeightTotal(weights: RankingWeights) {
  return Object.values(weights).reduce((sum, value) => sum + value, 0);
}
