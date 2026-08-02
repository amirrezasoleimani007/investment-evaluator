export const REQUIRED_COLUMNS = [
  "ماهیت",
  "شرکت",
  "سال",
  "متغیر",
  "کد متغیر",
  "واحد",
  "مقدار",
  "امتیاز",
  "نشان",
] as const;

/** The only variable codes whose normalized scores are required by the official ranking model. */
export const RANKING_SCORE_CODES = [
  "144",
  "146",
  "152",
  "162",
  "164",
  "168",
  "169",
  "173",
  "174",
  "175",
  "176",
  "186",
  "187",
] as const;

export const AXIS_KEYS = [
  "profitability",
  "cashQuality",
  "growth",
  "capitalReturn",
  "resilience",
  "financialPerformance",
  "workingCapital",
  "operatingProfitability",
  "scatterProfitability",
  "scatterCashQuality",
  "scatterGrowth",
  "scatterReturn",
  "scatterResilience",
  "scatterPerformance",
  "scatterLiquidity",
  "scatterOperatingProfitability",
] as const;

export type AxisKey = (typeof AXIS_KEYS)[number];
export type Band = "weak" | "medium" | "good";
export type DisplayMode = "trend" | "portfolio" | "peers";
export type BubbleMetric = "none" | "revenue" | "assets" | "investedCapital";

export interface FinancialRecord {
  sourceRow: number;
  nature: string;
  company: string;
  year: number;
  variable: string;
  normalizedVariable: string;
  code: string;
  unit: string;
  value: number | null;
  indexedValue: number | null;
  score: number | null;
  scoreIssue: "missing" | "invalid" | "out-of-range" | null;
  natureImputed: boolean;
}

export interface ScoreDiagnostic {
  variable: string;
  normalizedVariable: string;
  count: number;
  missingCount: number;
  missingPercent: number;
  minimum: number | null;
  maximum: number | null;
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  zeroCount: number;
  tenCount: number;
  range: number | null;
  scaleValid: boolean;
  reason: string;
}

export interface DataIssue {
  type:
    | "missing-column"
    | "invalid-year"
    | "missing-company"
    | "missing-variable"
    | "missing-score"
    | "invalid-score"
    | "out-of-range"
    | "duplicate"
    | "missing-required-variable"
    | "incomplete-year"
    | "nature-conflict"
    | "nature-imputed"
    | "invalid-score-scale";
  severity: "error" | "warning" | "info";
  message: string;
  company?: string;
  year?: number;
  variable?: string;
  row?: number;
}

export interface ValidationSummary {
  totalRecords: number;
  companies: number;
  years: number;
  variables: number;
  scoreCompleteness: number;
  rankingScoreCompleteness: number;
  missingRequiredScores: number;
  incompleteRecords: number;
  duplicateRecords: number;
  warnings: number;
  invalidScores: number;
  invalidScoreScales: number;
  imputedNatureRows: number;
}

export interface FinancialModel {
  fileName: string;
  importedAt: string;
  headers: string[];
  records: FinancialRecord[];
  validRecords: FinancialRecord[];
  companies: string[];
  years: number[];
  natures: string[];
  issues: DataIssue[];
  summary: ValidationSummary;
  missingColumns: string[];
  duplicateCount: number;
  index: Map<string, Map<number, Map<string, FinancialRecord>>>;
  codeIndex: Map<string, Map<number, Map<string, FinancialRecord>>>;
  codeByVariable: Map<string, string>;
  natureByCompany: Map<string, string>;
  scoreDiagnostics: ScoreDiagnostic[];
}

export interface AxisComponent {
  key: string;
  label: string;
  variable: string;
  score: number | null;
  value: number | null;
  unit: string;
  originalWeight: number;
  adjustedWeight: number;
  contribution: number;
  method?: string;
  absoluteScore?: number | null;
  relativeScore?: number | null;
  adjustedScore?: number | null;
  comparisonGroup?: string;
  scoreMethod?: string;
  missing: boolean;
}

export interface AxisResult {
  key: AxisKey;
  label: string;
  score: number | null;
  coverage: number;
  band: Band | null;
  components: AxisComponent[];
  missing: string[];
  warnings: string[];
  formula: string;
}

export interface AxisBundle {
  company: string;
  year: number;
  nature: string;
  axes: Record<AxisKey, AxisResult>;
}

export interface AxisWeights {
  profitability: { operatingMargin: number; npm: number };
  cashQuality: { cfoNi: number; fcfMargin: number; ocfStability: number };
  growth: { revenueGrowth: number; operatingProfitGrowth: number };
  capitalReturn: { roic: number; assetTurnover: number };
  resilience: { debtEbitda: number; interestCoverage: number; quickRatio: number };
  financialPerformance: {
    profitability: number;
    capitalReturn: number;
    cashQuality: number;
  };
}

export type NatureCategory = "production" | "trade" | "service" | "financial";

export interface PerformanceDimensionWeights {
  profitability: number;
  cashQuality: number;
  capitalReturn: number;
  growth: number;
  resilience: number;
  workingCapital: number;
}

export interface PerformanceSettings {
  /** Share of the calibrated score supplied by the absolute financial standard. */
  absoluteWeight: number;
  /** Share supplied by the within-year peer percentile. */
  relativeWeight: number;
  /** Model version written to every calculation/export for auditability. */
  modelVersion: string;
  /** Legacy/default set retained for settings migration and production companies. */
  dimensionWeights: PerformanceDimensionWeights;
  dimensionWeightsByNature: Record<NatureCategory, PerformanceDimensionWeights>;
  minimumBaseCoverage: number;
  minimumPeerSize: number;
  cfoNiAbsoluteLimit: number;
  historyWeights: {
    current: number;
    previous: number;
    twoYearsAgo: number;
  };
  twoYearWeights: {
    current: number;
    previous: number;
  };
  inflationRate: number | null;
  trendMeaningfulChange: number;
  criticalNetDebtEbitda: number;
  severeNetDebtEbitda: number;
  criticalMetricScore: number;
  currentNegativeOcfPenalty: number;
  recurringNegativeOcfPenalty: number;
  positiveProfitNegativeOcfPenalty: number;
  lowInterestCoveragePenalty: number;
  criticalInterestCoveragePenalty: number;
  netDebtPenalty: number;
  severeNetDebtPenalty: number;
  criticalCccPenalty: number;
  criticalCccWithDriverPenalty: number;
}

export interface ModelSettings {
  lowBoundary: number;
  highBoundary: number;
  minimumCoverage: number;
  showAverage: boolean;
  showLabels: boolean;
  weights: AxisWeights;
  performance: PerformanceSettings;
}

export interface ChartDefinition {
  key: "profitCash" | "growthReturn" | "performanceResilience" | "operationsWc";
  title: string;
  xKey: AxisKey;
  yKey: AxisKey;
  xLabel: string;
  yLabel: string;
}

export interface ChartPoint {
  company: string;
  nature: string;
  year: number;
  x: number;
  y: number;
  selected: boolean;
  xAxis: AxisResult;
  yAxis: AxisResult;
  bubbleValue: number | null;
  bubbleLabel: string;
  spreadValue: number | null;
  spreadScore: number | null;
  regionTitle: string;
  interpretation: string;
}

export const DEFAULT_SETTINGS: ModelSettings = {
  lowBoundary: 4,
  highBoundary: 7,
  minimumCoverage: 0.6,
  showAverage: true,
  showLabels: false,
  weights: {
    profitability: { operatingMargin: 0.6, npm: 0.4 },
    cashQuality: { cfoNi: 0.5, fcfMargin: 0.3, ocfStability: 0.2 },
    growth: { revenueGrowth: 0.6, operatingProfitGrowth: 0.4 },
    capitalReturn: { roic: 0.7, assetTurnover: 0.3 },
    resilience: { debtEbitda: 0.4, interestCoverage: 0.35, quickRatio: 0.25 },
    financialPerformance: {
      profitability: 0.35,
      capitalReturn: 0.4,
      cashQuality: 0.25,
    },
  },
  performance: {
    absoluteWeight: 1,
    relativeWeight: 0,
    modelVersion: "IPS-FM-3.0",
    dimensionWeights: {
      profitability: 0.15,
      cashQuality: 0.15,
      capitalReturn: 0.2,
      growth: 0.2,
      resilience: 0.2,
      workingCapital: 0.1,
    },
    dimensionWeightsByNature: {
      production: {
        profitability: 0.15,
        cashQuality: 0.15,
        capitalReturn: 0.2,
        growth: 0.2,
        resilience: 0.2,
        workingCapital: 0.1,
      },
      trade: {
        profitability: 0.15,
        cashQuality: 0.15,
        capitalReturn: 0.2,
        growth: 0.2,
        resilience: 0.2,
        workingCapital: 0.1,
      },
      service: {
        profitability: 0.15,
        cashQuality: 0.15,
        capitalReturn: 0.2,
        growth: 0.2,
        resilience: 0.2,
        workingCapital: 0.1,
      },
      financial: {
        profitability: 0.15,
        cashQuality: 0.15,
        capitalReturn: 0.2,
        growth: 0.2,
        resilience: 0.2,
        workingCapital: 0.1,
      },
    },
    minimumBaseCoverage: 0.75,
    minimumPeerSize: 4,
    cfoNiAbsoluteLimit: 10,
    historyWeights: {
      current: 0.5,
      previous: 0.3,
      twoYearsAgo: 0.2,
    },
    twoYearWeights: {
      current: 0.625,
      previous: 0.375,
    },
    inflationRate: null,
    trendMeaningfulChange: 0.25,
    criticalNetDebtEbitda: 5,
    severeNetDebtEbitda: 7,
    criticalMetricScore: 2,
    currentNegativeOcfPenalty: 0,
    recurringNegativeOcfPenalty: 0.3,
    positiveProfitNegativeOcfPenalty: 0.3,
    lowInterestCoveragePenalty: 0,
    criticalInterestCoveragePenalty: 0.4,
    netDebtPenalty: 0,
    severeNetDebtPenalty: 0.5,
    criticalCccPenalty: 0,
    criticalCccWithDriverPenalty: 0,
  },
};

