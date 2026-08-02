export const REQUIRED_COLUMNS = [
  "ردیف",
  "ماهیت",
  "شرکت",
  "سال",
  "متغیر",
  "کد متغیر",
  "واحد",
  "مقدار",
  "تبدیل به شاخص",
  "نمره",
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
    | "nature-imputed";
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
  incompleteRecords: number;
  duplicateRecords: number;
  warnings: number;
  invalidScores: number;
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

export interface ModelSettings {
  lowBoundary: number;
  highBoundary: number;
  minimumCoverage: number;
  showAverage: boolean;
  showLabels: boolean;
  weights: AxisWeights;
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
};

export const CHART_DEFINITIONS: ChartDefinition[] = [
  {
    key: "profitCash",
    title: "سودآوری و کیفیت سود",
    xKey: "profitability",
    yKey: "cashQuality",
    xLabel: "امتیاز سودآوری",
    yLabel: "کیفیت سود و جریان نقد",
  },
  {
    key: "growthReturn",
    title: "رشد و بازده سرمایه",
    xKey: "growth",
    yKey: "capitalReturn",
    xLabel: "امتیاز رشد",
    yLabel: "بازده سرمایه",
  },
  {
    key: "performanceResilience",
    title: "عملکرد و تاب‌آوری مالی",
    xKey: "resilience",
    yKey: "financialPerformance",
    xLabel: "تاب‌آوری مالی",
    yLabel: "عملکرد مالی",
  },
  {
    key: "operationsWc",
    title: "عملیات و سرمایه در گردش",
    xKey: "workingCapital",
    yKey: "operatingProfitability",
    xLabel: "کارایی سرمایه در گردش",
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
};

const VARIABLES = {
  operatingMargin: "حاشیه سود عملیاتی",
  npm: "حاشیه سود خالص (NPM)",
  cfoNi: "جریان نقد عملیاتی به سود خالص (CFO / NI)",
  fcfMargin: "حاشیه جریان نقد آزاد (FCF Margin)",
  ocf: "OCF جریان نقد عملیاتی",
  revenueGrowth: "رشد درآمد (CAGR)",
  operatingProfit: "سود (زیان) عملیاتی",
  roic: "بازده سرمایه گذاری ROIC روش دارایی",
  roce: "ROCE بازده سرمایه بکار گرفته شده",
  assetTurnover: "گردش دارایی ها",
  debtEbitda: "بدهی خالص به EBITDA",
  interestCoverage: "نسبت پوشش بهره (Interest Coverage)",
  quickRatio: "نسبت آنی",
  ccc: "چرخه تبدیل نقد (CCC)",
  dso: "روزهای وصول مطالبات (DSO)",
  dio: "روزهای نگهداری موجودی (DIO)",
  dpo: "روزهای پرداخت بدهی (DPO)",
  revenue: "درآمدهای عملیاتی",
  assets: "جمع دارایی‌ها",
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
  const normalized = raw
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".")
    .replace(/[٪%]/g, "")
    .replace(/[−–—]/g, "-")
    .trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return isPercent ? parsed / 100 : parsed;
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

export function buildFinancialModel(
  rows: Record<string, unknown>[],
  headers: string[],
  fileName: string,
): FinancialModel {
  const normalizedHeaders = headers.map(normalizeText);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !normalizedHeaders.includes(normalizeText(column)),
  );
  const issues: DataIssue[] = missingColumns.map((column) => ({
    type: "missing-column",
    severity: "error",
    message: `ستون «${column}» در فایل پیدا نشد.`,
  }));

  const prelim = rows.map((row, index) => {
    const company = normalizeText(rawValue(row, "شرکت"));
    const nature = normalizeText(rawValue(row, "ماهیت"));
    const variable = normalizeText(rawValue(row, "متغیر"));
    const year = parseYear(rawValue(row, "سال"));
    const rawScore = rawValue(row, "نمره");
    const score = parseNumeric(rawScore);
    const hasRawScore = rawScore !== null && rawScore !== undefined && rawScore !== "";
    let scoreIssue: FinancialRecord["scoreIssue"] = null;
    if (!hasRawScore) scoreIssue = "missing";
    else if (score === null) scoreIssue = "invalid";
    else if (score < 0 || score > 10) scoreIssue = "out-of-range";
    return {
      sourceRow: index + 2,
      nature,
      company,
      year,
      variable,
      normalizedVariable: normalizeText(variable),
      code: normalizeText(rawValue(row, "کد متغیر")),
      unit: normalizeText(rawValue(row, "واحد")),
      value: parseNumeric(rawValue(row, "مقدار")),
      indexedValue: parseNumeric(rawValue(row, "تبدیل به شاخص")),
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
    if (record.scoreIssue === "missing") {
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
  const incompleteRecords = records.filter(
    (record) => !record.company || !record.year || (!record.variable && !record.code) || record.scoreIssue,
  ).length;
  const summary: ValidationSummary = {
    totalRecords: records.length,
    companies: companies.length,
    years: years.length,
    variables: new Set(records.map((record) => record.normalizedVariable).filter(Boolean)).size,
    scoreCompleteness: records.length ? scorePresent / records.length : 0,
    incompleteRecords,
    duplicateRecords: duplicateCount,
    warnings: issues.filter((issue) => issue.severity !== "info").length,
    invalidScores: issues.filter(
      (issue) => issue.type === "invalid-score" || issue.type === "out-of-range",
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
    "weak-weak": "عملکرد ضعیف و نقدسوز؛ نیازمند مداخله جدی.",
    "medium-weak": "سود ظاهراً قابل‌قبول، اما کیفیت تبدیل سود به نقد پایین است.",
    "good-weak": "سودآوری حسابداری بالا ولی شکننده و کم‌کیفیت.",
    "weak-medium": "سودآوری پایین با نقدسازی نسبتاً قابل‌قبول.",
    "medium-medium": "وضعیت متعادل، بدون مزیت برجسته.",
    "good-medium": "سودآوری قوی، ولی تبدیل سود به نقد نیازمند بهبود است.",
    "weak-good": "شرکت نقدساز ولی کم‌حاشیه یا کم‌بازده.",
    "medium-good": "کیفیت نقد مناسب با سودآوری متوسط.",
    "good-good": "سودآوری باکیفیت، پایدار و مطلوب.",
  },
  growthReturn: {
    "weak-weak": "رکود و بازده پایین؛ نیازمند بازنگری راهبردی.",
    "medium-weak": "رشد محدود با بازده ناکافی.",
    "good-weak": "رشد سرمایه‌بر یا مخرب ارزش.",
    "weak-medium": "رشد پایین، ولی بازده در سطح قابل‌قبول.",
    "medium-medium": "وضعیت متعادل و تثبیت‌شده.",
    "good-medium": "رشد مناسب، ولی بازده سرمایه هنوز به سطح مطلوب نرسیده است.",
    "weak-good": "شرکت کارا و پربازده، ولی کم‌رشد؛ مناسب برداشت نقد یا حفظ بهره‌وری.",
    "medium-good": "بازده مناسب با رشد کنترل‌شده.",
    "good-good": "رشد ارزش‌آفرین و مناسب توسعه.",
  },
  performanceResilience: {
    "weak-weak": "شرکت ضعیف و پرریسک؛ بالاترین اولویت مداخله.",
    "medium-weak": "عملکرد پایین با ریسک مالی متوسط.",
    "good-weak": "ترازنامه نسبتاً سالم، ولی عملیات کم‌بازده.",
    "weak-medium": "عملکرد قابل‌قبول ولی ساختار مالی آسیب‌پذیر.",
    "medium-medium": "وضعیت مالی متعادل.",
    "good-medium": "شرکت باثبات با عملکرد متوسط.",
    "weak-good": "شرکت پربازده ولی شکننده و دارای ریسک مالی.",
    "medium-good": "عملکرد خوب با ریسک کنترل‌پذیر.",
    "good-good": "شرکت قوی، پایدار و ممتاز.",
  },
  operationsWc: {
    "weak-weak": "عملیات ضعیف و منابع قفل‌شده.",
    "medium-weak": "سودآوری پایین با چرخه نقد متوسط.",
    "good-weak": "چرخه نقد مناسب، ولی حاشیه سود ناکافی.",
    "weak-medium": "عملکرد متوسط همراه با فشار سرمایه در گردش.",
    "medium-medium": "وضعیت عملیاتی متعادل.",
    "good-medium": "مدیریت مناسب سرمایه در گردش با سودآوری متوسط.",
    "weak-good": "شرکت سودآور، اما منابع در موجودی یا مطالبات قفل شده‌اند.",
    "medium-good": "سودآوری مناسب با چرخه نقد قابل‌قبول.",
    "good-good": "عملیات سودآور، منضبط و نقدشونده.",
  },
};

export function getRegionDescription(
  definition: ChartDefinition,
  x: number,
  y: number,
  settings: ModelSettings,
): { title: string; interpretation: string } {
  const xBand = classifyScore(x, settings) as Band;
  const yBand = classifyScore(y, settings) as Band;
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
  const xAxis = bundle.axes[definition.xKey];
  const yAxis = bundle.axes[definition.yKey];
  if (xAxis.score === null || yAxis.score === null) return null;
  const bubble = getBubbleRecord(model, bundle.company, bundle.year, bubbleMetric);
  const spread = getRecord(model, bundle.company, bundle.year, VARIABLES.spread);
  const region = getRegionDescription(definition, xAxis.score, yAxis.score, settings);
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
    : last.x < 4 || last.y < 4
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
    bundle.axes.profitability,
    bundle.axes.cashQuality,
    bundle.axes.growth,
    bundle.axes.capitalReturn,
    bundle.axes.resilience,
    bundle.axes.workingCapital,
  ].filter((axis): axis is AxisResult & { score: number } => axis.score !== null);
  const sorted = [...primary].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3);
  const weaknesses = [...sorted].reverse().slice(0, 3);
  const warnings: string[] = [];
  const actions: string[] = [];
  const a = bundle.axes;
  if ((a.profitability.score ?? 0) >= 7 && (a.cashQuality.score ?? 10) < 4) {
    warnings.push("سودآوری مطلوب است، اما کیفیت تبدیل سود به نقد ضعیف است.");
    actions.push("برنامه عملیاتی برای بهبود تبدیل سود به نقد و کنترل اقلام تعهدی تدوین شود.");
  }
  if ((a.growth.score ?? 0) >= 7 && (a.capitalReturn.score ?? 10) < 4) {
    warnings.push("رشد بالا با بازده سرمایه پایین همراه شده و احتمال رشد مخرب ارزش وجود دارد.");
    actions.push("سرمایه‌گذاری‌های توسعه‌ای از نظر ROIC و هزینه سرمایه بازبینی شوند.");
  }
  if ((a.financialPerformance.score ?? 0) >= 7 && (a.resilience.score ?? 10) < 4) {
    warnings.push("عملکرد مناسب با تاب‌آوری مالی ضعیف همراه است.");
    actions.push("ساختار بدهی، سررسیدها و پوشش هزینه مالی اصلاح شود.");
  }
  if ((a.operatingProfitability.score ?? 0) >= 7 && (a.workingCapital.score ?? 10) < 4) {
    warnings.push("عملیات سودآور است، اما منابع در سرمایه در گردش قفل شده‌اند.");
    actions.push("وصول مطالبات و سطح موجودی با برنامه زمانی مشخص بهبود یابد.");
  }
  for (const axis of Object.values(a)) {
    if (axis.score === null) warnings.push(`برای محور «${axis.label}» داده کافی وجود ندارد.`);
  }
  if ((a.workingCapital.score ?? 10) < 4) {
    actions.push("چرخه تبدیل نقد با تمرکز بر مطالبات، موجودی و شرایط پرداخت کوتاه شود.");
  }
  if ((a.resilience.score ?? 10) < 4) {
    actions.push("کاهش اهرم و تقویت پوشش بهره در اولویت تأمین مالی قرار گیرد.");
  }
  if ((a.profitability.score ?? 10) < 4) {
    actions.push("محرک‌های حاشیه سود، ترکیب فروش و بهای تمام‌شده بازطراحی شوند.");
  }
  if ((a.capitalReturn.score ?? 10) < 4) {
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
  return (
    settings.lowBoundary > 0 &&
    settings.lowBoundary < settings.highBoundary &&
    settings.highBoundary < 10 &&
    settings.minimumCoverage >= 0.5 &&
    settings.minimumCoverage <= 1 &&
    groups.every(
      (group) =>
        Math.abs(Object.values(group).reduce((a: number, b: number) => a + b, 0) - 1) <
        0.001,
    )
  );
}

export const VARIABLE_NAMES = VARIABLES;