/** Fixed nine-zone boundaries requested for the scatter module only. */
export const SCATTER_BOUNDARIES = {
  low: 3.33,
  high: 6.66,
} as const;

export const CHART_DEFINITIONS: ChartDefinition[] = [
  {
    key: "profitCash",
    title: "سودآوری در برابر کیفیت سود و جریان نقد",
    xKey: "scatterProfitability",
    yKey: "scatterCashQuality",
    xLabel: "سودآوری",
    yLabel: "کیفیت سود و جریان نقد",
  },
  {
    key: "growthReturn",
    title: "رشد در برابر بازده و بهره‌وری منابع",
    xKey: "scatterGrowth",
    yKey: "scatterReturn",
    xLabel: "رشد",
    yLabel: "بازده و بهره‌وری منابع",
  },
  {
    key: "performanceResilience",
    title: "تاب‌آوری مالی در برابر عملکرد مالی",
    xKey: "scatterResilience",
    yKey: "scatterPerformance",
    xLabel: "تاب‌آوری مالی",
    yLabel: "عملکرد مالی",
  },
  {
    key: "operationsWc",
    title: "نقدینگی در برابر سودآوری عملیاتی",
    xKey: "scatterLiquidity",
    yKey: "scatterOperatingProfitability",
    xLabel: "نقدینگی",
    yLabel: "سودآوری عملیاتی",
  },
];

const AXIS_LABELS: Record<AxisKey, string> = {
  profitability: "سودآوری",
  cashQuality: "کیفیت سود و جریان نقد",
  growth: "رشد",
  capitalReturn: "بازده سرمایه",
  resilience: "تاب‌آوری مالی",
  financialPerformance: "عملکرد مالی",
  workingCapital: "کارایی سرمایه در گردش",
  operatingProfitability: "سودآوری عملیاتی",
  scatterProfitability: "سودآوری",
  scatterCashQuality: "کیفیت سود و جریان نقد",
  scatterGrowth: "رشد",
  scatterReturn: "بازده و بهره‌وری منابع",
  scatterResilience: "تاب‌آوری مالی",
  scatterPerformance: "عملکرد مالی",
  scatterLiquidity: "نقدینگی",
  scatterOperatingProfitability: "سودآوری عملیاتی",
};

const VARIABLES = {
  operatingMargin: "حاشیه سود عملیاتی",
  npm: "حاشیه سود خالص (NPM)",
  cfoNi: "جریان نقد عملیاتی به سود خالص (CFO / NI)",
  fcfMargin: "حاشیه جریان نقد آزاد (FCF Margin)",
  ocf: "OCF جریان نقد عملیاتی",
  revenue: "درآمدهای عملیاتی",
  revenueGrowth: "رشد درآمد (CAGR)",
  operatingProfit: "سود (زیان) عملیاتی",
  ebit: "سود قبل از مالیات و بهره EBIT",
  financeCost: "هزینه‌های مالی",
  equity: "جمع حقوق مالکانه",
  assets: "جمع دارایی‌ها",
  roe: "ROE بازده حقوق صاحبان سهام",
  roa: "بازده دارایی‌ها ROA",
  roic: "بازده سرمایه گذاری ROIC روش دارایی",
  roce: "ROCE بازده سرمایه بکار گرفته شده",
  assetTurnover: "گردش دارایی ها",
  debtEbitda: "بدهی خالص به EBITDA",
  interestCoverage: "نسبت پوشش بهره (Interest Coverage)",
  quickRatio: "نسبت آنی",
  currentRatio: "نسبت جاری",
  ccc: "چرخه تبدیل نقد (CCC)",
  dso: "روزهای وصول مطالبات (DSO)",
  dio: "روزهای نگهداری موجودی (DIO)",
  dpo: "روزهای پرداخت بدهی (DPO)",
  investedCapital: "IC سرمایه‌گذاری انجام‌شده",
  spread: "اسپرد ارزش‌آفرینی (ROIC−WACC)",
} as const;

const REQUIRED_ANALYTICAL_VARIABLES = [
  VARIABLES.operatingMargin,
  VARIABLES.npm,
  VARIABLES.cfoNi,
  VARIABLES.fcfMargin,
  VARIABLES.ocf,
  VARIABLES.revenueGrowth,
  VARIABLES.operatingProfit,
  VARIABLES.assetTurnover,
  VARIABLES.debtEbitda,
  VARIABLES.interestCoverage,
  VARIABLES.quickRatio,
  VARIABLES.ccc,
];

const DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function toEnglishDigits(value: unknown): string {
  return String(value ?? "").replace(/[۰-۹٠-٩]/g, (char) => DIGIT_MAP[char] ?? char);
}

export function normalizeText(value: unknown): string {
  return toEnglishDigits(value)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNumeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || value === "") return null;
  const raw = toEnglishDigits(value).trim();
  if (!raw || /^#(N\/A|VALUE|DIV\/0|REF|NAME)/i.test(raw)) return null;
  const isPercent = raw.includes("%") || raw.includes("٪");
  const accountingNegative = /^\(.*\)$/.test(raw);
  const normalized = raw
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".")
    .replace(/[٪%]/g, "")
    .replace(/[()]/g, "")
    .replace(/[−–—]/g, "-")
    .trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const signed = accountingNegative ? -Math.abs(parsed) : parsed;
  return isPercent ? signed / 100 : signed;
}

function parseYear(value: unknown): number | null {
  const parsed = Number.parseInt(toEnglishDigits(value).replace(/[^\d-]/g, ""), 10);
  return Number.isInteger(parsed) && parsed >= 1300 && parsed <= 1600 ? parsed : null;
}

function rawValue(row: Record<string, unknown>, key: string): unknown {
  const normalizedKey = normalizeText(key);
  const match = Object.keys(row).find((candidate) => normalizeText(candidate) === normalizedKey);
  return match ? row[match] : undefined;
}

const COLUMN_ALIASES: Record<(typeof REQUIRED_COLUMNS)[number], readonly string[]> = {
  "ماهیت": ["ماهیت"],
  "شرکت": ["شرکت"],
  "سال": ["سال"],
  "متغیر": ["متغیر"],
  "کد متغیر": ["کد متغیر"],
  "واحد": ["واحد"],
  "مقدار": ["مقدار"],
  "امتیاز": ["امتیاز", "نمره"],
  "نشان": ["نشان", "تبدیل به شاخص"],
};

export function missingRequiredColumns(headers: string[]): (typeof REQUIRED_COLUMNS)[number][] {
  const normalizedHeaders = headers.map(normalizeText);
  return REQUIRED_COLUMNS.filter(
    (column) =>
      !COLUMN_ALIASES[column].some((alias) => normalizedHeaders.includes(normalizeText(alias))),
  );
}

export function matchedRequiredColumnCount(headers: string[]): number {
  return REQUIRED_COLUMNS.length - missingRequiredColumns(headers).length;
}

function rawColumn(
  row: Record<string, unknown>,
  key: (typeof REQUIRED_COLUMNS)[number],
): unknown {
  for (const alias of COLUMN_ALIASES[key]) {
    const value = rawValue(row, alias);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function buildFinancialModel(
  rows: Record<string, unknown>[],
  headers: string[],
  fileName: string,
  sourceRowStart = 2,
): FinancialModel {
  const normalizedHeaders = headers.map(normalizeText);
  const missingColumns = missingRequiredColumns(normalizedHeaders);
  const issues: DataIssue[] = missingColumns.map((column) => ({
    type: "missing-column",
    severity: "error",
    message: `ستون «${column}» در فایل پیدا نشد.`,
  }));

  const prelim = rows.map((row, index) => {
    const company = normalizeText(rawColumn(row, "شرکت"));
    const nature = normalizeText(rawColumn(row, "ماهیت"));
    const variable = normalizeText(rawColumn(row, "متغیر"));
    const year = parseYear(rawColumn(row, "سال"));
    const rawScore = rawColumn(row, "امتیاز");
    const score = parseNumeric(rawScore);
    const hasRawScore = rawScore !== null && rawScore !== undefined && rawScore !== "";
    let scoreIssue: FinancialRecord["scoreIssue"] = null;
    if (!hasRawScore) scoreIssue = "missing";
    else if (score === null) scoreIssue = "invalid";
    else if (score < 0 || score > 10) scoreIssue = "out-of-range";
    return {
      sourceRow: index + sourceRowStart,
      nature,
      company,
      year,
      variable,
      normalizedVariable: normalizeText(variable),
      code: normalizeText(rawColumn(row, "کد متغیر")),
      unit: normalizeText(rawColumn(row, "واحد")),
      value: parseNumeric(rawColumn(row, "مقدار")),
      indexedValue: parseNumeric(rawColumn(row, "نشان")),
      score: scoreIssue === null ? score : null,
      scoreIssue,
      natureImputed: false,
    };
  });

  const natureCounts = new Map<string, Map<string, number>>();
  for (const record of prelim) {
    if (!record.company || !record.nature) continue;
    const counts = natureCounts.get(record.company) ?? new Map<string, number>();
    counts.set(record.nature, (counts.get(record.nature) ?? 0) + 1);
    natureCounts.set(record.company, counts);
  }

  const natureByCompany = new Map<string, string>();
  for (const [company, counts] of natureCounts) {
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    natureByCompany.set(company, dominant);
    if (counts.size > 1) {
      issues.push({
        type: "nature-conflict",
        severity: "warning",
        company,
        message: `برای «${company}» بیش از یک ماهیت ثبت شده است.`,
      });
    }
  }

  const records: FinancialRecord[] = prelim.map((record) => {
    if (!record.nature && record.company && natureByCompany.get(record.company)) {
      issues.push({
        type: "nature-imputed",
        severity: "info",
        company: record.company,
        year: record.year ?? undefined,
        row: record.sourceRow,
        message: `ماهیت ردیف ${record.sourceRow} از ماهیت غالب شرکت تکمیل شد.`,
      });
      return {
        ...record,
        year: record.year ?? 0,
        nature: natureByCompany.get(record.company) ?? "",
        natureImputed: true,
      };
    }
    return { ...record, year: record.year ?? 0 };
  });

  for (const record of records) {
    if (!record.company) {
      issues.push({
        type: "missing-company",
        severity: "error",
        row: record.sourceRow,
        message: `نام شرکت در ردیف ${record.sourceRow} خالی است.`,
      });
    }
    if (!record.year) {
      issues.push({
        type: "invalid-year",
        severity: "error",
        row: record.sourceRow,
        company: record.company,
        message: `سال ردیف ${record.sourceRow} معتبر نیست.`,
      });
    }
    if (!record.variable && !record.code) {
      issues.push({
        type: "missing-variable",
        severity: "error",
        row: record.sourceRow,
        company: record.company,
        year: record.year || undefined,
        message: `نام و کد متغیر در ردیف ${record.sourceRow} خالی است.`,
      });
    }
    if (record.scoreIssue === "missing" && RANKING_SCORE_CODES.includes(record.code as (typeof RANKING_SCORE_CODES)[number])) {
      issues.push({
        type: "missing-score",
        severity: "info",
        row: record.sourceRow,
        company: record.company,
        year: record.year || undefined,
        variable: record.variable,
        message: `نمره «${record.variable}» در ردیف ${record.sourceRow} خالی است.`,
      });
    } else if (record.scoreIssue === "invalid") {
      issues.push({
        type: "invalid-score",
        severity: "warning",
        row: record.sourceRow,
        company: record.company,
        year: record.year || undefined,
        variable: record.variable,
        message: `نمره «${record.variable}» در ردیف ${record.sourceRow} عددی نیست.`,
      });
    } else if (record.scoreIssue === "out-of-range") {
      issues.push({
        type: "out-of-range",
        severity: "warning",
        row: record.sourceRow,
        company: record.company,
        year: record.year || undefined,
        variable: record.variable,
        message: `نمره «${record.variable}» در ردیف ${record.sourceRow} خارج از بازه صفر تا ۱۰ است.`,
      });
    }
  }

  const duplicateGroups = new Map<string, FinancialRecord[]>();
  for (const record of records) {
    if (!record.company || !record.year || (!record.code && !record.variable)) continue;
    const identity = record.code || record.normalizedVariable;
    const key = `${record.company}|${record.year}|${identity}`;
    const group = duplicateGroups.get(key) ?? [];
    group.push(record);
    duplicateGroups.set(key, group);
  }
  let duplicateCount = 0;
  for (const group of duplicateGroups.values()) {
    if (group.length < 2) continue;
    duplicateCount += group.length - 1;
    const latest = group[group.length - 1];
    issues.push({
      type: "duplicate",
      severity: "warning",
      company: latest.company,
      year: latest.year,
      variable: latest.variable,
      row: latest.sourceRow,
      message: `${group.length} رکورد تکراری برای «${latest.variable}» در ${latest.company} ـ ${latest.year} یافت شد.`,
    });
  }

  const validRecords = records.filter(
    (record) => record.company && record.year && (record.variable || record.code),
  );
  const index = new Map<string, Map<number, Map<string, FinancialRecord>>>();
  const codeIndex = new Map<string, Map<number, Map<string, FinancialRecord>>>();
  const codeByVariable = new Map<string, string>();
  for (const record of validRecords) {
    const byYear = index.get(record.company) ?? new Map<number, Map<string, FinancialRecord>>();
    const byVariable = byYear.get(record.year) ?? new Map<string, FinancialRecord>();
    byVariable.set(record.normalizedVariable, record);
    byYear.set(record.year, byVariable);
    index.set(record.company, byYear);

    const companyCodes =
      codeIndex.get(record.company) ?? new Map<number, Map<string, FinancialRecord>>();
    const yearCodes = companyCodes.get(record.year) ?? new Map<string, FinancialRecord>();
    if (record.code) {
      yearCodes.set(record.code, record);
      if (record.normalizedVariable) codeByVariable.set(record.normalizedVariable, record.code);
    }
    companyCodes.set(record.year, yearCodes);
    codeIndex.set(record.company, companyCodes);
  }

  const companies = [...new Set(validRecords.map((record) => record.company))].sort((a, b) =>
    a.localeCompare(b, "fa"),
  );
  const years = [...new Set(validRecords.map((record) => record.year))].sort((a, b) => a - b);
  const requiredNormalized = REQUIRED_ANALYTICAL_VARIABLES.map(normalizeText);
  for (const company of companies) {
    for (const year of years) {
      const byVariable = index.get(company)?.get(year);
      if (!byVariable) continue;
      const missing = requiredNormalized.filter((variable) => !byVariable.has(variable));
      if (missing.length) {
        for (const variable of missing) {
          issues.push({
            type: "missing-required-variable",
            severity: "warning",
            company,
            year,
            variable,
            message: `متغیر تحلیلی «${variable}» برای ${company} در سال ${year} موجود نیست.`,
          });
        }
        issues.push({
          type: "incomplete-year",
          severity: "warning",
          company,
          year,
          message: `سال ${year} شرکت «${company}» برای مدل تحلیلی ناقص است.`,
        });
      }
    }
  }

  const scorePresent = records.filter((record) => record.score !== null).length;
  const rankingScoreRecords = records.filter((record) =>
    RANKING_SCORE_CODES.includes(record.code as (typeof RANKING_SCORE_CODES)[number]),
  );
  const rankingScorePresent = rankingScoreRecords.filter((record) => record.score !== null).length;
  const scoreDiagnostics: ScoreDiagnostic[] = [
    ...records.reduce((grouped, record) => {
      if (!record.normalizedVariable) return grouped;
      const group = grouped.get(record.normalizedVariable) ?? [];
      group.push(record);
      grouped.set(record.normalizedVariable, group);
      return grouped;
    }, new Map<string, FinancialRecord[]>()),
  ]
    .map(([normalizedVariable, group]) => {
      const scores = group
        .map((record) => record.score)
        .filter((score): score is number => score !== null && Number.isFinite(score));
      const sorted = [...scores].sort((a, b) => a - b);
      const minimum = sorted[0] ?? null;
      const maximum = sorted.at(-1) ?? null;
      const mean = scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : null;
      const median =
        sorted.length === 0
          ? null
          : sorted.length % 2
            ? sorted[Math.floor(sorted.length / 2)]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      const standardDeviation =
        scores.length && mean !== null
          ? Math.sqrt(
              scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) /
                scores.length,
            )
          : null;
      const range = minimum === null || maximum === null ? null : maximum - minimum;
      const scaleValid =
        maximum !== null &&
        range !== null &&
        maximum >= 2 &&
        range >= 2;
      const variable = group.find((record) => record.variable)?.variable ?? normalizedVariable;
      const reason = scaleValid
        ? "دامنه مشاهده‌شده نمره برای تحلیل توزیع مناسب است."
        : maximum === null
          ? "نمره استاندارد برای این متغیر ثبت نشده است."
          : maximum < 2
            ? "حداکثر مشاهده‌شده کمتر از ۲ است؛ نمره حذف نمی‌شود، اما دامنه محدود است."
            : "دامنه مشاهده‌شده کمتر از ۲ واحد است؛ نمره حذف نمی‌شود، اما تفکیک‌پذیری محدود است.";
      return {
        variable,
        normalizedVariable,
        count: group.length,
        missingCount: group.length - scores.length,
        missingPercent: group.length ? (group.length - scores.length) / group.length : 0,
        minimum: minimum === null ? null : round(minimum, 4),
        maximum: maximum === null ? null : round(maximum, 4),
        mean: mean === null ? null : round(mean, 4),
        median: median === null ? null : round(median, 4),
        standardDeviation:
          standardDeviation === null ? null : round(standardDeviation, 4),
        zeroCount: scores.filter((score) => Math.abs(score) < 1e-9).length,
        tenCount: scores.filter((score) => Math.abs(score - 10) < 1e-9).length,
        range: range === null ? null : round(range, 4),
        scaleValid,
        reason,
      } satisfies ScoreDiagnostic;
    })
    .sort((a, b) => a.variable.localeCompare(b.variable, "fa"));

  for (const diagnostic of scoreDiagnostics) {
    if (diagnostic.scaleValid || diagnostic.maximum === null) continue;
    issues.push({
      type: "invalid-score-scale",
      severity: "warning",
      variable: diagnostic.variable,
      message: `دامنه مشاهده‌شده نمره «${diagnostic.variable}» محدود است: ${diagnostic.reason} این هشدار به‌تنهایی نمره را از مدل حذف نمی‌کند.`,
    });
  }

  const incompleteRecords = records.filter(
    (record) =>
      !record.company ||
      !record.year ||
      (!record.variable && !record.code) ||
      record.scoreIssue === "invalid" ||
      record.scoreIssue === "out-of-range",
  ).length;
  const summary: ValidationSummary = {
    totalRecords: records.length,
    companies: companies.length,
    years: years.length,
    variables: new Set(records.map((record) => record.normalizedVariable).filter(Boolean)).size,
    scoreCompleteness: records.length ? scorePresent / records.length : 0,
    rankingScoreCompleteness: rankingScoreRecords.length
      ? rankingScorePresent / rankingScoreRecords.length
      : 0,
    missingRequiredScores: rankingScoreRecords.length - rankingScorePresent,
    incompleteRecords,
    duplicateRecords: duplicateCount,
    warnings: issues.filter((issue) => issue.severity !== "info").length,
    invalidScores: issues.filter(
      (issue) => issue.type === "invalid-score" || issue.type === "out-of-range",
    ).length,
    invalidScoreScales: scoreDiagnostics.filter(
      (diagnostic) => !diagnostic.scaleValid && diagnostic.maximum !== null,
    ).length,
    imputedNatureRows: records.filter((record) => record.natureImputed).length,
  };

  return {
    fileName,
    importedAt: new Date().toISOString(),
    headers: normalizedHeaders,
    records,
    validRecords,
    companies,
    years,
    natures: [...new Set(validRecords.map((record) => record.nature).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "fa"),
    ),
    issues,
    summary,
    missingColumns: [...missingColumns],
    duplicateCount,
    index,
    codeIndex,
    codeByVariable,
    natureByCompany,
    scoreDiagnostics,
  };
}

export function getRecord(
  model: FinancialModel,
  company: string,
  year: number,
  variable: string,
): FinancialRecord | null {
  const normalized = normalizeText(variable);
  const code = model.codeByVariable.get(normalized);
  if (code) {
    const byCode = model.codeIndex.get(company)?.get(year)?.get(code);
    if (byCode) return byCode;
  }
  return model.index.get(company)?.get(year)?.get(normalized) ?? null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function classifyScore(score: number | null, settings: ModelSettings): Band | null {
  if (score === null) return null;
  if (score < settings.lowBoundary) return "weak";
  if (score < settings.highBoundary) return "medium";
  return "good";
}

export function classifyScatterScore(score: number | null): Band | null {
  if (score === null) return null;
  if (score < SCATTER_BOUNDARIES.low) return "weak";
  if (score < SCATTER_BOUNDARIES.high) return "medium";
  return "good";
}

export function bandLabel(band: Band | null): string {
  if (band === "weak") return "ضعیف";
  if (band === "medium") return "متوسط";
  if (band === "good") return "مطلوب";
  return "داده ناکافی";
}

function recordComponent(
  model: FinancialModel,
  company: string,
  year: number,
  key: string,
  label: string,
  variable: string,
  weight: number,
): AxisComponent {
  const record = getRecord(model, company, year, variable);
  return {
    key,
    label,
    variable,
    score: record?.score ?? null,
    value: record?.value ?? null,
    unit: record?.unit ?? "",
    originalWeight: weight,
    adjustedWeight: 0,
    contribution: 0,
    missing: record?.score === null || record?.score === undefined,
  };
}

function weightedAxis(
  key: AxisKey,
  components: AxisComponent[],
  settings: ModelSettings,
  formula: string,
  warnings: string[] = [],
): AxisResult {
  const available = components.filter((component) => component.score !== null);
  const coverage = available.reduce((sum, component) => sum + component.originalWeight, 0);
  const missing = components.filter((component) => component.score === null).map((item) => item.label);
  if (coverage + 1e-9 < settings.minimumCoverage) {
    return {
      key,
      label: AXIS_LABELS[key],
      score: null,
      coverage: round(coverage, 4),
      band: null,
      components: components.map((component) => ({ ...component, missing: component.score === null })),
      missing,
      warnings: [
        ...warnings,
        `فقط ${Math.round(coverage * 100)}٪ از وزن محور داده معتبر دارد؛ حداقل لازم ${Math.round(settings.minimumCoverage * 100)}٪ است.`,
      ],
      formula,
    };
  }
  const calculated = components.map((component) => {
    if (component.score === null) return { ...component, adjustedWeight: 0, contribution: 0 };
    const adjustedWeight = component.originalWeight / coverage;
    return {
      ...component,
      adjustedWeight,
      contribution: component.score * adjustedWeight,
      missing: false,
    };
  });
  const score = round(
    calculated.reduce((sum, component) => sum + component.contribution, 0),
    2,
  );
  const redistributed =
    coverage < 0.999
      ? [`وزن شاخص‌های موجود از ${Math.round(coverage * 100)}٪ به ۱۰۰٪ بازتوزیع شد.`]
      : [];
  return {
    key,
    label: AXIS_LABELS[key],
    score,
    coverage: round(coverage, 4),
    band: classifyScore(score, settings),
    components: calculated,
    missing,
    warnings: [...warnings, ...redistributed],
    formula,
  };
}

type ScatterDerivedMetric =
  | "ocfMargin"
  | "revenueGrowth"
  | "ebitGrowth"
  | "equityAssets"
  | "interestCoverage";

const scatterScoreCache = new WeakMap<FinancialModel, Map<string, { score: number; groupSize: number }>>();

function derivedScatterValue(
  model: FinancialModel,
  company: string,
  year: number,
  metric: ScatterDerivedMetric,
): number | null {
  if (metric === "ocfMargin") {
    const ocf = getRecord(model, company, year, VARIABLES.ocf)?.value ?? null;
    const revenue = getRecord(model, company, year, VARIABLES.revenue)?.value ?? null;
    return ocf === null || revenue === null || revenue === 0 ? null : ocf / Math.abs(revenue);
  }
  if (metric === "revenueGrowth") {
    return getRecord(model, company, year, VARIABLES.revenueGrowth)?.value ?? null;
  }
  if (metric === "equityAssets") {
    const equity = getRecord(model, company, year, VARIABLES.equity)?.value ?? null;
    const assets = getRecord(model, company, year, VARIABLES.assets)?.value ?? null;
    return equity === null || assets === null || assets === 0 ? null : equity / Math.abs(assets);
  }
  if (metric === "interestCoverage") {
    const ebit =
      getRecord(model, company, year, VARIABLES.ebit)?.value ??
      getRecord(model, company, year, VARIABLES.operatingProfit)?.value ??
      null;
    const financeCost = getRecord(model, company, year, VARIABLES.financeCost)?.value ?? null;
    if (ebit === null || financeCost === null) return null;
    if (financeCost === 0) return ebit === 0 ? 0 : Math.sign(ebit) * 1_000_000;
    return ebit / Math.abs(financeCost);
  }
  const current =
    getRecord(model, company, year, VARIABLES.ebit)?.value ??
    getRecord(model, company, year, VARIABLES.operatingProfit)?.value ??
    null;
  const previous =
    getRecord(model, company, year - 1, VARIABLES.ebit)?.value ??
    getRecord(model, company, year - 1, VARIABLES.operatingProfit)?.value ??
    null;
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

function percentileScore(
  model: FinancialModel,
  company: string,
  year: number,
  cacheKey: string,
  valueFor: (candidateCompany: string, candidateYear: number) => number | null,
): { score: number; groupSize: number } | null {
  const currentValue = valueFor(company, year);
  if (currentValue === null || !Number.isFinite(currentValue)) return null;
  const nature = model.natureByCompany.get(company) ?? "";
  const key = `${cacheKey}|${nature}|${company}|${year}`;
  const modelCache = scatterScoreCache.get(model) ?? new Map<string, { score: number; groupSize: number }>();
  scatterScoreCache.set(model, modelCache);
  const cached = modelCache.get(key);
  if (cached) return cached;
  const values = model.companies
    .filter((candidateCompany) => !nature || model.natureByCompany.get(candidateCompany) === nature)
    .flatMap((candidateCompany) =>
      model.years.map((candidateYear) => valueFor(candidateCompany, candidateYear)),
    )
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (!values.length) return null;
  if (values.length === 1) {
    const result = { score: 5, groupSize: 1 };
    modelCache.set(key, result);
    return result;
  }
  const epsilon = Math.max(1e-12, Math.abs(currentValue) * 1e-10);
  const below = values.filter((value) => value < currentValue - epsilon).length;
  const tied = values.filter((value) => Math.abs(value - currentValue) <= epsilon).length;
  const averageRank = below + Math.max(0, tied - 1) / 2;
  const result = {
    score: round(clampScore((averageRank / (values.length - 1)) * 10), 2),
    groupSize: values.length,
  };
  modelCache.set(key, result);
  return result;
}

function scatterRecordComponent(
  model: FinancialModel,
  company: string,
  year: number,
  key: string,
  label: string,
  variable: string,
  weight: number,
): AxisComponent {
  const record = getRecord(model, company, year, variable);
  const fallback = record?.score == null
    ? percentileScore(
        model,
        company,
        year,
        `variable:${normalizeText(variable)}`,
        (candidateCompany, candidateYear) =>
          getRecord(model, candidateCompany, candidateYear, variable)?.value ?? null,
      )
    : null;
  const score = record?.score ?? fallback?.score ?? null;
  return {
    key,
    label,
    variable,
    score,
    value: record?.value ?? null,
    unit: record?.unit ?? "",
    originalWeight: weight,
    adjustedWeight: score === null ? 0 : weight,
    contribution: score === null ? 0 : score * weight,
    method: record?.score != null
      ? "امتیاز نرمال‌شده فایل ورودی استفاده شد."
      : fallback
        ? `مقدار خام در جامعه پنج‌ساله هم‌ماهیت (${fallback.groupSize} مشاهده) به رتبه درصدی صفر تا ۱۰ تبدیل شد.`
        : "امتیاز معتبر یا مقدار خام قابل مقایسه موجود نیست.",
    missing: score === null,
  };
}

function derivedScatterComponent(
  model: FinancialModel,
  company: string,
  year: number,
  metric: ScatterDerivedMetric,
  label: string,
  variable: string,
  weight: number,
): AxisComponent {
  const value = derivedScatterValue(model, company, year, metric);
  const normalized = percentileScore(
    model,
    company,
    year,
    `derived:${metric}`,
    (candidateCompany, candidateYear) =>
      derivedScatterValue(model, candidateCompany, candidateYear, metric),
  );
  return {
    key: metric,
    label,
    variable,
    score: normalized?.score ?? null,
    value,
    unit: "نسبت",
    originalWeight: weight,
    adjustedWeight: normalized ? weight : 0,
    contribution: normalized ? normalized.score * weight : 0,
    method: normalized
      ? `مقدار خام محاسبه و در جامعه پنج‌ساله هم‌ماهیت (${normalized.groupSize} مشاهده) به رتبه درصدی صفر تا ۱۰ تبدیل شد.`
      : "مقدار خام لازم برای محاسبه این شاخص موجود نیست.",
    missing: !normalized,
  };
}

function scatterInterestCoverageComponent(
  model: FinancialModel,
  company: string,
  year: number,
  weight: number,
): AxisComponent {
  const ready = getRecord(model, company, year, VARIABLES.interestCoverage);
  if (ready?.score != null) {
    return scatterRecordComponent(
      model,
      company,
      year,
      "interestCoverage",
      "پوشش هزینه مالی",
      VARIABLES.interestCoverage,
      weight,
    );
  }
  return derivedScatterComponent(
    model,
    company,
    year,
    "interestCoverage",
    "پوشش هزینه مالی",
    "EBIT ÷ قدرمطلق هزینه مالی",
    weight,
  );
}

function fixedScatterAxis(
  key: AxisKey,
  components: AxisComponent[],
  formula: string,
): AxisResult {
  const coverage = components
    .filter((component) => component.score !== null)
    .reduce((sum, component) => sum + component.originalWeight, 0);
  const missing = components
    .filter((component) => component.score === null)
    .map((component) => component.label);
  const calculated = components.map((component) => ({
    ...component,
    adjustedWeight: component.score === null ? 0 : component.originalWeight,
    contribution: component.score === null ? 0 : component.score * component.originalWeight,
    missing: component.score === null,
  }));
  if (coverage < 0.999999) {
    return {
      key,
      label: AXIS_LABELS[key],
      score: null,
      coverage: round(coverage, 4),
      band: null,
      components: calculated,
      missing,
      warnings: [
        `به‌دلیل نبود «${missing.join("، ")}»، امتیاز محور محاسبه نشد؛ وزن‌ها بازتوزیع نمی‌شوند.`,
      ],
      formula,
    };
  }
  const score = round(
    calculated.reduce((sum, component) => sum + component.contribution, 0),
    2,
  );
  return {
    key,
    label: AXIS_LABELS[key],
    score,
    coverage: 1,
    band: classifyScatterScore(score),
    components: calculated,
    missing: [],
    warnings: [],
    formula,
  };
}

function ocfStabilityComponent(
  model: FinancialModel,
  company: string,
  year: number,
  weight: number,
): AxisComponent {
  const records = [year - 2, year - 1, year]
    .map((candidateYear) => getRecord(model, company, candidateYear, VARIABLES.ocf))
    .filter((record): record is FinancialRecord => record?.score != null);
  let score: number | null = null;
  let method = "";
  if (records.length === 3) {
    const scores = records.map((record) => record.score as number);
    const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const variance =
      scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    score = round(clampScore(10 - 2 * standardDeviation), 2);
    method = `انحراف معیار سه نمره ${records.map((record) => record.year).join("، ")} برابر ${round(standardDeviation, 2)} است.`;
  } else if (records.length === 2) {
    const difference = Math.abs((records[1].score as number) - (records[0].score as number));
    score = round(clampScore(10 - difference), 2);
    method = `بر مبنای اختلاف مطلق دو نمره (${round(difference, 2)}) محاسبه شد.`;
  } else {
    method = "کمتر از دو سال نمره معتبر OCF وجود دارد.";
  }
  return {
    key: "ocfStability",
    label: "پایداری جریان نقد عملیاتی",
    variable: VARIABLES.ocf,
    score,
    value: null,
    unit: "امتیاز",
    originalWeight: weight,
    adjustedWeight: 0,
    contribution: 0,
    method,
    missing: score === null,
  };
}

function operatingProfitGrowthComponent(
  model: FinancialModel,
  company: string,
  year: number,
  weight: number,
): AxisComponent {
  const records = [year - 2, year - 1, year].map((candidateYear) =>
    getRecord(model, company, candidateYear, VARIABLES.operatingProfit),
  );
  const values = records.map((record) => record?.value ?? null);
  const scores = records.map((record) => record?.score ?? null);
  let score: number | null = null;
  let value: number | null = null;
  let method = "";
  if (values.every((item): item is number => item !== null && item > 0)) {
    const cagr = (values[2] / values[0]) ** 0.5 - 1;
    value = cagr;
    score = round(clampScore(5 + cagr * 10), 2);
    method = `CAGR دو‌ساله سود عملیاتی ${round(cagr * 100, 1)}٪؛ نگاشت صفر رشد به نمره ۵ و اشباع در ±۵۰٪.`;
  } else if (scores.every((item): item is number => item !== null)) {
    const delta = scores[2] - scores[0];
    value = delta;
    score = round(clampScore(5 + delta * 1.25), 2);
    method = `به‌علت مبنای غیرمثبت یا تغییر علامت، از تغییر نمره سود عملیاتی (${round(delta, 2)}) استفاده شد.`;
  } else {
    method = "برای محاسبه رشد سود عملیاتی، سه سال داده معتبر در دسترس نیست.";
  }
  return {
    key: "operatingProfitGrowth",
    label: "رشد سود عملیاتی",
    variable: VARIABLES.operatingProfit,
    score,
    value,
    unit: value === null ? "" : method.startsWith("CAGR") ? "نسبت" : "تغییر امتیاز",
    originalWeight: weight,
    adjustedWeight: 0,
    contribution: 0,
    method,
    missing: score === null,
  };
}

function syntheticAxisComponent(
  key: string,
  result: AxisResult,
  weight: number,
): AxisComponent {
  return {
    key,
    label: result.label,
    variable: result.label,
    score: result.score,
    value: result.score,
    unit: "امتیاز",
    originalWeight: weight,
    adjustedWeight: 0,
    contribution: 0,
    method: "از امتیاز بُعدی محاسبه‌شده استفاده شده است.",
    missing: result.score === null,
  };
}

export function calculateAxes(
  model: FinancialModel,
  company: string,
  year: number,
  settings: ModelSettings,
): AxisBundle {
  const w = settings.weights;
  const profitability = weightedAxis(
    "profitability",
    [
      recordComponent(
        model,
        company,
        year,
        "operatingMargin",
        "حاشیه سود عملیاتی",
        VARIABLES.operatingMargin,
        w.profitability.operatingMargin,
      ),
      recordComponent(
        model,
        company,
        year,
        "npm",
        "حاشیه سود خالص",
        VARIABLES.npm,
        w.profitability.npm,
      ),
    ],
    settings,
    "حاشیه سود عملیاتی × ۶۰٪ + حاشیه سود خالص × ۴۰٪",
  );

  const cashQuality = weightedAxis(
    "cashQuality",
    [
      recordComponent(
        model,
        company,
        year,
        "cfoNi",
        "جریان نقد عملیاتی به سود خالص",
        VARIABLES.cfoNi,
        w.cashQuality.cfoNi,
      ),
      recordComponent(
        model,
        company,
        year,
        "fcfMargin",
        "حاشیه جریان نقد آزاد",
        VARIABLES.fcfMargin,
        w.cashQuality.fcfMargin,
      ),
      ocfStabilityComponent(model, company, year, w.cashQuality.ocfStability),
    ],
    settings,
    "CFO/NI × ۵۰٪ + حاشیه FCF × ۳۰٪ + پایداری OCF × ۲۰٪",
  );

  const growth = weightedAxis(
    "growth",
    [
      recordComponent(
        model,
        company,
        year,
        "revenueGrowth",
        "رشد درآمد",
        VARIABLES.revenueGrowth,
        w.growth.revenueGrowth,
      ),
      operatingProfitGrowthComponent(
        model,
        company,
        year,
        w.growth.operatingProfitGrowth,
      ),
    ],
    settings,
    "رشد درآمد × ۶۰٪ + رشد سود عملیاتی × ۴۰٪",
  );

  const roicRecord =
    getRecord(model, company, year, VARIABLES.roic)?.score != null
      ? VARIABLES.roic
      : VARIABLES.roce;
  const capitalReturn = weightedAxis(
    "capitalReturn",
    [
      recordComponent(
        model,
        company,
        year,
        "roic",
        roicRecord === VARIABLES.roic ? "ROIC روش دارایی" : "ROCE (جایگزین ROIC)",
        roicRecord,
        w.capitalReturn.roic,
      ),
      recordComponent(
        model,
        company,
        year,
        "assetTurnover",
        "گردش دارایی‌ها",
        VARIABLES.assetTurnover,
        w.capitalReturn.assetTurnover,
      ),
    ],
    settings,
    "ROIC × ۷۰٪ + گردش دارایی‌ها × ۳۰٪",
    roicRecord === VARIABLES.roce ? ["ROIC موجود نبود؛ ROCE به‌عنوان جایگزین استفاده شد."] : [],
  );

  const resilience = weightedAxis(
    "resilience",
    [
      recordComponent(
        model,
        company,
        year,
        "debtEbitda",
        "بدهی خالص به EBITDA",
        VARIABLES.debtEbitda,
        w.resilience.debtEbitda,
      ),
      recordComponent(
        model,
        company,
        year,
        "interestCoverage",
        "پوشش بهره",
        VARIABLES.interestCoverage,
        w.resilience.interestCoverage,
      ),
      recordComponent(
        model,
        company,
        year,
        "quickRatio",
        "نسبت آنی",
        VARIABLES.quickRatio,
        w.resilience.quickRatio,
      ),
    ],
    settings,
    "بدهی خالص/EBITDA × ۴۰٪ + پوشش بهره × ۳۵٪ + نسبت آنی × ۲۵٪",
  );

  const financialPerformance = weightedAxis(
    "financialPerformance",
    [
      syntheticAxisComponent(
        "profitability",
        profitability,
        w.financialPerformance.profitability,
      ),
      syntheticAxisComponent(
        "capitalReturn",
        capitalReturn,
        w.financialPerformance.capitalReturn,
      ),
      syntheticAxisComponent(
        "cashQuality",
        cashQuality,
        w.financialPerformance.cashQuality,
      ),
    ],
    settings,
    "سودآوری × ۳۵٪ + بازده سرمایه × ۴۰٪ + کیفیت سود × ۲۵٪",
  );

  const workingCapital = weightedAxis(
    "workingCapital",
    [
      recordComponent(
        model,
        company,
        year,
        "ccc",
        "چرخه تبدیل نقد",
        VARIABLES.ccc,
        1,
      ),
    ],
    settings,
    "نمره آماده چرخه تبدیل نقد (CCC)",
  );

  const operatingProfitability = weightedAxis(
    "operatingProfitability",
    [
      recordComponent(
        model,
        company,
        year,
        "operatingMargin",
        "حاشیه سود عملیاتی",
        VARIABLES.operatingMargin,
        1,
      ),
    ],
    settings,
    "نمره آماده حاشیه سود عملیاتی",
  );

  // Scatter module: the formulas below are intentionally isolated from the
  // six-dimensional ranking engine so this phase changes only scatter analysis.
  const scatterProfitability = fixedScatterAxis(
    "scatterProfitability",
    [
      scatterRecordComponent(
        model,
        company,
        year,
        "operatingMargin",
        "حاشیه سود عملیاتی",
        VARIABLES.operatingMargin,
        0.6,
      ),
      scatterRecordComponent(
        model,
        company,
        year,
        "npm",
        "حاشیه سود خالص",
        VARIABLES.npm,
        0.4,
      ),
    ],
    "حاشیه سود عملیاتی × ۶۰٪ + حاشیه سود خالص × ۴۰٪",
  );

  const scatterCashQuality = fixedScatterAxis(
    "scatterCashQuality",
    [
      derivedScatterComponent(
        model,
        company,
        year,
        "ocfMargin",
        "حاشیه جریان نقد عملیاتی",
        "جریان نقد عملیاتی ÷ درآمد عملیاتی",
        0.35,
      ),
      scatterRecordComponent(
        model,
        company,
        year,
        "cfoNi",
        "جریان نقد عملیاتی به سود خالص",
        VARIABLES.cfoNi,
        0.35,
      ),
      scatterRecordComponent(
        model,
        company,
        year,
        "fcfMargin",
        "حاشیه جریان نقد آزاد نقدی",
        VARIABLES.fcfMargin,
        0.3,
      ),
    ],
    "حاشیه OCF × ۳۵٪ + CFO/NI × ۳۵٪ + حاشیه FCF × ۳۰٪",
  );

  const scatterGrowth = fixedScatterAxis(
    "scatterGrowth",
    [
      derivedScatterComponent(
        model,
        company,
        year,
        "revenueGrowth",
        "رشد درآمد",
        VARIABLES.revenueGrowth,
        0.6,
      ),
      derivedScatterComponent(
        model,
        company,
        year,
        "ebitGrowth",
        "رشد سود عملیاتی (EBIT)",
        "رشد سالانه EBIT",
        0.4,
      ),
    ],
    "رشد درآمد × ۶۰٪ + رشد EBIT × ۴۰٪",
  );

  const scatterReturn = fixedScatterAxis(
    "scatterReturn",
    [
      scatterRecordComponent(
        model,
        company,
        year,
        "roe",
        "بازده حقوق صاحبان سهام (ROE)",
        VARIABLES.roe,
        0.45,
      ),
      scatterRecordComponent(
        model,
        company,
        year,
        "roa",
        "بازده دارایی‌ها (ROA)",
        VARIABLES.roa,
        0.3,
      ),
      scatterRecordComponent(
        model,
        company,
        year,
        "assetTurnover",
        "گردش دارایی‌ها",
        VARIABLES.assetTurnover,
        0.25,
      ),
    ],
    "ROE × ۴۵٪ + ROA × ۳۰٪ + گردش دارایی × ۲۵٪",
  );

  const scatterResilience = fixedScatterAxis(
    "scatterResilience",
    [
      derivedScatterComponent(
        model,
        company,
        year,
        "equityAssets",
        "حقوق صاحبان سهام به دارایی‌ها",
        "حقوق مالکانه ÷ جمع دارایی‌ها",
        0.4,
      ),
      scatterInterestCoverageComponent(model, company, year, 0.35),
      scatterRecordComponent(
        model,
        company,
        year,
        "quickRatio",
        "نسبت آنی",
        VARIABLES.quickRatio,
        0.25,
      ),
    ],
    "حقوق صاحبان سهام/دارایی × ۴۰٪ + پوشش هزینه مالی × ۳۵٪ + نسبت آنی × ۲۵٪",
  );

  const scatterPerformance = fixedScatterAxis(
    "scatterPerformance",
    [
      derivedScatterComponent(
        model,
        company,
        year,
        "ocfMargin",
        "حاشیه جریان نقد عملیاتی",
        "جریان نقد عملیاتی ÷ درآمد عملیاتی",
        0.6,
      ),
      scatterRecordComponent(
        model,
        company,
        year,
        "operatingMargin",
        "حاشیه سود عملیاتی",
        VARIABLES.operatingMargin,
        0.4,
      ),
    ],
    "حاشیه جریان نقد عملیاتی × ۶۰٪ + حاشیه سود عملیاتی × ۴۰٪",
  );

  const scatterLiquidity = fixedScatterAxis(
    "scatterLiquidity",
    [
      scatterRecordComponent(
        model,
        company,
        year,
        "quickRatio",
        "نسبت آنی",
        VARIABLES.quickRatio,
        0.6,
      ),
      scatterRecordComponent(
        model,
        company,
        year,
        "currentRatio",
        "نسبت جاری",
        VARIABLES.currentRatio,
        0.4,
      ),
    ],
    "نسبت آنی × ۶۰٪ + نسبت جاری × ۴۰٪",
  );

  const scatterOperatingProfitability = fixedScatterAxis(
    "scatterOperatingProfitability",
    [
      scatterRecordComponent(
        model,
        company,
        year,
        "operatingMargin",
        "حاشیه سود عملیاتی",
        VARIABLES.operatingMargin,
        1,
      ),
    ],
    "حاشیه سود عملیاتی × ۱۰۰٪",
  );

  return {
    company,
    year,
    nature: model.natureByCompany.get(company) ?? "",
    axes: {
      profitability,
      cashQuality,
      growth,
      capitalReturn,
      resilience,
      financialPerformance,
      workingCapital,
      operatingProfitability,
      scatterProfitability,
      scatterCashQuality,
      scatterGrowth,
      scatterReturn,
      scatterResilience,
      scatterPerformance,
      scatterLiquidity,
      scatterOperatingProfitability,
    },
  };
}

export function buildAxisMatrix(
  model: FinancialModel,
  settings: ModelSettings,
): Map<string, Map<number, AxisBundle>> {
  const matrix = new Map<string, Map<number, AxisBundle>>();
  for (const company of model.companies) {
    const byYear = new Map<number, AxisBundle>();
    for (const year of model.years) {
      byYear.set(year, calculateAxes(model, company, year, settings));
    }
    matrix.set(company, byYear);
  }
  return matrix;
}

export function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)} میلیارد`;
  if (absolute >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)} میلیون`;
  if (absolute >= 1_000) return `${formatNumber(value / 1_000, 1)} هزار`;
  return formatNumber(value, 0);
}

export function getBubbleRecord(
  model: FinancialModel,
  company: string,
  year: number,
  metric: BubbleMetric,
): { value: number | null; label: string } {
  if (metric === "none") return { value: null, label: "اندازه ثابت" };
  const variable =
    metric === "revenue"
      ? VARIABLES.revenue
      : metric === "assets"
        ? VARIABLES.assets
        : VARIABLES.investedCapital;
  return { value: getRecord(model, company, year, variable)?.value ?? null, label: variable };
}

export function regionKey(
  x: number,
  y: number,
  settings: ModelSettings,
): `${Band}-${Band}` {
  return `${classifyScore(x, settings) as Band}-${classifyScore(y, settings) as Band}`;
}

const BAND_TITLES: Record<Band, string> = {
  weak: "ضعیف",
  medium: "متوسط",
  good: "مطلوب",
};

const INTERPRETATIONS: Record<ChartDefinition["key"], Record<`${Band}-${Band}`, string>> = {
  profitCash: {
    "weak-weak": "وضعیت بحرانی؛ ضعف هم‌زمان در سودآوری و نقدسازی.",
    "medium-weak": "سود متوسط با کیفیت نقدی ضعیف؛ نیازمند اصلاح عملیات.",
    "good-weak": "سود حسابداری بالا ولی کیفیت سود پایین؛ ریسک پایداری سود.",
    "weak-medium": "عملکرد ضعیف با برخی نشانه‌های مثبت در نقدسازی.",
    "medium-medium": "عملکرد متعادل؛ نیازمند پایش مستمر.",
    "good-medium": "شرکت سودآور، اما تبدیل سود به نقد نیازمند بهبود است.",
    "weak-good": "نقدسازی نسبی مناسب، ولی مدل کسب‌وکار کم‌سود است.",
    "medium-good": "ظرفیت بهبود دارد؛ نقدسازی خوب و حاشیه سود متوسط است.",
    "good-good": "شرکت ممتاز؛ سودآوری قوی همراه با نقدسازی مناسب و ظرفیت DPS.",
  },
  growthReturn: {
    "weak-weak": "شرکت کم‌رشد و کم‌بازده؛ نیازمند بازنگری راهبردی.",
    "medium-weak": "شرکت کم‌تحرک با بهره‌وری پایین.",
    "good-weak": "رشد کم‌کیفیت؛ افزایش حجم بدون ایجاد ارزش.",
    "weak-medium": "شرکت ایستا؛ ریسک کاهش رقابت‌پذیری دارد.",
    "medium-medium": "عملکرد پایدار، اما بدون مزیت ویژه.",
    "good-medium": "رشد بدون بهره‌برداری کامل از منابع؛ بهره‌وری باید بهبود یابد.",
    "weak-good": "شرکت کارا ولی بدون توسعه؛ نیازمند برنامه رشد است.",
    "medium-good": "شرکت بالغ با بهره‌وری مناسب و پتانسیل توسعه.",
    "good-good": "شرکت رشدکننده و ارزش‌آفرین؛ کاندید مناسب سرمایه‌گذاری.",
  },
  performanceResilience: {
    "weak-weak": "شرکت بحرانی؛ ضعف عملکرد همراه با آسیب‌پذیری مالی.",
    "medium-weak": "عملکرد متوسط با ریسک مالی بالا.",
    "good-weak": "عملکرد خوب اما شکننده؛ بدهی و نقدینگی باید کنترل شود.",
    "weak-medium": "شرکت کم‌عملکرد با محدودیت مالی.",
    "medium-medium": "شرکت معمولی؛ بدون مزیت مشخص.",
    "good-medium": "شرکت موفق، اما دارای ریسک مالی متوسط.",
    "weak-good": "ظرفیت مالی مناسب، ولی عملکرد عملیاتی ضعیف است.",
    "medium-good": "شرکت مقاوم، اما نیازمند ارتقای عملکرد است.",
    "good-good": "شرکت ممتاز؛ عملکرد قوی همراه با ساختار مالی سالم.",
  },
  operationsWc: {
    "weak-weak": "شرکت پرریسک؛ ضعف هم‌زمان عملیات و نقدینگی.",
    "medium-weak": "عملکرد عملیاتی متوسط همراه با فشار نقدینگی.",
    "good-weak": "شرکت سودآور، اما دارای ریسک نقدینگی؛ سرمایه در گردش باید کنترل شود.",
    "weak-medium": "شرکت کم‌بازده با وضعیت نقدی متوسط.",
    "medium-medium": "عملکرد متعادل؛ نیازمند بهبود تدریجی.",
    "good-medium": "شرکت سودآور با نیاز به بهبود مدیریت نقدینگی.",
    "weak-good": "منابع نقدی مناسب، اما عملیات ضعیف و استفاده از منابع ناکاراست.",
    "medium-good": "نقدشوندگی مناسب، اما ظرفیت سودآوری محدود است.",
    "good-good": "شرکت ایده‌آل؛ سودآور و دارای توان مناسب پرداخت تعهدات.",
  },
};

export function getRegionDescription(
  definition: ChartDefinition,
  x: number,
  y: number,
): { title: string; interpretation: string } {
  const xBand = classifyScatterScore(x) as Band;
  const yBand = classifyScatterScore(y) as Band;
  const key = `${xBand}-${yBand}` as `${Band}-${Band}`;
  return {
    title: `${definition.xLabel} ${BAND_TITLES[xBand]}، ${definition.yLabel} ${BAND_TITLES[yBand]}`,
    interpretation: INTERPRETATIONS[definition.key][key],
  };
}

export function buildChartPoint(
  model: FinancialModel,
  bundle: AxisBundle,
  definition: ChartDefinition,
  selectedCompany: string,
  bubbleMetric: BubbleMetric,
  settings: ModelSettings,
): ChartPoint | null {
  void settings;
  const xAxis = bundle.axes[definition.xKey];
  const yAxis = bundle.axes[definition.yKey];
  if (xAxis.score === null || yAxis.score === null) return null;
  const bubble = getBubbleRecord(model, bundle.company, bundle.year, bubbleMetric);
  const spread = getRecord(model, bundle.company, bundle.year, VARIABLES.spread);
  const region = getRegionDescription(definition, xAxis.score, yAxis.score);
  return {
    company: bundle.company,
    nature: bundle.nature,
    year: bundle.year,
    x: xAxis.score,
    y: yAxis.score,
    selected: bundle.company === selectedCompany,
    xAxis,
    yAxis,
    bubbleValue: bubble.value,
    bubbleLabel: bubble.label,
    spreadValue: spread?.value ?? null,
    spreadScore: spread?.score ?? null,
    regionTitle: region.title,
    interpretation: region.interpretation,
  };
}

export function trendDescription(points: ChartPoint[]): string {
  if (points.length < 2) return "برای تشخیص روند، حداقل دو سال داده معتبر لازم است.";
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.7) return "مسیر سه‌ساله باثبات و تغییرات محدود بوده است.";
  if (points.length === 3) {
    const dx1 = points[1].x - points[0].x;
    const dx2 = points[2].x - points[1].x;
    const dy1 = points[1].y - points[0].y;
    const dy2 = points[2].y - points[1].y;
    if (dx1 * dx2 < -0.2 || dy1 * dy2 < -0.2) {
      return "مسیر رفت‌وبرگشتی است و از پایداری روند اطمینان کافی وجود ندارد.";
    }
  }
  if (dx > 0.25 && dy > 0.25) return "حرکت هم‌زمان به سمت بالا و راست، نشان‌دهنده بهبود هر دو بُعد است.";
  if (dx < -0.25 && dy < -0.25) return "حرکت به پایین و چپ، افت هم‌زمان هر دو بُعد را نشان می‌دهد.";
  if (dx > 0.25 && dy < -0.25) return "محور افقی بهبود یافته، اما محور عمودی هم‌زمان تضعیف شده است.";
  if (dx < -0.25 && dy > 0.25) return "محور عمودی بهبود یافته، اما محور افقی هم‌زمان افت کرده است.";
  return Math.abs(dx) >= Math.abs(dy)
    ? `تغییر اصلی در محور افقی رخ داده و امتیاز آن ${dx > 0 ? "افزایش" : "کاهش"} یافته است.`
    : `تغییر اصلی در محور عمودی رخ داده و امتیاز آن ${dy > 0 ? "افزایش" : "کاهش"} یافته است.`;
}

export function chartNarrative(points: ChartPoint[]): string {
  if (!points.length) return "برای این نمودار در سال یا دوره انتخابی داده کافی وجود ندارد.";
  const last = points[points.length - 1];
  const trend = trendDescription(points);
  const warnings = [...last.xAxis.warnings, ...last.yAxis.warnings];
  const warningText = warnings.length
    ? `محدودیت داده: ${warnings[0]}`
    : last.x < SCATTER_BOUNDARIES.low || last.y < SCATTER_BOUNDARIES.low
      ? "حداقل یکی از ابعاد در ناحیه ضعیف است و باید در اولویت پیگیری قرار گیرد."
      : "در اجزای محاسبه این منظر هشدار داده‌ای بااهمیتی ثبت نشده است.";
  return `در سال ${last.year}، شرکت در ناحیه «${last.regionTitle}» قرار دارد. ${trend} ${warningText}`;
}

export function managementInsights(bundle: AxisBundle): {
  strengths: AxisResult[];
  weaknesses: AxisResult[];
  warnings: string[];
  actions: string[];
} {
  const primary = [
    bundle.axes.scatterProfitability,
    bundle.axes.scatterCashQuality,
    bundle.axes.scatterGrowth,
    bundle.axes.scatterReturn,
    bundle.axes.scatterResilience,
    bundle.axes.scatterLiquidity,
  ].filter((axis): axis is AxisResult & { score: number } => axis.score !== null);
  const sorted = [...primary].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3);
  const weaknesses = [...sorted].reverse().slice(0, 3);
  const warnings: string[] = [];
  const actions: string[] = [];
  const a = bundle.axes;
  if ((a.scatterProfitability.score ?? 0) >= SCATTER_BOUNDARIES.high && (a.scatterCashQuality.score ?? 10) < SCATTER_BOUNDARIES.low) {
    warnings.push("سودآوری مطلوب است، اما کیفیت تبدیل سود به نقد ضعیف است.");
    actions.push("برنامه عملیاتی برای بهبود تبدیل سود به نقد و کنترل اقلام تعهدی تدوین شود.");
  }
  if ((a.scatterGrowth.score ?? 0) >= SCATTER_BOUNDARIES.high && (a.scatterReturn.score ?? 10) < SCATTER_BOUNDARIES.low) {
    warnings.push("رشد بالا با بازده سرمایه پایین همراه شده و احتمال رشد مخرب ارزش وجود دارد.");
    actions.push("سرمایه‌گذاری‌های توسعه‌ای از نظر ROIC و هزینه سرمایه بازبینی شوند.");
  }
  if ((a.scatterPerformance.score ?? 0) >= SCATTER_BOUNDARIES.high && (a.scatterResilience.score ?? 10) < SCATTER_BOUNDARIES.low) {
    warnings.push("عملکرد مناسب با تاب‌آوری مالی ضعیف همراه است.");
    actions.push("ساختار بدهی، سررسیدها و پوشش هزینه مالی اصلاح شود.");
  }
  if ((a.scatterOperatingProfitability.score ?? 0) >= SCATTER_BOUNDARIES.high && (a.scatterLiquidity.score ?? 10) < SCATTER_BOUNDARIES.low) {
    warnings.push("عملیات سودآور است، اما شرکت با ریسک نقدینگی روبه‌روست.");
    actions.push("سرمایه در گردش، وصول مطالبات و سررسید تعهدات کوتاه‌مدت بازتنظیم شود.");
  }
  for (const axis of primary) {
    if (axis.score === null) warnings.push(`برای محور «${axis.label}» داده کافی وجود ندارد.`);
  }
  if ((a.scatterLiquidity.score ?? 10) < SCATTER_BOUNDARIES.low) {
    actions.push("نسبت‌های جاری و آنی با برنامه کنترل سرمایه در گردش تقویت شوند.");
  }
  if ((a.scatterResilience.score ?? 10) < SCATTER_BOUNDARIES.low) {
    actions.push("کاهش اهرم و تقویت پوشش بهره در اولویت تأمین مالی قرار گیرد.");
  }
  if ((a.scatterProfitability.score ?? 10) < SCATTER_BOUNDARIES.low) {
    actions.push("محرک‌های حاشیه سود، ترکیب فروش و بهای تمام‌شده بازطراحی شوند.");
  }
  if ((a.scatterReturn.score ?? 10) < SCATTER_BOUNDARIES.low) {
    actions.push("دارایی‌های کم‌بازده و سرمایه‌گذاری‌های زیر نرخ هدف شناسایی و تعیین تکلیف شوند.");
  }
  return {
    strengths,
    weaknesses,
    warnings: [...new Set(warnings)].slice(0, 5),
    actions: [...new Set(actions)].slice(0, 3),
  };
}

export function previousComparableScore(
  matrix: Map<string, Map<number, AxisBundle>>,
  company: string,
  year: number,
  axisKey: AxisKey,
): number | null {
  const previous = [...(matrix.get(company)?.keys() ?? [])]
    .filter((candidate) => candidate < year)
    .sort((a, b) => b - a)
    .find((candidate) => matrix.get(company)?.get(candidate)?.axes[axisKey].score != null);
  return previous ? matrix.get(company)?.get(previous)?.axes[axisKey].score ?? null : null;
}

export function settingsAreValid(settings: ModelSettings): boolean {
  const groups = Object.values(settings.weights) as Record<string, number>[];
  const performance = settings.performance ?? DEFAULT_SETTINGS.performance;
  const dimensionWeightSets = Object.values(performance.dimensionWeightsByNature ?? {
    production: performance.dimensionWeights,
  });
  return (
    settings.lowBoundary > 0 &&
    settings.lowBoundary < settings.highBoundary &&
    settings.highBoundary < 10 &&
    settings.minimumCoverage >= 0.5 &&
    settings.minimumCoverage <= 1 &&
    performance.minimumBaseCoverage >= 0.5 &&
    performance.minimumBaseCoverage <= 1 &&
    performance.criticalNetDebtEbitda > 0 &&
    performance.severeNetDebtEbitda > performance.criticalNetDebtEbitda &&
    Math.abs(performance.absoluteWeight + performance.relativeWeight - 1) < 0.001 &&
    dimensionWeightSets.every(
      (weightSet) =>
        Math.abs(Object.values(weightSet).reduce((sum, value) => sum + value, 0) - 1) < 0.001 &&
        Object.values(weightSet).every((value) => value >= 0.05 && value <= 0.4),
    ) &&
    Math.abs(
      Object.values(performance.historyWeights).reduce((sum, value) => sum + value, 0) - 1,
    ) < 0.001 &&
    Math.abs(
      Object.values(performance.twoYearWeights).reduce((sum, value) => sum + value, 0) - 1,
    ) < 0.001 &&
    groups.every(
      (group) =>
        Math.abs(Object.values(group).reduce((a: number, b: number) => a + b, 0) - 1) <
        0.001,
    )
  );
}

export const VARIABLE_NAMES = VARIABLES;
