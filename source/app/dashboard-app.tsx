"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  CircleGauge,
  ClipboardCheck,
  Database,
  Download,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  Filter,
  Home,
  ImageDown,
  Info,
  Layers3,
  LoaderCircle,
  Menu,
  PanelTop,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import ScatterChart from "@/components/scatter-chart";
import DynamicRankingPage from "@/components/dynamic-ranking";
import {
  DimensionContributionChart,
  MiniSparkline,
  RankingBars,
  ScoreGauge,
  ScoreTrendChart,
  ScoreTrendMatrix,
  WaterfallChart,
} from "@/components/performance-charts";
import {
  CHART_DEFINITIONS,
  DEFAULT_SETTINGS,
  REQUIRED_COLUMNS,
  SCATTER_BOUNDARIES,
  bandLabel,
  buildAxisMatrix,
  buildChartPoint,
  chartNarrative,
  formatCompact,
  formatNumber,
  managementInsights,
  normalizeText,
  settingsAreValid,
  trendDescription,
  type AxisBundle,
  type AxisKey,
  type AxisResult,
  type Band,
  type BubbleMetric,
  type ChartDefinition,
  type ChartPoint,
  type DataIssue,
  type DisplayMode,
  type FinancialModel,
  type FinancialRecord,
  type ModelSettings,
} from "@/lib/financial-engine";
import {
  PERFORMANCE_DIMENSION_KEYS,
  buildPerformanceMatrix,
  distributionForYear,
  performanceRows,
  type PerformanceDimensionKey,
  type PerformanceMatrix,
  type PerformanceResult,
} from "@/lib/performance-engine";
import { parseFinancialWorkbook } from "@/lib/workbook-parser";

type AppTab = "home" | "analysis" | "performance" | "data" | "quality" | "settings" | "outputs";
type HoldingSelection = "atieh" | "metil";
type HoldingModels = Record<HoldingSelection, FinancialModel | null>;
type HoldingFlags = Record<HoldingSelection, boolean>;
type HoldingErrors = Record<HoldingSelection, string>;

const HOLDING_KEYS: HoldingSelection[] = ["atieh", "metil"];

const HOLDING_LABELS: Record<HoldingSelection, string> = {
  atieh: "آتیه فولاد نقش جهان",
  metil: "فولاد متیل",
};

const HOLDING_SHORT_LABELS: Record<HoldingSelection, string> = {
  atieh: "آتیه فولاد",
  metil: "فولاد متیل",
};

const PERFORMANCE_AXIS_KEYS: AxisKey[] = [
  "profitability",
  "cashQuality",
  "capitalReturn",
  "growth",
  "resilience",
  "workingCapital",
];

const BUBBLE_OPTIONS: { value: BubbleMetric; label: string }[] = [
  { value: "none", label: "اندازه ثابت" },
  { value: "revenue", label: "درآمد عملیاتی" },
  { value: "assets", label: "جمع دارایی‌ها" },
  { value: "investedCapital", label: "سرمایه‌گذاری انجام‌شده" },
];

const DISPLAY_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "trend", label: "مسیر سه‌ساله شرکت" },
  { value: "portfolio", label: "مقایسه کل پرتفوی" },
  { value: "peers", label: "شرکت‌های هم‌ماهیت" },
];

const ISSUE_LABELS: Record<DataIssue["type"], string> = {
  "missing-column": "ستون مفقود",
  "invalid-year": "سال نامعتبر",
  "missing-company": "نام شرکت مفقود",
  "missing-variable": "متغیر مفقود",
  "missing-score": "نمره خالی",
  "invalid-score": "نمره غیرعددی",
  "out-of-range": "نمره خارج از دامنه",
  duplicate: "رکورد تکراری",
  "missing-required-variable": "شاخص تحلیلی مفقود",
  "incomplete-year": "سال ناقص",
  "nature-conflict": "اختلاف ماهیت",
  "nature-imputed": "ماهیت تکمیل‌شده",
  "invalid-score-scale": "دامنه محدود نمره",
};

const BAND_COLORS: Record<Band, string> = {
  weak: "red",
  medium: "amber",
  good: "green",
};

type DataView = "profile" | "trend" | "compare" | "export";

const DATA_CATEGORIES = [
  "همه",
  "درآمد و سود",
  "جریان نقد",
  "ترازنامه و نقدینگی",
  "سرمایه در گردش",
  "بازده و ارزش‌آفرینی",
  "رشد و بهره‌وری",
  "سایر",
] as const;

type DataCategory = (typeof DATA_CATEGORIES)[number];

function dataCategory(variable: string): Exclude<DataCategory, "همه"> {
  const value = variable.toLowerCase();
  if (/roic|roce|wacc|eva|اسپرد|ارزش.?آفرینی|بازده سرمایه|بازده حقوق/.test(value)) return "بازده و ارزش‌آفرینی";
  if (/dso|dio|dpo|ccc|وصول|نگهداری موجودی|پرداخت بدهی|سرمایه در گردش/.test(value)) return "سرمایه در گردش";
  if (/جریان نقد|fcf|ocf|cfo|کیفیت سود/.test(value)) return "جریان نقد";
  if (/رشد|cagr|بهره.?وری|گردش دارایی|گردش موجودی|گردش مطالبات/.test(value)) return "رشد و بهره‌وری";
  if (/دارایی|بدهی|حقوق صاحبان|موجودی نقد|موجودی مواد|دریافتنی|پرداختنی|نقدینگی|نسبت جاری|نسبت آنی|اهرم/.test(value)) return "ترازنامه و نقدینگی";
  if (/درآمد|فروش|بهای تمام|سود|زیان|حاشیه|ebit|ebitda/.test(value)) return "درآمد و سود";
  return "سایر";
}

function recordValue(record: FinancialRecord | undefined) {
  return record?.value ?? null;
}

function getRecord(model: FinancialModel, company: string, year: number, normalizedVariable: string) {
  return model.index.get(company)?.get(year)?.get(normalizedVariable);
}

function latestChange(model: FinancialModel, company: string, normalizedVariable: string, latestYear: number) {
  const years = model.years.filter((year) => year <= latestYear).sort((a, b) => b - a);
  const current = recordValue(getRecord(model, company, years[0], normalizedVariable));
  const previous = recordValue(getRecord(model, company, years[1], normalizedVariable));
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

function scoreBandClass(score: number | null) {
  if (score === null) return "empty";
  if (score >= 7) return "good";
  if (score >= 4) return "medium";
  return "weak";
}

function loadStoredSettings(): ModelSettings {
  if (typeof window === "undefined") return structuredClone(DEFAULT_SETTINGS);
  try {
    const stored = window.localStorage.getItem("ips-financial-model-settings-v4");
    if (stored) {
      const parsed = JSON.parse(stored) as ModelSettings;
      const merged: ModelSettings = {
        ...structuredClone(DEFAULT_SETTINGS),
        ...parsed,
        weights: {
          ...structuredClone(DEFAULT_SETTINGS.weights),
          ...parsed.weights,
        },
        performance: {
          ...structuredClone(DEFAULT_SETTINGS.performance),
          ...(parsed.performance ?? {}),
          dimensionWeights: {
            ...DEFAULT_SETTINGS.performance.dimensionWeights,
            ...(parsed.performance?.dimensionWeights ?? {}),
          },
          dimensionWeightsByNature: {
            production: {
              ...DEFAULT_SETTINGS.performance.dimensionWeightsByNature.production,
              ...(parsed.performance?.dimensionWeightsByNature?.production ?? {}),
            },
            trade: {
              ...DEFAULT_SETTINGS.performance.dimensionWeightsByNature.trade,
              ...(parsed.performance?.dimensionWeightsByNature?.trade ?? {}),
            },
            service: {
              ...DEFAULT_SETTINGS.performance.dimensionWeightsByNature.service,
              ...(parsed.performance?.dimensionWeightsByNature?.service ?? {}),
            },
            financial: {
              ...DEFAULT_SETTINGS.performance.dimensionWeightsByNature.financial,
              ...(parsed.performance?.dimensionWeightsByNature?.financial ?? {}),
            },
          },
          historyWeights: {
            ...DEFAULT_SETTINGS.performance.historyWeights,
            ...(parsed.performance?.historyWeights ?? {}),
          },
          twoYearWeights: {
            ...DEFAULT_SETTINGS.performance.twoYearWeights,
            ...(parsed.performance?.twoYearWeights ?? {}),
          },
        },
      };
      if (settingsAreValid(merged)) return merged;
    }
  } catch {
    // Corrupted device-local preferences are ignored.
  }
  return structuredClone(DEFAULT_SETTINGS);
}

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

function percent(value: number) {
  return new Intl.NumberFormat("fa-IR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function safeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, "-").trim();
}

async function parseExcelFile(file: File): Promise<FinancialModel> {
  const data = await file.arrayBuffer();
  return parseFinancialWorkbook(data, file.name);
}

async function downloadTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([
    [...REQUIRED_COLUMNS],
    [
      "تولیدی",
      "نام شرکت",
      1404,
      "حاشیه سود عملیاتی",
      501,
      "درصد",
      0.18,
      7.5,
      "مطلوب",
    ],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "دیتا");
  XLSX.writeFile(workbook, "قالب-ورودی-داشبورد-مالی.xlsx");
}

function FileDrop({
  onFile,
  busy,
  compact = false,
}: {
  onFile: (file: File) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`file-drop ${dragging ? "dragging" : ""} ${compact ? "compact" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.currentTarget.value = "";
        }}
      />
      {busy ? (
        <LoaderCircle className="spin" size={compact ? 18 : 30} />
      ) : (
        <Upload size={compact ? 18 : 30} />
      )}
      {!compact && (
        <>
          <strong>{busy ? "در حال خواندن و اعتبارسنجی…" : "فایل Excel را اینجا رها کنید"}</strong>
          <span>فرمت‌های XLSX، XLS و CSV · پردازش امن در مرورگر</span>
        </>
      )}
      <button
        className={compact ? "text-button" : "primary-button"}
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {compact ? "جایگزینی فایل" : "انتخاب فایل از رایانه"}
      </button>
    </div>
  );
}

function QualityStat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "good" | "warning" | "danger";
}) {
  return (
    <div className={`quality-stat ${tone}`}>
      <span className="quality-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function DatabaseUploadCard({
  holding,
  model,
  busy,
  error,
  duplicateConfirmed,
  onDuplicateConfirmed,
  onFile,
  onClear,
}: {
  holding: HoldingSelection;
  model: FinancialModel | null;
  busy: boolean;
  error: string;
  duplicateConfirmed: boolean;
  onDuplicateConfirmed: (value: boolean) => void;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <article className={`database-upload-card ${model ? "ready" : ""}`}>
      <header>
        <span className="database-card-icon">
          <Building2 size={20} />
        </span>
        <div>
          <strong>{HOLDING_LABELS[holding]}</strong>
          <small>
            {holding === "atieh"
              ? "دیتابیس شرکت‌های اصلی پرتفوی آتیه"
              : "دیتابیس شرکت‌های سرویس‌سنتر گروه متیل"}
          </small>
        </div>
        <b className={model ? "ready" : "waiting"}>
          {model ? <Check size={13} /> : <Database size={13} />}
          {model ? "آماده" : "در انتظار فایل"}
        </b>
      </header>

      {!model ? (
        <FileDrop onFile={onFile} busy={busy} />
      ) : (
        <div className="database-file-ready">
          <div className="file-ready-header">
            <span className="file-icon">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <strong>{model.fileName}</strong>
              <span>
                {model.summary.totalRecords.toLocaleString("fa-IR")} رکورد ·{" "}
                {model.summary.companies.toLocaleString("fa-IR")} شرکت
              </span>
            </div>
            <button type="button" className="icon-button" onClick={onClear} aria-label={`حذف فایل ${HOLDING_LABELS[holding]}`}>
              <X size={16} />
            </button>
          </div>

          <div className="database-mini-stats">
            <span><Building2 size={15} /><b>{model.summary.companies.toLocaleString("fa-IR")}</b> شرکت</span>
            <span><FileCheck2 size={15} /><b>{percent(model.summary.rankingScoreCompleteness)}</b> پوشش ۱۳ شاخص رتبه</span>
            <span><AlertTriangle size={15} /><b>{model.summary.warnings.toLocaleString("fa-IR")}</b> هشدار</span>
          </div>

          {model.missingColumns.length > 0 ? (
            <div className="validation-callout danger">
              <AlertTriangle size={17} />
              <div>
                <strong>ساختار فایل کامل نیست</strong>
                <span>ستون‌های مفقود: {model.missingColumns.join("، ")}</span>
              </div>
            </div>
          ) : (
            <div className="validation-callout success compact">
              <Check size={17} />
              <div>
                <strong>ساختار فایل تأیید شد</strong>
                <span>دیتابیس برای تحلیل و سوییچ داخل داشبورد آماده است.</span>
              </div>
            </div>
          )}

          {model.duplicateCount > 0 && (
            <label className="duplicate-confirm">
              <input
                type="checkbox"
                checked={duplicateConfirmed}
                onChange={(event) => onDuplicateConfirmed(event.target.checked)}
              />
              آخرین رکورد از هر گروه تکراری برای محاسبه استفاده شود.
            </label>
          )}

          <FileDrop onFile={onFile} busy={busy} compact />
        </div>
      )}
      {error && <div className="inline-error"><AlertTriangle size={15} />{error}</div>}
    </article>
  );
}

function UploadScreen({
  models,
  busy,
  errors,
  duplicateConfirmed,
  onDuplicateConfirmed,
  onFile,
  onEnter,
  onClear,
}: {
  models: HoldingModels;
  busy: HoldingFlags;
  errors: HoldingErrors;
  duplicateConfirmed: HoldingFlags;
  onDuplicateConfirmed: (holding: HoldingSelection, value: boolean) => void;
  onFile: (holding: HoldingSelection, file: File) => void;
  onEnter: () => void;
  onClear: (holding: HoldingSelection) => void;
}) {
  const blocking = HOLDING_KEYS.some((key) => {
    const model = models[key];
    return !model || model.missingColumns.length > 0 || (model.duplicateCount > 0 && !duplicateConfirmed[key]);
  });
  const readyCount = HOLDING_KEYS.filter((key) => models[key]).length;
  return (
    <main className="upload-page">
      <header className="upload-header">
        <div className="brand-lockup">
          <span className="brand-mark">
            <BarChart3 size={22} />
          </span>
          <div>
            <strong>IPS Finance</strong>
            <span>هوش مالی پرتفوی</span>
          </div>
        </div>
        <button type="button" className="outline-button" onClick={downloadTemplate}>
          <FileDown size={17} />
          دانلود قالب استاندارد
        </button>
      </header>

      <section className="upload-hero">
        <div className="hero-copy">
          <span className="product-badge">
            <Sparkles size={15} />
            تحلیل چندبعدی عملکرد شرکت‌های زیرمجموعه
          </span>
          <h1>
            از فایل مالی خام،
            <br />
            <em>تصویر مدیریتی قابل اقدام</em> بسازید.
          </h1>
          <p>
            هر دو دیتابیس آتیه فولاد و فولاد متیل را هم‌زمان بارگذاری کنید؛ سپس بدون
            خروج از داشبورد، تحلیل هر هلدینگ را با یک تب مستقل ببینید.
          </p>
          <div className="hero-proof">
            <span>
              <BarChart3 size={18} /> دیدبان مالی
            </span>
            <span>
              <CircleGauge size={18} /> رتبه‌نمای عملکرد
            </span>
            <span>
              <Database size={18} /> مرکز داده
            </span>
          </div>
        </div>
        <div className="upload-panel dual-upload-panel">
          <div className="dual-upload-heading">
            <span>ورودی هم‌زمان</span>
            <div>
              <strong>دو دیتابیس مستقل را بارگذاری کنید</strong>
              <small>هر فایل جداگانه کنترل می‌شود و بعد از ورود، هر دو در حافظه مرورگر باقی می‌مانند.</small>
            </div>
            <b>{readyCount.toLocaleString("fa-IR")} از ۲ آماده</b>
          </div>

          <div className="database-upload-grid">
            {HOLDING_KEYS.map((key) => (
              <DatabaseUploadCard
                key={key}
                holding={key}
                model={models[key]}
                busy={busy[key]}
                error={errors[key]}
                duplicateConfirmed={duplicateConfirmed[key]}
                onDuplicateConfirmed={(value) => onDuplicateConfirmed(key, value)}
                onFile={(file) => onFile(key, file)}
                onClear={() => onClear(key)}
              />
            ))}
          </div>

          <div className="dual-upload-action">
            <div>
              <ShieldCheck size={18} />
              <span>فایل‌ها فقط در مرورگر پردازش می‌شوند و به سرور ارسال نمی‌شوند.</span>
            </div>
            <button type="button" className="primary-button" disabled={blocking} onClick={onEnter}>
              ورود به داشبورد
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="upload-steps">
        {[
          ["۰۱", "بارگذاری", "فایل اصلی بدون تغییر باقی می‌ماند."],
          ["۰۲", "کنترل کیفیت", "خطاها، کسری‌ها و تکرارها شناسایی می‌شوند."],
          ["۰۳", "تحلیل و امتیاز", "ماتریس‌های مالی و مدل شش‌بُعدی عملکرد محاسبه می‌شوند."],
          ["۰۴", "داده و مقایسه", "عدد خام، روند و مقایسه شرکت‌ها قابل مشاهده و دریافت است."],
        ].map(([number, title, copy]) => (
          <article key={number}>
            <span>{number}</span>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function ScoreCard({
  axis,
  previous,
  onOpen,
}: {
  axis: AxisResult;
  previous: number | null;
  onOpen: () => void;
}) {
  const delta = axis.score === null || previous === null ? null : axis.score - previous;
  const band = axis.band;
  return (
    <button type="button" className={`score-card ${band ?? "empty"}`} onClick={onOpen}>
      <div className="score-card-top">
        <span>{axis.label}</span>
        <span className={`status-pill ${band ? BAND_COLORS[band] : "gray"}`}>
          {bandLabel(band)}
        </span>
      </div>
      <div className="score-card-main">
        <strong>{formatNumber(axis.score, 2)}</strong>
        <span>از ۱۰</span>
      </div>
      <div className="score-card-foot">
        {delta === null ? (
          <span className="delta neutral">بدون مبنای مقایسه</span>
        ) : Math.abs(delta) < 0.05 ? (
          <span className="delta neutral">بدون تغییر معنادار</span>
        ) : delta > 0 ? (
          <span className="delta up">
            <TrendingUp size={15} /> {formatNumber(Math.abs(delta), 2)} بهبود
          </span>
        ) : (
          <span className="delta down">
            <TrendingDown size={15} /> {formatNumber(Math.abs(delta), 2)} افت
          </span>
        )}
        <span className="coverage">پوشش {percent(axis.coverage)}</span>
      </div>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  wide = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`select-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <ChevronDown size={15} />
      </div>
    </label>
  );
}

function CalculationDetails({
  axes,
  openAxis,
  onClose,
}: {
  axes: Record<AxisKey, AxisResult>;
  openAxis: AxisKey | null;
  onClose: () => void;
}) {
  if (!openAxis) return null;
  const axis = axes[openAxis];
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="calculation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`جزئیات محاسبه ${axis.label}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">حسابرسی امتیاز</p>
            <h3>{axis.label}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="بستن">
            <X size={18} />
          </button>
        </header>
        <div className="formula-box">
          <span>فرمول فعال</span>
          <strong>{axis.formula}</strong>
        </div>
        <div className="drawer-score">
          <div>
            <span>امتیاز نهایی</span>
            <strong>{formatNumber(axis.score, 2)}</strong>
          </div>
          <div>
            <span>پوشش داده</span>
            <strong>{percent(axis.coverage)}</strong>
          </div>
          <div>
            <span>طبقه</span>
            <strong>{bandLabel(axis.band)}</strong>
          </div>
        </div>
        <div className="component-list">
          {axis.components.map((component) => (
            <article key={component.key}>
              <div className="component-title">
                <div>
                  <strong>{component.label}</strong>
                  <span>{component.variable}</span>
                </div>
                <b>{formatNumber(component.score, 2)}</b>
              </div>
              <div className="component-math">
                <span>وزن اصلی {percent(component.originalWeight)}</span>
                <span>وزن تعدیل‌شده {percent(component.adjustedWeight)}</span>
                <span>سهم در نتیجه {formatNumber(component.contribution, 2)}</span>
              </div>
              {component.method && <p>{component.method}</p>}
            </article>
          ))}
        </div>
        {axis.warnings.length > 0 && (
          <div className="drawer-warnings">
            {axis.warnings.map((warning) => (
              <p key={warning}>
                <AlertTriangle size={15} />
                {warning}
              </p>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function buildPointsForDefinition({
  model,
  matrix,
  definition,
  selectedCompany,
  selectedYear,
  displayMode,
  natureFilter,
  bubbleMetric,
  settings,
}: {
  model: FinancialModel;
  matrix: Map<string, Map<number, AxisBundle>>;
  definition: ChartDefinition;
  selectedCompany: string;
  selectedYear: number;
  displayMode: DisplayMode;
  natureFilter: string;
  bubbleMetric: BubbleMetric;
  settings: ModelSettings;
}) {
  if (displayMode === "trend") {
    return [...(matrix.get(selectedCompany)?.values() ?? [])]
      .filter((bundle) => bundle.year <= selectedYear)
      .sort((a, b) => a.year - b.year)
      .map((bundle) =>
        buildChartPoint(model, bundle, definition, selectedCompany, bubbleMetric, settings),
      )
      .filter((point): point is ChartPoint => point !== null)
      .slice(-3);
  }
  const selectedNature = model.natureByCompany.get(selectedCompany) ?? "";
  return model.companies
    .filter((company) => {
      const nature = model.natureByCompany.get(company) ?? "";
      if (displayMode === "peers" && nature !== selectedNature) return false;
      return natureFilter === "همه" || nature === natureFilter;
    })
    .map((company) => matrix.get(company)?.get(selectedYear))
    .filter((bundle): bundle is AxisBundle => Boolean(bundle))
    .map((bundle) =>
      buildChartPoint(model, bundle, definition, selectedCompany, bubbleMetric, settings),
    )
    .filter((point): point is ChartPoint => point !== null);
}

function SummaryAnalysis({
  bundle,
  chartPoints,
}: {
  bundle: AxisBundle;
  chartPoints: Map<string, ChartPoint[]>;
}) {
  const insights = managementInsights(bundle);
  return (
    <section className="analysis-grid">
      <article className="analysis-card wide">
        <header>
          <div>
            <p className="eyebrow">جمع‌بندی مدیریتی</p>
            <h3>تصویر مالی {bundle.company}</h3>
          </div>
          <span className="analysis-year">{bundle.year}</span>
        </header>
        <div className="insight-columns">
          <div>
            <span className="insight-label good">نقاط قوت</span>
            {insights.strengths.map((axis) => (
              <p key={axis.key}>
                <Check size={16} /> {axis.label} با امتیاز {formatNumber(axis.score, 2)}
              </p>
            ))}
          </div>
          <div>
            <span className="insight-label danger">نقاط قابل بهبود</span>
            {insights.weaknesses.map((axis) => (
              <p key={axis.key}>
                <Target size={16} /> {axis.label} با امتیاز {formatNumber(axis.score, 2)}
              </p>
            ))}
          </div>
          <div>
            <span className="insight-label warning">هشدارها</span>
            {(insights.warnings.length ? insights.warnings : ["هشدار قاعده‌محور بااهمیتی شناسایی نشد."]).map(
              (warning) => (
                <p key={warning}>
                  <AlertTriangle size={16} /> {warning}
                </p>
              ),
            )}
          </div>
        </div>
      </article>
      <article className="analysis-card action-card">
        <header>
          <div>
            <p className="eyebrow">اولویت اقدام</p>
            <h3>پیشنهادهای مدیریتی</h3>
          </div>
        </header>
        <ol>
          {(insights.actions.length
            ? insights.actions
            : ["حفظ انضباط مالی و پایش ماهانه شاخص‌های دارای روند نزولی."]
          ).map((action, index) => (
            <li key={action}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              {action}
            </li>
          ))}
        </ol>
      </article>
      <article className="analysis-card trend-card">
        <header>
          <div>
            <p className="eyebrow">روند سه‌ساله</p>
            <h3>جهت حرکت</h3>
          </div>
        </header>
        <div className="trend-list">
          {CHART_DEFINITIONS.map((definition) => {
            const points = chartPoints.get(definition.key) ?? [];
            const first = points[0];
            const last = points[points.length - 1];
            const improved =
              first && last ? last.x + last.y - first.x - first.y : 0;
            return (
              <div key={definition.key}>
                <span className={`trend-icon ${improved >= 0 ? "up" : "down"}`}>
                  {improved >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                </span>
                <div>
                  <strong>{definition.title}</strong>
                  <span>{trendDescription(points)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function AnalyticalTable({
  chartPoints,
}: {
  chartPoints: Map<string, ChartPoint[]>;
}) {
  return (
    <section className="table-card">
      <header>
        <div>
          <p className="eyebrow">خلاصه چهار منظر</p>
          <h3>جدول تحلیلی شرکت</h3>
        </div>
        <Table2 size={20} />
      </header>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>نمودار</th>
              <th>محور افقی</th>
              <th>محور عمودی</th>
              <th>ناحیه فعلی</th>
              <th>روند سه‌ساله</th>
              <th>تفسیر</th>
            </tr>
          </thead>
          <tbody>
            {CHART_DEFINITIONS.map((definition) => {
              const points = chartPoints.get(definition.key) ?? [];
              const current = points[points.length - 1];
              return (
                <tr key={definition.key}>
                  <td>
                    <strong>{definition.title}</strong>
                  </td>
                  <td>{current ? formatNumber(current.x, 2) : "—"}</td>
                  <td>{current ? formatNumber(current.y, 2) : "—"}</td>
                  <td>{current?.regionTitle ?? "داده ناکافی"}</td>
                  <td>{trendDescription(points)}</td>
                  <td>{current?.interpretation ?? "امکان تفسیر وجود ندارد."}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompanyDashboard({
  model,
  matrix,
  settings,
  selectedCompany,
  setSelectedCompany,
  selectedYear,
  setSelectedYear,
  natureFilter,
  setNatureFilter,
  displayMode,
  setDisplayMode,
  bubbleMetric,
  setBubbleMetric,
  showAverage,
  setShowAverage,
  showLabels,
  setShowLabels,
  highlightSelected,
  setHighlightSelected,
  reportRef,
}: {
  model: FinancialModel;
  matrix: Map<string, Map<number, AxisBundle>>;
  settings: ModelSettings;
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  natureFilter: string;
  setNatureFilter: (nature: string) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  bubbleMetric: BubbleMetric;
  setBubbleMetric: (metric: BubbleMetric) => void;
  showAverage: boolean;
  setShowAverage: (value: boolean) => void;
  showLabels: boolean;
  setShowLabels: (value: boolean) => void;
  highlightSelected: boolean;
  setHighlightSelected: (value: boolean) => void;
  reportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const bundle = matrix.get(selectedCompany)?.get(selectedYear);
  const chartPoints = useMemo(() => {
    const entries = CHART_DEFINITIONS.map((definition) => [
      definition.key,
      buildPointsForDefinition({
        model,
        matrix,
        definition,
        selectedCompany,
        selectedYear,
        displayMode,
        natureFilter,
        bubbleMetric,
        settings,
      }),
    ] as const);
    return new Map(entries);
  }, [
    model,
    matrix,
    settings,
    selectedCompany,
    selectedYear,
    displayMode,
    natureFilter,
    bubbleMetric,
  ]);
  const trendOnlyPoints = useMemo(() => {
    const entries = CHART_DEFINITIONS.map((definition) => [
      definition.key,
      buildPointsForDefinition({
        model,
        matrix,
        definition,
        selectedCompany,
        selectedYear,
        displayMode: "trend",
        natureFilter,
        bubbleMetric,
        settings,
      }),
    ] as const);
    return new Map(entries);
  }, [model, matrix, settings, selectedCompany, selectedYear, natureFilter, bubbleMetric]);

  if (!bundle) {
    return (
      <div className="empty-state">
        <AlertTriangle size={28} />
        داده قابل محاسبه‌ای برای شرکت و سال انتخاب‌شده وجود ندارد.
      </div>
    );
  }

  return (
    <div ref={reportRef} className="dashboard-report">
      <section className="page-title-row">
        <div>
          <p className="eyebrow">ماژول اول · دیدبان مالی</p>
          <h2>تحلیل چندبعدی وضعیت و مسیر مالی شرکت‌ها</h2>
          <span>چهار ماتریس اسکاتر با منطق محاسباتی تثبیت‌شده، مسیر سه‌ساله و تفسیر ۹ ناحیه‌ای.</span>
        </div>
      </section>
      <section className="filter-card no-print">
        <div className="filter-title">
          <Filter size={18} />
          <div>
            <strong>فیلتر تحلیل</strong>
            <span>انتخاب‌ها بلافاصله روی محاسبات و نمودارها اعمال می‌شوند.</span>
          </div>
        </div>
        <div className="filter-grid">
          <SelectField label="شرکت" value={selectedCompany} onChange={setSelectedCompany} wide>
            {model.companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </SelectField>
          <SelectField label="سال مرجع" value={selectedYear} onChange={(value) => setSelectedYear(Number(value))}>
            {[...model.years].reverse().map((year) => (
              <option key={year} value={year}>
                {year.toLocaleString("fa-IR", { useGrouping: false })}
              </option>
            ))}
          </SelectField>
          <SelectField label="حالت نمایش" value={displayMode} onChange={(value) => setDisplayMode(value as DisplayMode)}>
            {DISPLAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="ماهیت" value={natureFilter} onChange={setNatureFilter}>
            <option value="همه">همه ماهیت‌ها</option>
            {model.natures.map((nature) => (
              <option key={nature} value={nature}>
                {nature}
              </option>
            ))}
          </SelectField>
          <SelectField label="اندازه حباب" value={bubbleMetric} onChange={(value) => setBubbleMetric(value as BubbleMetric)}>
            {BUBBLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <div className="toggle-group">
            <label>
              <input
                type="checkbox"
                checked={showAverage}
                onChange={(event) => setShowAverage(event.target.checked)}
              />
              <span>میانگین پرتفوی</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(event) => setShowLabels(event.target.checked)}
              />
              <span>برچسب شرکت‌ها</span>
            </label>
            <label className={`highlight-toggle ${displayMode === "trend" ? "disabled" : ""}`}>
              <input
                type="checkbox"
                checked={highlightSelected}
                disabled={displayMode === "trend"}
                onChange={(event) => setHighlightSelected(event.target.checked)}
              />
              <span>برجسته‌سازی شرکت منتخب</span>
            </label>
          </div>
        </div>
        <div className="scatter-method-note">
          <Info size={16} />
          مرزهای ثابت اسکاتر: ضعیف کمتر از ۳٫۳۳، متوسط از ۳٫۳۳ تا ۶٫۶۶ و مطلوب از ۶٫۶۶ به بالا. وزن شاخص مفقود بازتوزیع نمی‌شود.
        </div>
      </section>

      <section className="report-heading print-only">
        <div>
          <p>گزارش تحلیل عملکرد مالی</p>
          <h1>{selectedCompany}</h1>
        </div>
        <span>سال {selectedYear}</span>
      </section>

      <section className="charts-grid">
        {CHART_DEFINITIONS.map((definition) => {
          const points = chartPoints.get(definition.key) ?? [];
          return (
            <ScatterChart
              key={definition.key}
              definition={definition}
              points={points}
              showAverage={showAverage && displayMode !== "trend"}
              showLabels={showLabels}
              showTrend={displayMode === "trend"}
              highlightSelected={highlightSelected}
              narrative={chartNarrative(displayMode === "trend" ? points : trendOnlyPoints.get(definition.key) ?? [])}
            />
          );
        })}
      </section>

      <SummaryAnalysis bundle={bundle} chartPoints={trendOnlyPoints} />
      <AnalyticalTable chartPoints={trendOnlyPoints} />
    </div>
  );
}

// Retained for backward-compatible exports and legacy model audit screens.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PerformancePage({
  model,
  performanceMatrix,
  selectedCompany,
  setSelectedCompany,
  selectedYear,
  setSelectedYear,
}: {
  model: FinancialModel;
  performanceMatrix: PerformanceMatrix;
  selectedCompany: string;
  setSelectedCompany: (value: string) => void;
  selectedYear: number;
  setSelectedYear: (value: number) => void;
}) {
  const [nature, setNature] = useState("همه");
  const [query, setQuery] = useState("");
  const [openDimension, setOpenDimension] = useState<PerformanceDimensionKey | null>(null);
  const result = performanceMatrix.get(selectedCompany)?.get(selectedYear) ?? null;
  const ranking = performanceRows(performanceMatrix, selectedYear, nature).filter((item) =>
    item.company.includes(query.trim()),
  );
  const companyHistory = [...(performanceMatrix.get(selectedCompany)?.values() ?? [])]
    .filter((item) => item.year <= selectedYear)
    .sort((a, b) => a.year - b.year);
  const scoreDistribution = useMemo(
    () => distributionForYear(performanceMatrix, selectedYear),
    [performanceMatrix, selectedYear],
  );

  if (!result) {
    return (
      <div className="empty-state">
        <AlertTriangle size={28} />
        برای شرکت و سال انتخاب‌شده امتیاز قابل نمایش وجود ندارد.
      </div>
    );
  }

  const previousResult = performanceMatrix.get(selectedCompany)?.get(selectedYear - 1);
  const scoreDelta =
    result.finalScore !== null && previousResult?.finalScore !== null && previousResult?.finalScore !== undefined
      ? result.finalScore - previousResult.finalScore
      : null;
  const openResult = openDimension ? result.dimensions[openDimension] : null;

  return (
    <div className="performance-page performance-v2">
      <section className="page-title-row">
        <div>
          <p className="eyebrow">ماژول دوم · رتبه‌نمای عملکرد</p>
          <h2>امتیازدهی، رتبه‌بندی و ارزیابی عملکرد مالی</h2>
          <span>مدل شش‌بُعدی، تعدیلات ارزش‌آفرینی و روند، جریمه‌های ریسک و رتبه نسبی.</span>
        </div>
      </section>

      <section className="filter-card compact">
        <div className="filter-grid">
          <SelectField label="شرکت" value={selectedCompany} onChange={setSelectedCompany} wide>
            {model.companies.map((company) => <option key={company} value={company}>{company}</option>)}
          </SelectField>
          <SelectField label="سال" value={selectedYear} onChange={(value) => setSelectedYear(Number(value))}>
            {[...model.years].reverse().map((year) => (
              <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</option>
            ))}
          </SelectField>
          <SelectField label="ماهیت رتبه‌بندی" value={nature} onChange={setNature}>
            <option value="همه">همه ماهیت‌ها</option>
            {model.natures.map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <label className="search-field">
            <span>جست‌وجو در رتبه‌بندی</span>
            <div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام شرکت" /></div>
          </label>
        </div>
      </section>

      <section className={`performance-hero-v2 ${result.classification ?? "unreliable"}`}>
        <div className="performance-hero-copy">
          <div className="hero-company-line">
            <div>
              <span>{result.nature || "ماهیت نامشخص"}</span>
              <h3>{result.company}</h3>
              <p>سال {result.year.toLocaleString("fa-IR", { useGrouping: false })}</p>
            </div>
            <span className={`performance-class ${result.classification ?? "unreliable"}`}>
              {result.classificationLabel}
            </span>
          </div>
          <p className="performance-narrative">{result.narrative}</p>
          <div className="hero-risk-strip">
            <span><ShieldCheck size={16} />اطمینان {result.confidenceLabel}</span>
            <span><AlertTriangle size={16} />{result.penalties.length.toLocaleString("fa-IR")} هشدار ریسک</span>
            <span className={scoreDelta === null ? "neutral" : scoreDelta >= 0 ? "up" : "down"}>
              {scoreDelta === null ? "بدون مبنای سال قبل" : `${formatNumber(Math.abs(scoreDelta), 2)} ${scoreDelta >= 0 ? "بهبود" : "افت"}`}
            </span>
          </div>
        </div>
        <ScoreGauge score={result.finalScore} />
        <div className="performance-hero-metrics">
          <div><span>امتیاز مطلق</span><strong>{formatNumber(result.absoluteScore, 2)}</strong></div>
          <div><span>امتیاز نسبی</span><strong>{formatNumber(result.relativeScore, 2)}</strong><small>{result.comparisonGroup}</small></div>
          <div><span>پایه کالیبره‌شده</span><strong>{formatNumber(result.calibratedBaseScore, 2)}</strong><small>۷۵٪ مطلق + ۲۵٪ نسبی</small></div>
          <div><span>امتیاز سه‌ساله</span><strong>{formatNumber(result.weightedHistoryScore, 2)}</strong><small>{result.historyLabel}</small></div>
          <div><span>رتبه کل پرتفوی</span><strong>{result.ranking.overallRank?.toLocaleString("fa-IR") ?? "—"}</strong><small>از {result.ranking.totalCompanies.toLocaleString("fa-IR")}</small></div>
          <div><span>رتبه هم‌ماهیت</span><strong>{result.ranking.peerRank?.toLocaleString("fa-IR") ?? "—"}</strong><small>از {result.ranking.peerCompanies.toLocaleString("fa-IR")}</small></div>
          <div><span>پوشش مدل</span><strong>{percent(result.baseCoverage)}</strong><small>{result.confidenceLabel}</small></div>
          <div><span>صدک عملکرد</span><strong>{result.ranking.percentile === null ? "—" : `${formatNumber(result.ranking.percentile, 0)}٪`}</strong></div>
          <div><span>نسخه مدل</span><strong className="model-version-value">{result.modelVersion}</strong><small>ثبت‌شده در گزارش خروجی</small></div>
        </div>
      </section>

      {result.warnings.some((warning) => warning.includes("نیازمند کالیبراسیون")) && (
        <div className="validation-callout danger">
          <AlertTriangle size={18} />
          <div>
            <strong>مدل نیازمند کالیبراسیون</strong>
            <span>{result.warnings.find((warning) => warning.includes("نیازمند کالیبراسیون"))}</span>
          </div>
        </div>
      )}

      <section className="performance-score-grid-v2">
        {PERFORMANCE_DIMENSION_KEYS.map((key) => {
          const dimension = result.dimensions[key];
          const history = companyHistory
            .map((item) => item.dimensions[key].score)
            .filter((score): score is number => score !== null);
          return (
            <button
              type="button"
              key={key}
              className={`dimension-card ${scoreBandClass(dimension.score)}`}
              onClick={() => setOpenDimension(key)}
            >
              <div className="dimension-card-heading">
                <div>
                  <span>{dimension.label}</span>
                  <small>وزن مدل {Math.round(dimension.modelWeight * 100).toLocaleString("fa-IR")}٪</small>
                </div>
                <strong>{formatNumber(dimension.score, 2)}</strong>
              </div>
              <div className="dimension-card-body">
                <MiniSparkline values={history} />
                <dl>
                  <div><dt>سهم پایه</dt><dd>{formatNumber(dimension.baseContribution, 2)}</dd></div>
                  <div><dt>تغییر سالانه</dt><dd className={dimension.yearOverYearChange === null ? "" : dimension.yearOverYearChange >= 0 ? "up" : "down"}>{dimension.yearOverYearChange === null ? "—" : formatNumber(dimension.yearOverYearChange, 2)}</dd></div>
                  <div><dt>رتبه بُعدی</dt><dd>{dimension.portfolioRank?.toLocaleString("fa-IR") ?? "—"}</dd></div>
                </dl>
              </div>
              <span className="dimension-more">مشاهده فرمول و مؤلفه‌ها</span>
            </button>
          );
        })}
      </section>

      <section className="performance-chart-grid">
        <article className="performance-chart-card wide">
          <header><div><p className="eyebrow">ردیابی ساخت امتیاز</p><h3>آبشار امتیاز پایه تا امتیاز نهایی</h3></div><Info size={18} /></header>
          <WaterfallChart result={result} />
        </article>
        <article className="performance-chart-card">
          <header><div><p className="eyebrow">سهم ابعاد</p><h3>سهم هر بُعد در امتیاز پایه</h3></div></header>
          <DimensionContributionChart result={result} />
        </article>
        <article className="performance-chart-card">
          <header><div><p className="eyebrow">روند امتیاز</p><h3>امتیاز پایه و نهایی در طول زمان</h3></div></header>
          <ScoreTrendChart results={companyHistory} />
        </article>
        <article className="performance-chart-card">
          <header><div><p className="eyebrow">مقایسه پرتفوی</p><h3>ده شرکت نخست رتبه‌بندی</h3></div></header>
          <RankingBars rows={ranking} selectedCompany={selectedCompany} />
        </article>
        <article className="performance-chart-card wide">
          <header><div><p className="eyebrow">ماتریس امتیاز و روند</p><h3>جایگاه شرکت‌ها بر اساس امتیاز نهایی و شیب سه‌ساله</h3></div></header>
          <ScoreTrendMatrix rows={ranking} selectedCompany={selectedCompany} />
        </article>
      </section>

      <section className="table-card score-distribution-card">
        <header><div><p className="eyebrow">کنترل کالیبراسیون</p><h3>توزیع امتیاز نهایی پرتفوی</h3></div><span className="table-note-inline">این کنترل امتیازها را تغییر نمی‌دهد.</span></header>
        <div className="distribution-summary"><span>میانگین <b>{formatNumber(scoreDistribution.mean, 2)}</b></span><span>میانه <b>{formatNumber(scoreDistribution.median, 2)}</b></span><span>انحراف معیار <b>{formatNumber(scoreDistribution.standardDeviation, 2)}</b></span><span>حداقل <b>{formatNumber(scoreDistribution.minimum, 2)}</b></span><span>حداکثر <b>{formatNumber(scoreDistribution.maximum, 2)}</b></span></div>
        <div className="score-histogram">
          {([
            ["ممتاز", scoreDistribution.classes.excellent],
            ["مطلوب", scoreDistribution.classes.desirable],
            ["متوسط", scoreDistribution.classes.average],
            ["ضعیف", scoreDistribution.classes.weak],
            ["بحرانی", scoreDistribution.classes.critical],
          ] as const).map(([label, count]) => (
            <div key={label}>
              <span>{label}</span>
              <i style={{ width: `${scoreDistribution.count ? Math.max(8, count / scoreDistribution.count * 100) : 0}%` }} />
              <b>{count.toLocaleString("fa-IR")}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="risk-audit-grid">
        <article className="audit-card">
          <header><div><p className="eyebrow">تعدیلات</p><h3>ارزش‌آفرینی و روند</h3></div></header>
          <div className="audit-lines">
            <div><span>تعدیل ROIC−WACC</span><strong className={result.valueCreationAdjustment >= 0 ? "up" : "down"}>{result.valueCreationAdjustment >= 0 ? "+" : ""}{formatNumber(result.valueCreationAdjustment, 2)}</strong><small>{result.valueCreationEvidence}</small></div>
            <div><span>تعدیل روند</span><strong className={result.trendAdjustment >= 0 ? "up" : "down"}>{result.trendAdjustment >= 0 ? "+" : ""}{formatNumber(result.trendAdjustment, 2)}</strong><small>{result.trendLabel}</small></div>
          </div>
        </article>
        <article className="audit-card">
          <header><div><p className="eyebrow">جریمه‌های ریسک</p><h3>{formatNumber(result.totalPenalty, 2)} امتیاز کسر شده</h3></div></header>
          <div className="risk-list">
            {result.penalties.length ? result.penalties.map((penalty) => (
              <div key={penalty.key} className={penalty.severity}>
                <AlertTriangle size={16} />
                <div><strong>{penalty.label}</strong><span>{penalty.evidence}</span></div>
                <b>−{formatNumber(penalty.value, 2)}</b>
              </div>
            )) : <div className="risk-empty"><ShieldCheck size={18} />جریمه ریسک فعالی ثبت نشده است.</div>}
          </div>
        </article>
      </section>

      <section className="table-card performance-table-card">
        <header>
          <div><p className="eyebrow">رتبه‌بندی پرتفوی</p><h3>رتبه مطلق و نسبی شرکت‌ها در سال {selectedYear.toLocaleString("fa-IR", { useGrouping: false })}</h3></div>
          <span className="table-count">{ranking.length.toLocaleString("fa-IR")} شرکت</span>
        </header>
        <div className="table-scroll performance-matrix">
          <table>
            <thead><tr><th>رتبه</th><th>شرکت</th><th>ماهیت</th><th>نهایی</th><th>مطلق</th><th>نسبی</th><th>پایه کالیبره</th><th>سه‌ساله</th>{PERFORMANCE_DIMENSION_KEYS.map((key) => <th key={key}>{result.dimensions[key].label}</th>)}<th>طبقه</th><th>پوشش</th><th>تغییر رتبه</th></tr></thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={item.company} className={item.company === selectedCompany ? "selected-row" : ""} onClick={() => setSelectedCompany(item.company)}>
                  <td>{item.ranking.overallRank?.toLocaleString("fa-IR") ?? "—"}</td>
                  <td><button type="button" className="company-link">{item.company}</button></td>
                  <td>{item.nature || "—"}</td>
                  <td><strong>{formatNumber(item.finalScore, 2)}</strong></td>
                  <td>{formatNumber(item.absoluteScore, 2)}</td>
                  <td>{formatNumber(item.relativeScore, 2)}</td>
                  <td>{formatNumber(item.calibratedBaseScore, 2)}</td>
                  <td>{formatNumber(item.weightedHistoryScore, 2)}</td>
                  {PERFORMANCE_DIMENSION_KEYS.map((key) => <td key={key}><span className={`score-cell ${scoreBandClass(item.dimensions[key].score)}`}>{formatNumber(item.dimensions[key].score, 1)}</span></td>)}
                  <td><span className={`performance-class mini ${item.classification ?? "unreliable"}`}>{item.classificationLabel}</span></td>
                  <td>{percent(item.baseCoverage)}</td>
                  <td>{item.ranking.rankChange === null ? "—" : `${item.ranking.rankChange > 0 ? "+" : ""}${item.ranking.rankChange.toLocaleString("fa-IR")}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {openResult && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={() => setOpenDimension(null)}>
          <aside className="calculation-drawer performance-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>جزئیات قابل حسابرسی</span><h3>{openResult.label}</h3></div>
              <button type="button" className="icon-button" onClick={() => setOpenDimension(null)} aria-label="بستن"><X size={18} /></button>
            </header>
            <div className="drawer-score">
              <div><span>امتیاز مطلق بُعد</span><strong>{formatNumber(openResult.absoluteScore, 2)}</strong></div>
              <div><span>امتیاز نسبی بُعد</span><strong>{formatNumber(openResult.relativeScore, 2)}</strong></div>
              <div><span>امتیاز کالیبره بُعد</span><strong>{formatNumber(openResult.calibratedScore, 2)}</strong></div>
              <div><span>پوشش شاخص‌ها</span><strong>{percent(openResult.coverage)}</strong></div>
              <div><span>سهم در پایه</span><strong>{formatNumber(openResult.baseContribution, 2)}</strong></div>
            </div>
            <div className="formula-box"><span>فرمول فعال</span><p>{openResult.formula}</p></div>
            <div className="component-list">
              {openResult.components.map((component) => (
                <article key={component.key}>
                  <div><strong>{component.label}</strong><span>{component.method ?? component.variable}</span></div>
                  <div className="component-values">
                    <span>مقدار <b>{formatNumber(component.value, 2)} {component.unit}</b></span>
                    <span>مطلق <b>{formatNumber(component.absoluteScore ?? null, 2)}</b></span>
                    <span>نسبی <b>{formatNumber(component.relativeScore ?? null, 2)}</b></span>
                    <span>تعدیل‌شده <b>{formatNumber(component.adjustedScore ?? component.score, 2)}</b></span>
                    <span>وزن مؤثر <b>{percent(component.adjustedWeight)}</b></span>
                    <span>سهم <b>{formatNumber(component.contribution, 2)}</b></span>
                  </div>
                </article>
              ))}
            </div>
            {!!openResult.warnings.length && <div className="drawer-warnings">{openResult.warnings.map((warning) => <p key={warning}><AlertTriangle size={15} />{warning}</p>)}</div>}
          </aside>
        </div>
      )}
    </div>
  );
}

function TrendChart({
  years,
  series,
  unit,
}: {
  years: number[];
  series: { name: string; color: string; values: (number | null)[] }[];
  unit: string;
}) {
  const width = 760;
  const height = 270;
  const padding = { top: 28, right: 28, bottom: 42, left: 76 };
  const values = series.flatMap((item) => item.values.filter((value): value is number => value !== null));
  if (!values.length) return <div className="trend-chart-empty"><BarChart3 size={24} />برای این شاخص مقدار عددی قابل ترسیم وجود ندارد.</div>;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { const spread = Math.abs(min || 1) * 0.1; min -= spread; max += spread; }
  const range = max - min;
  const x = (index: number) => padding.left + (years.length <= 1 ? (width - padding.left - padding.right) / 2 : (index / (years.length - 1)) * (width - padding.left - padding.right));
  const y = (value: number) => padding.top + ((max - value) / range) * (height - padding.top - padding.bottom);
  const ticks = Array.from({ length: 5 }, (_, index) => max - (range * index) / 4);
  return (
    <div className="data-trend-chart">
      <div className="trend-legend">{series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}{unit && <b>{unit}</b>}</div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="نمودار روند شاخص">
        {ticks.map((tick) => <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} className="trend-grid-line" /><text x={padding.left - 10} y={y(tick) + 4} className="trend-y-label">{formatNumber(tick, 1)}</text></g>)}
        {years.map((year, index) => <text key={year} x={x(index)} y={height - 14} className="trend-x-label">{year.toLocaleString("fa-IR", { useGrouping: false })}</text>)}
        {series.map((item) => {
          const points = item.values.map((value, index) => value === null ? null : `${x(index)},${y(value)}`).filter((point): point is string => point !== null);
          return <g key={item.name}>{points.length > 1 && <polyline points={points.join(" ")} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}{item.values.map((value, index) => value === null ? null : <circle key={`${item.name}-${years[index]}`} cx={x(index)} cy={y(value)} r="5" fill="#fff" stroke={item.color} strokeWidth="3"><title>{item.name} · {years[index]} · {formatNumber(value, 2)} {unit}</title></circle>)}</g>;
        })}
      </svg>
    </div>
  );
}

async function writeDataWorkbook(rows: Record<string, string | number | null>[], sheetName: string, fileName: string) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

function recordToExportRow(record: FinancialRecord) {
  return { شرکت: record.company, ماهیت: record.nature, سال: record.year, دسته: dataCategory(record.variable), متغیر: record.variable, "کد متغیر": record.code, واحد: record.unit, مقدار: record.value, "تبدیل به شاخص": record.indexedValue, نمره: record.score };
}

function LegacyDataCenterPage({
  model,
  selectedCompany,
  setSelectedCompany,
  selectedYear,
  setSelectedYear,
}: {
  model: FinancialModel;
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}) {
  const [view, setView] = useState<"profile" | "compare" | "raw">("profile");
  const [category, setCategory] = useState<DataCategory>("همه");
  const [query, setQuery] = useState("");
  const [selectedVariable, setSelectedVariable] = useState(model.validRecords[0]?.normalizedVariable ?? "");
  const [compareCompany, setCompareCompany] = useState(model.companies.find((company) => company !== selectedCompany) ?? selectedCompany);
  const comparisonCompany = compareCompany === selectedCompany
    ? model.companies.find((company) => company !== selectedCompany) ?? selectedCompany
    : compareCompany;
  const [rawCompany, setRawCompany] = useState("همه");
  const [rawYear, setRawYear] = useState("همه");
  const [scoreFilter, setScoreFilter] = useState("همه");
  const normalizedQuery = query.trim().toLowerCase();

  const variableMap = new Map<string, FinancialRecord>();
  model.validRecords.filter((record) => record.company === selectedCompany).forEach((record) => { if (!variableMap.has(record.normalizedVariable)) variableMap.set(record.normalizedVariable, record); });
  const profileVariables = [...variableMap.values()].filter((record) => (category === "همه" || dataCategory(record.variable) === category) && (!normalizedQuery || record.variable.toLowerCase().includes(normalizedQuery) || record.code.toLowerCase().includes(normalizedQuery))).sort((a, b) => a.variable.localeCompare(b.variable, "fa"));
  const activeProfileRecord = variableMap.get(selectedVariable) ?? profileVariables[0] ?? variableMap.values().next().value;
  const activeVariable = activeProfileRecord?.normalizedVariable ?? "";
  const profileTrend = model.years.map((year) => recordValue(getRecord(model, selectedCompany, year, activeVariable)));
  const companyRecords = model.validRecords.filter((record) => record.company === selectedCompany);
  const companyScoreCoverage = companyRecords.length ? companyRecords.filter((record) => record.score !== null).length / companyRecords.length : 0;

  const compareVariableMap = new Map<string, FinancialRecord>();
  model.validRecords.filter((record) => (record.company === selectedCompany || record.company === comparisonCompany) && record.year === selectedYear).forEach((record) => { if (!compareVariableMap.has(record.normalizedVariable)) compareVariableMap.set(record.normalizedVariable, record); });
  const compareVariables = [...compareVariableMap.values()].filter((record) => (category === "همه" || dataCategory(record.variable) === category) && (!normalizedQuery || record.variable.toLowerCase().includes(normalizedQuery) || record.code.toLowerCase().includes(normalizedQuery))).sort((a, b) => a.variable.localeCompare(b.variable, "fa"));
  const activeCompareRecord = compareVariableMap.get(selectedVariable) ?? compareVariables[0] ?? compareVariableMap.values().next().value;
  const activeCompareVariable = activeCompareRecord?.normalizedVariable ?? "";
  const comparisonSeries = [
    { name: selectedCompany, color: "#1d4ed8", values: model.years.map((year) => recordValue(getRecord(model, selectedCompany, year, activeCompareVariable))) },
    { name: comparisonCompany, color: "#0f9f6e", values: model.years.map((year) => recordValue(getRecord(model, comparisonCompany, year, activeCompareVariable))) },
  ];
  const rawRecords = model.records.filter((record) =>
    (rawCompany === "همه" || record.company === rawCompany) &&
    (rawYear === "همه" || record.year === Number(rawYear)) &&
    (category === "همه" || dataCategory(record.variable) === category) &&
    (scoreFilter === "همه" || (scoreFilter === "دارای نمره" && record.score !== null) || (scoreFilter === "بدون نمره" && record.score === null)) &&
    (!normalizedQuery || record.company.toLowerCase().includes(normalizedQuery) || record.variable.toLowerCase().includes(normalizedQuery) || record.code.toLowerCase().includes(normalizedQuery))
  ).sort((a, b) => a.company.localeCompare(b.company, "fa") || b.year - a.year || a.variable.localeCompare(b.variable, "fa"));

  async function exportCurrentView() {
    if (view === "raw") return writeDataWorkbook(rawRecords.map(recordToExportRow), "داده خام", "مرکز-داده-خام.xlsx");
    if (view === "compare") {
      const rows = compareVariables.map((record) => {
        const first = getRecord(model, selectedCompany, selectedYear, record.normalizedVariable);
        const second = getRecord(model, comparisonCompany, selectedYear, record.normalizedVariable);
        const firstValue = recordValue(first), secondValue = recordValue(second);
        return { دسته: dataCategory(record.variable), متغیر: record.variable, واحد: first?.unit ?? second?.unit ?? "", [`${selectedCompany} - مقدار`]: firstValue, [`${selectedCompany} - نمره`]: first?.score ?? null, [`${comparisonCompany} - مقدار`]: secondValue, [`${comparisonCompany} - نمره`]: second?.score ?? null, اختلاف: firstValue !== null && secondValue !== null ? firstValue - secondValue : null };
      });
      return writeDataWorkbook(rows, "مقایسه شرکت‌ها", `مقایسه-${safeFileName(selectedCompany)}-${safeFileName(comparisonCompany)}.xlsx`);
    }
    const rows = profileVariables.flatMap((record) => model.years.map((year) => { const item = getRecord(model, selectedCompany, year, record.normalizedVariable); return { شرکت: selectedCompany, دسته: dataCategory(record.variable), متغیر: record.variable, سال: year, واحد: item?.unit ?? record.unit, مقدار: item?.value ?? null, نمره: item?.score ?? null }; }));
    return writeDataWorkbook(rows, "پروفایل شرکت", `پروفایل-داده-${safeFileName(selectedCompany)}.xlsx`);
  }

  return (
    <div className="data-center-page">
      <section className="page-title-row"><div><p className="eyebrow">ماژول سوم · مرکز داده</p><h2>مشاهده، مقایسه و دریافت داده‌های مالی</h2><span>مقدار خام، واحد، نمره و روند سالانه بدون جایگزینی مقادیر خالی با صفر.</span></div><button type="button" className="primary-button" onClick={exportCurrentView}><FileSpreadsheet size={17} />خروجی Excel نمای جاری</button></section>
      <section className="data-view-tabs no-print" aria-label="نماهای مرکز داده">{[
        { key: "profile" as const, label: "پروفایل شرکت", icon: <Building2 size={18} /> },
        { key: "compare" as const, label: "مقایسه دو شرکت", icon: <Layers3 size={18} /> },
        { key: "raw" as const, label: "جدول داده خام", icon: <Table2 size={18} /> },
      ].map((item) => <button key={item.key} type="button" className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>{item.icon}{item.label}</button>)}</section>
      <section className="filter-card compact data-filter-card no-print"><div className="filter-grid">
        {view !== "raw" ? <><SelectField label="شرکت مبنا" value={selectedCompany} onChange={setSelectedCompany} wide>{model.companies.map((company) => <option key={company} value={company}>{company}</option>)}</SelectField>{view === "compare" && <><SelectField label="شرکت مقایسه" value={comparisonCompany} onChange={setCompareCompany} wide>{model.companies.map((company) => <option key={company} value={company} disabled={company === selectedCompany}>{company}</option>)}</SelectField><SelectField label="سال مقایسه" value={selectedYear} onChange={(value) => setSelectedYear(Number(value))}>{[...model.years].reverse().map((year) => <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</option>)}</SelectField></>}</> : <><SelectField label="شرکت" value={rawCompany} onChange={setRawCompany} wide><option value="همه">همه شرکت‌ها</option>{model.companies.map((company) => <option key={company} value={company}>{company}</option>)}</SelectField><SelectField label="سال" value={rawYear} onChange={setRawYear}><option value="همه">همه سال‌ها</option>{[...model.years].reverse().map((year) => <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</option>)}</SelectField><SelectField label="وضعیت نمره" value={scoreFilter} onChange={setScoreFilter}><option value="همه">همه رکوردها</option><option value="دارای نمره">دارای نمره</option><option value="بدون نمره">بدون نمره</option></SelectField></>}
        <SelectField label="گروه شاخص" value={category} onChange={(value) => setCategory(value as DataCategory)}>{DATA_CATEGORIES.map((item) => <option key={item} value={item}>{item === "همه" ? "همه گروه‌ها" : item}</option>)}</SelectField>
        <label className="search-field wide"><span>جست‌وجوی شاخص یا کد</span><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً حاشیه سود، ROIC یا ۵۰۱" /></div></label>
      </div></section>
      {view === "profile" && <><section className="quality-overview data-overview">
        <QualityStat icon={<Database size={18} />} label="تعداد شاخص‌ها" value={variableMap.size.toLocaleString("fa-IR")} /><QualityStat icon={<PanelTop size={18} />} label="پوشش سالانه" value={`${new Set(companyRecords.map((record) => record.year)).size.toLocaleString("fa-IR")} سال`} /><QualityStat icon={<FileCheck2 size={18} />} label="پوشش نمره" value={percent(companyScoreCoverage)} tone={companyScoreCoverage >= 0.45 ? "good" : "warning"} /><QualityStat icon={<Building2 size={18} />} label="ماهیت شرکت" value={model.natureByCompany.get(selectedCompany) ?? "نامشخص"} />
      </section><section className="data-visual-grid"><article className="data-chart-card"><header><div><p className="eyebrow">روند چندساله</p><h3>{activeProfileRecord?.variable ?? "شاخصی انتخاب نشده است"}</h3></div><SelectField label="شاخص نمودار" value={activeVariable} onChange={setSelectedVariable} wide>{profileVariables.map((record) => <option key={record.normalizedVariable} value={record.normalizedVariable}>{record.variable}</option>)}</SelectField></header><TrendChart years={model.years} series={[{ name: selectedCompany, color: "#1d4ed8", values: profileTrend }]} unit={activeProfileRecord?.unit ?? ""} /></article>
        <article className="data-reading-card"><p className="eyebrow">خوانش سریع</p><h3>{activeProfileRecord?.variable ?? "—"}</h3><div><span>آخرین مقدار</span><strong>{formatNumber(recordValue(getRecord(model, selectedCompany, model.years.at(-1) ?? 0, activeVariable)), 2)}</strong><small>{activeProfileRecord?.unit}</small></div><div><span>تغییر نسبت به سال قبل</span><strong>{latestChange(model, selectedCompany, activeVariable, model.years.at(-1) ?? 0) === null ? "—" : percent(latestChange(model, selectedCompany, activeVariable, model.years.at(-1) ?? 0) ?? 0)}</strong></div><div><span>نمره آخرین سال</span><strong>{formatNumber(getRecord(model, selectedCompany, model.years.at(-1) ?? 0, activeVariable)?.score ?? null, 2)}</strong><small>از ۱۰</small></div></article>
      </section><section className="table-card data-matrix-card"><header><div><p className="eyebrow">صورت داده شرکت</p><h3>{profileVariables.length.toLocaleString("fa-IR")} شاخص قابل نمایش</h3></div><span className="table-note-inline">مقدار اصلی در سطر اول؛ نمره در برچسب کوچک</span></header><div className="table-scroll"><table><thead><tr><th>گروه</th><th>شاخص</th><th>واحد</th>{model.years.map((year) => <th key={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</th>)}<th>تغییر آخر</th></tr></thead><tbody>
        {profileVariables.map((record) => { const change = latestChange(model, selectedCompany, record.normalizedVariable, model.years.at(-1) ?? 0); return <tr key={record.normalizedVariable} className={record.normalizedVariable === activeVariable ? "selected-row" : ""} onClick={() => setSelectedVariable(record.normalizedVariable)}><td><span className="category-pill">{dataCategory(record.variable)}</span></td><td><button type="button" className="company-link">{record.variable}</button></td><td>{record.unit || "—"}</td>{model.years.map((year) => { const item = getRecord(model, selectedCompany, year, record.normalizedVariable); return <td key={year}><div className="value-score-cell"><strong>{formatNumber(item?.value ?? null, 2)}</strong>{item?.score !== null && item?.score !== undefined && <span>نمره {formatNumber(item.score, 1)}</span>}</div></td>; })}<td><span className={`change-pill ${change === null ? "neutral" : change >= 0 ? "up" : "down"}`}>{change === null ? "—" : percent(change)}</span></td></tr>; })}
      </tbody></table></div></section></>}
      {view === "compare" && <><section className="data-visual-grid"><article className="data-chart-card"><header><div><p className="eyebrow">روند مقایسه‌ای</p><h3>{activeCompareRecord?.variable ?? "شاخصی انتخاب نشده است"}</h3></div><SelectField label="شاخص نمودار" value={activeCompareVariable} onChange={setSelectedVariable} wide>{compareVariables.map((record) => <option key={record.normalizedVariable} value={record.normalizedVariable}>{record.variable}</option>)}</SelectField></header><TrendChart years={model.years} series={comparisonSeries} unit={activeCompareRecord?.unit ?? ""} /></article><article className="comparison-head">{[selectedCompany, comparisonCompany].map((company, index) => { const item = getRecord(model, company, selectedYear, activeCompareVariable); return <div key={company} className={index === 0 ? "primary" : "secondary"}><span>{company}</span><strong>{formatNumber(item?.value ?? null, 2)}</strong><small>{item?.unit ?? activeCompareRecord?.unit}</small><b>نمره {formatNumber(item?.score ?? null, 1)}</b></div>; })}</article></section>
        <section className="table-card data-matrix-card"><header><div><p className="eyebrow">مقایسه رو‌در‌رو</p><h3>{compareVariables.length.toLocaleString("fa-IR")} شاخص در سال {selectedYear.toLocaleString("fa-IR", { useGrouping: false })}</h3></div></header><div className="table-scroll"><table><thead><tr><th>گروه</th><th>شاخص</th><th>واحد</th><th>{selectedCompany}</th><th>نمره</th><th>{comparisonCompany}</th><th>نمره</th><th>اختلاف مقدار</th><th>اختلاف نمره</th></tr></thead><tbody>
          {compareVariables.map((record) => { const first = getRecord(model, selectedCompany, selectedYear, record.normalizedVariable), second = getRecord(model, comparisonCompany, selectedYear, record.normalizedVariable); const firstValue = recordValue(first), secondValue = recordValue(second); const difference = firstValue !== null && secondValue !== null ? firstValue - secondValue : null; const scoreDifference = first?.score !== null && first?.score !== undefined && second?.score !== null && second?.score !== undefined ? first.score - second.score : null; return <tr key={record.normalizedVariable} className={record.normalizedVariable === activeCompareVariable ? "selected-row" : ""} onClick={() => setSelectedVariable(record.normalizedVariable)}><td><span className="category-pill">{dataCategory(record.variable)}</span></td><td><button type="button" className="company-link">{record.variable}</button></td><td>{first?.unit ?? second?.unit ?? "—"}</td><td><strong>{formatNumber(firstValue, 2)}</strong></td><td><span className={`score-cell ${scoreBandClass(first?.score ?? null)}`}>{formatNumber(first?.score ?? null, 1)}</span></td><td><strong>{formatNumber(secondValue, 2)}</strong></td><td><span className={`score-cell ${scoreBandClass(second?.score ?? null)}`}>{formatNumber(second?.score ?? null, 1)}</span></td><td>{formatNumber(difference, 2)}</td><td><span className={`change-pill ${scoreDifference === null ? "neutral" : scoreDifference >= 0 ? "up" : "down"}`}>{scoreDifference === null ? "—" : formatNumber(scoreDifference, 2)}</span></td></tr>; })}
        </tbody></table></div></section></>}
      {view === "raw" && <section className="table-card raw-data-card"><header><div><p className="eyebrow">رکوردهای فایل ورودی</p><h3>{rawRecords.length.toLocaleString("fa-IR")} رکورد منطبق با فیلتر</h3></div>{rawRecords.length > 500 && <span className="table-note-inline">۵۰۰ ردیف نخست نمایش داده شده؛ Excel شامل همه رکوردهاست.</span>}</header><div className="table-scroll raw-data-table"><table><thead><tr><th>ردیف فایل</th><th>شرکت</th><th>ماهیت</th><th>سال</th><th>گروه</th><th>شاخص</th><th>کد</th><th>واحد</th><th>مقدار</th><th>تبدیل به شاخص</th><th>نمره</th><th>وضعیت</th></tr></thead><tbody>
        {rawRecords.slice(0, 500).map((record) => <tr key={`${record.sourceRow}-${record.company}-${record.variable}`}><td>{record.sourceRow.toLocaleString("fa-IR")}</td><td><strong>{record.company || "—"}</strong></td><td>{record.nature || "—"}</td><td>{record.year ? record.year.toLocaleString("fa-IR", { useGrouping: false }) : "—"}</td><td><span className="category-pill">{dataCategory(record.variable)}</span></td><td>{record.variable || "—"}</td><td>{record.code || "—"}</td><td>{record.unit || "—"}</td><td>{formatNumber(record.value, 2)}</td><td>{formatNumber(record.indexedValue, 2)}</td><td>{formatNumber(record.score, 2)}</td><td><span className={`record-status ${record.scoreIssue ? "warning" : "valid"}`}>{record.scoreIssue ? ISSUE_LABELS[record.scoreIssue === "out-of-range" ? "out-of-range" : record.scoreIssue === "invalid" ? "invalid-score" : "missing-score"] : "معتبر"}</span></td></tr>)}
      </tbody></table></div></section>}
    </div>
  );
}

void ScoreCard;
void CalculationDetails;
void LegacyDataCenterPage;
void PERFORMANCE_AXIS_KEYS;

const MAIN_KPIS = [
  "درآمدهای عملیاتی",
  "سود (زیان) عملیاتی",
  "سود (زیان) خالص (عملیات در حال تداوم)",
  "OCF جریان نقد عملیاتی",
  "جمع دارایی‌ها",
  "جمع حقوق مالکانه",
  "بازده سرمایه گذاری ROIC روش دارایی",
  "حاشیه سود عملیاتی",
] as const;

const SERIES_COLORS = ["#1d4ed8", "#0f766e", "#7c3aed", "#d97706", "#dc2626", "#0284c7", "#475569"];

function toggleLimited(values: string[], value: string, limit: number, minimum = 0) {
  if (values.includes(value)) {
    return values.length <= minimum ? values : values.filter((item) => item !== value);
  }
  return values.length >= limit ? values : [...values, value];
}

function yearChange(
  model: FinancialModel,
  company: string,
  year: number,
  variable: string,
): { absolute: number | null; percent: number | null } {
  const current = getRecord(model, company, year, variable)?.value ?? null;
  const previous = getRecord(model, company, year - 1, variable)?.value ?? null;
  if (current === null || previous === null) return { absolute: null, percent: null };
  return {
    absolute: current - previous,
    percent: previous === 0 ? null : (current - previous) / Math.abs(previous),
  };
}

function dataStatus(score: number | null) {
  if (score === null) return "بدون نمره";
  if (score >= 8) return "ممتاز";
  if (score >= 6.5) return "مطلوب";
  if (score >= 5) return "متوسط";
  if (score >= 3.5) return "ضعیف";
  return "بحرانی";
}

async function exportCustomDataWorkbook({
  model,
  companies,
  years,
  variables,
  includeValue,
  includeScore,
  includeChange,
  chartSelections,
}: {
  model: FinancialModel;
  companies: string[];
  years: number[];
  variables: string[];
  includeValue: boolean;
  includeScore: boolean;
  includeChange: boolean;
  chartSelections: string[];
}) {
  const selected = model.validRecords.filter(
    (record) =>
      companies.includes(record.company) &&
      years.includes(record.year) &&
      variables.includes(record.normalizedVariable),
  );
  const selectedRows = selected.map((record) => {
    const change = yearChange(model, record.company, record.year, record.normalizedVariable);
    return {
      ماهیت: record.nature,
      شرکت: record.company,
      سال: record.year,
      "گروه متغیر": dataCategory(record.variable),
      متغیر: record.variable,
      کد: record.code,
      واحد: record.unit,
      مقدار: includeValue ? record.value : null,
      "تبدیل به شاخص": includeValue ? record.indexedValue : null,
      نمره: includeScore ? record.score : null,
      تغییر: includeChange ? change.absolute : null,
      "درصد تغییر": includeChange ? change.percent : null,
    };
  });
  const variableRepresentatives = variables
    .map((variable) => model.validRecords.find((record) => record.normalizedVariable === variable))
    .filter((record): record is FinancialRecord => Boolean(record));
  const comparisonRows = variableRepresentatives.flatMap((variable) =>
    years.map((year) => {
      const row: Record<string, string | number | null> = {
        سال: year,
        متغیر: variable.variable,
        واحد: variable.unit,
      };
      for (const company of companies) {
        const record = getRecord(model, company, year, variable.normalizedVariable);
        if (includeValue) row[`${company} | مقدار`] = record?.value ?? null;
        if (includeScore) row[`${company} | نمره`] = record?.score ?? null;
        if (includeChange) {
          row[`${company} | درصد تغییر`] = yearChange(
            model,
            company,
            year,
            variable.normalizedVariable,
          ).percent;
        }
      }
      return row;
    }),
  );
  const trendRows = companies.flatMap((company) =>
    variableRepresentatives.flatMap((variable) =>
      years.map((year) => {
        const record = getRecord(model, company, year, variable.normalizedVariable);
        const change = yearChange(model, company, year, variable.normalizedVariable);
        return {
          شرکت: company,
          متغیر: variable.variable,
          واحد: record?.unit ?? variable.unit,
          سال: year,
          مقدار: includeValue ? record?.value ?? null : null,
          نمره: includeScore ? record?.score ?? null : null,
          "درصد تغییر": includeChange ? change.percent : null,
        };
      }),
    ),
  );
  const chartRows = chartSelections.flatMap((chart) => [
    { "عنوان نمودار": chart, "نوع داده پشتیبان": "جدول روند زمانی", توضیح: "داده‌های پشتیبان در شیت «روند زمانی» قرار دارد." },
    ...trendRows.map((row) => ({ "عنوان نمودار": chart, ...row })),
  ]);
  const metadata = [
    ["عنوان", "خروجی سفارشی سامانه هوشمند پایش و ارزیابی مالی شرکت‌ها"],
    ["فایل مبنا", model.fileName],
    ["تاریخ تولید", new Date().toISOString()],
    ["شرکت‌ها", companies.join("، ")],
    ["سال‌ها", years.join("، ")],
    ["تعداد متغیر", variables.length],
    ["نوع داده", [includeValue ? "مقدار" : "", includeScore ? "نمره" : "", includeChange ? "تغییر" : ""].filter(Boolean).join("، ")],
    ["نمودارهای منتخب", chartSelections.join("، ") || "بدون نمودار"],
    ["محدودیت", "به‌منظور حسابرسی، مشخصات نمودار و تمام داده‌های پشتیبان در فایل قرار گرفته است."],
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(selectedRows), "داده‌های منتخب");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(comparisonRows), "مقایسه شرکت‌ها");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trendRows), "روند زمانی");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(chartRows), "نمودارهای منتخب");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(metadata), "مشخصات خروجی");
  XLSX.writeFile(workbook, "خروجی-سفارشی-مرکز-داده-مالی.xlsx");
}

function DataCenterPage({
  model,
  initialView,
  selectedCompany,
  setSelectedCompany,
  selectedYear,
  setSelectedYear,
}: {
  model: FinancialModel;
  initialView: DataView;
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}) {
  const [view, setView] = useState<DataView>(initialView);
  const [category, setCategory] = useState<DataCategory>("همه");
  const [query, setQuery] = useState("");
  const [selectedVariable, setSelectedVariable] = useState(
    model.validRecords[0]?.normalizedVariable ?? "",
  );
  const [trendCompanies, setTrendCompanies] = useState([selectedCompany]);
  const [trendVariables, setTrendVariables] = useState<string[]>(
    model.validRecords[0]?.normalizedVariable ? [model.validRecords[0].normalizedVariable] : [],
  );
  const [trendDataType, setTrendDataType] = useState<"value" | "score" | "change">("value");
  const [compareCompanies, setCompareCompanies] = useState(
    model.companies.slice(0, Math.min(3, model.companies.length)),
  );
  const [compareMode, setCompareMode] = useState<"value" | "score" | "change">("value");
  const [exportCompanies, setExportCompanies] = useState([selectedCompany]);
  const [exportYears, setExportYears] = useState([selectedYear]);
  const [exportVariables, setExportVariables] = useState<string[]>(
    model.validRecords[0]?.normalizedVariable ? [model.validRecords[0].normalizedVariable] : [],
  );
  const [includeValue, setIncludeValue] = useState(true);
  const [includeScore, setIncludeScore] = useState(true);
  const [includeChange, setIncludeChange] = useState(true);
  const [chartSelections, setChartSelections] = useState<string[]>([]);


  const normalizedQuery = query.trim().toLowerCase();
  const variableMap = new Map<string, FinancialRecord>();
  for (const record of model.validRecords) {
    if (!variableMap.has(record.normalizedVariable)) variableMap.set(record.normalizedVariable, record);
  }
  const variables = [...variableMap.values()]
    .filter(
      (record) =>
        (category === "همه" || dataCategory(record.variable) === category) &&
        (!normalizedQuery ||
          record.variable.toLowerCase().includes(normalizedQuery) ||
          record.code.toLowerCase().includes(normalizedQuery)),
    )
    .sort((a, b) => a.variable.localeCompare(b.variable, "fa"));
  const activeRecord =
    variableMap.get(selectedVariable) ?? variables[0] ?? variableMap.values().next().value;
  const activeVariable = activeRecord?.normalizedVariable ?? "";
  const companyVariableMap = new Map<string, FinancialRecord>();
  for (const record of model.validRecords.filter((item) => item.company === selectedCompany)) {
    if (!companyVariableMap.has(record.normalizedVariable)) {
      companyVariableMap.set(record.normalizedVariable, record);
    }
  }
  const profileVariables = variables.filter((record) =>
    companyVariableMap.has(record.normalizedVariable),
  );
  const activeProfileRecord =
    companyVariableMap.get(selectedVariable) ?? profileVariables[0] ?? companyVariableMap.values().next().value;
  const activeProfileVariable = activeProfileRecord?.normalizedVariable ?? "";
  const activeProfileCurrent = activeProfileVariable
    ? getRecord(model, selectedCompany, selectedYear, activeProfileVariable)
    : undefined;
  const activeProfileChange = activeProfileVariable
    ? yearChange(model, selectedCompany, selectedYear, activeProfileVariable)
    : { absolute: null, percent: null };
  const activeProfileHistory = model.years.map((year) =>
    activeProfileVariable
      ? getRecord(model, selectedCompany, year, activeProfileVariable)?.value ?? null
      : null,
  );
  const activeProfileNumbers = activeProfileHistory.filter((value): value is number => value !== null);
  const activeProfileAverage = activeProfileNumbers.length
    ? activeProfileNumbers.reduce((sum, value) => sum + value, 0) / activeProfileNumbers.length
    : null;
  const companyRecords = model.validRecords.filter(
    (record) => record.company === selectedCompany,
  );
  const companyScoreCoverage = companyRecords.length
    ? companyRecords.filter((record) => record.score !== null).length / companyRecords.length
    : 0;
  const kpis = MAIN_KPIS.map((name) => {
    const normalized = normalizeText(name);
    const record = getRecord(model, selectedCompany, selectedYear, normalized);
    return { name, normalized, record };
  });

  const activeTrendVariables = trendVariables
    .map((variable) => variableMap.get(variable))
    .filter((record): record is FinancialRecord => Boolean(record));
  const mixedUnits =
    trendDataType === "value" &&
    new Set(activeTrendVariables.map((record) => record.unit)).size > 1;
  const trendSeries = trendCompanies.flatMap((company, companyIndex) =>
    activeTrendVariables.map((variable, variableIndex) => {
      const raw = model.years.map((year) => {
        const record = getRecord(model, company, year, variable.normalizedVariable);
        if (trendDataType === "score") return record?.score ?? null;
        if (trendDataType === "change") {
          return yearChange(model, company, year, variable.normalizedVariable).percent;
        }
        return record?.value ?? null;
      });
      const first = raw.find((value): value is number => value !== null && value !== 0) ?? null;
      const values =
        mixedUnits && first !== null
          ? raw.map((value) => (value === null ? null : (value / first) * 100))
          : raw;
      return {
        name:
          activeTrendVariables.length > 1
            ? `${company} · ${variable.variable}`
            : company,
        color: SERIES_COLORS[(companyIndex * activeTrendVariables.length + variableIndex) % SERIES_COLORS.length],
        values,
      };
    }),
  );
  const trendUnit = mixedUnits
    ? "شاخص پایه ۱۰۰"
    : trendDataType === "score"
      ? "امتیاز"
      : trendDataType === "change"
        ? "نسبت تغییر"
        : activeTrendVariables[0]?.unit ?? "";

  const comparisonSeries = compareCompanies.map((company, index) => ({
    name: company,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    values: model.years.map((year) => {
      const record = getRecord(model, company, year, activeVariable);
      if (compareMode === "score") return record?.score ?? null;
      if (compareMode === "change") return yearChange(model, company, year, activeVariable).percent;
      return record?.value ?? null;
    }),
  }));

  const selectedExportCount =
    exportCompanies.length * exportYears.length * Math.max(1, exportVariables.length);
  const selectedCharts = [
    "روند زمانی",
    "مقایسه شرکت‌ها",
    "Heatmap نمرات",
    "پروفایل KPI",
  ];

  const resetDataFilters = () => {
    setCategory("همه");
    setQuery("");
  };

  return (
    <div className="data-center-page data-center-v2">
      <section className="data-center-hero">
        <div className="data-center-title">
          <span className="data-center-icon"><Database size={24} /></span>
          <div>
            <p className="eyebrow">مرکز داده مالی</p>
            <h2>از عدد خام تا تصمیم مدیریتی، در یک میزکار</h2>
            <p>اطلاعات شرکت را بررسی کنید، روندها را بسنجید، شرکت‌ها را کنار هم بگذارید و خروجی حسابرسی‌پذیر بسازید.</p>
          </div>
        </div>
        <div className="data-context-summary">
          <span><Database size={15} />{model.summary.totalRecords.toLocaleString("fa-IR")} رکورد</span>
          <span><Building2 size={15} />{model.companies.length.toLocaleString("fa-IR")} شرکت</span>
          <span><PanelTop size={15} />{model.years.length.toLocaleString("fa-IR")} سال</span>
          <button type="button" className="primary-button" onClick={() => setView("export")}><FileSpreadsheet size={17} />خروجی جدید</button>
        </div>
      </section>

      <section className="data-workspace-tabs no-print" aria-label="کارهای مرکز داده">
        {[
          { key: "profile" as const, label: "بررسی شرکت", help: "تصویر کامل یک شرکت در یک سال", icon: <Building2 size={19} /> },
          { key: "trend" as const, label: "روند زمانی", help: "تغییر شاخص‌ها در چند سال", icon: <TrendingUp size={19} /> },
          { key: "compare" as const, label: "مقایسه", help: "مقایسه هم‌زمان چند شرکت", icon: <Layers3 size={19} /> },
          { key: "export" as const, label: "ساخت خروجی", help: "فایل Excel دقیق و سفارشی", icon: <FileSpreadsheet size={19} /> },
        ].map((item) => (
          <button key={item.key} type="button" className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>
            <span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.help}</small></div>
          </button>
        ))}
      </section>

      <section className="data-command-bar no-print">
        <header>
          <div><Filter size={17} /><strong>زمینه تحلیل</strong><span>انتخاب‌های این نوار روی نمای جاری اعمال می‌شوند.</span></div>
          {(category !== "همه" || query) && <button type="button" className="text-button" onClick={resetDataFilters}><RotateCcw size={14} />پاک‌کردن فیلترها</button>}
        </header>
        <div className="data-command-grid">
          {view !== "export" && (
            <>
              <SelectField label="شرکت" value={selectedCompany} onChange={setSelectedCompany} wide>
                {model.companies.map((company) => <option key={company} value={company}>{company}</option>)}
              </SelectField>
              <SelectField label="سال" value={selectedYear} onChange={(value) => setSelectedYear(Number(value))}>
                {[...model.years].reverse().map((year) => <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</option>)}
              </SelectField>
            </>
          )}
          <SelectField label="گروه شاخص" value={category} onChange={(value) => setCategory(value as DataCategory)}>
            {DATA_CATEGORIES.map((item) => <option key={item} value={item}>{item === "همه" ? "همه گروه‌ها" : item}</option>)}
          </SelectField>
          <label className="search-field wide">
            <span>جست‌وجوی شاخص یا کد</span>
            <div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً حاشیه سود، ROIC یا کد متغیر" /></div>
          </label>
        </div>
      </section>

      {view === "profile" && (
        <>
          <section className="data-kpi-strip">
            {kpis.slice(0, 4).map(({ name, normalized, record }) => {
              const change = yearChange(model, selectedCompany, selectedYear, normalized);
              return (
                <article key={name}>
                  <div><span>{name}</span><small>{record?.unit || "—"}</small></div>
                  <strong>{formatNumber(record?.value ?? null, 2)}</strong>
                  <footer><span className={change.percent === null ? "neutral" : change.percent >= 0 ? "up" : "down"}>{change.percent === null ? "بدون مبنا" : `${change.percent >= 0 ? "+" : ""}${percent(change.percent)}`}</span><b>امتیاز {formatNumber(record?.score ?? null, 1)}</b></footer>
                </article>
              );
            })}
          </section>
          <section className="data-profile-workspace">
            <article className="table-card data-matrix-card data-browser-card">
              <header><div><p className="eyebrow">مرور شاخص‌ها</p><h3>{profileVariables.length.toLocaleString("fa-IR")} شاخص برای {selectedCompany}</h3></div><span className="table-note-inline">یک ردیف را برای جزئیات انتخاب کنید.</span></header>
              <div className="table-scroll">
              <table className="data-browser-table">
                <thead><tr><th>شاخص</th><th>مقدار و واحد</th><th>امتیاز</th><th>تغییر سالانه</th><th>وضعیت</th><th>روند</th></tr></thead>
                <tbody>
                  {profileVariables.map((representative) => {
                    const record = getRecord(model, selectedCompany, selectedYear, representative.normalizedVariable);
                    const change = yearChange(model, selectedCompany, selectedYear, representative.normalizedVariable);
                    const history = model.years
                      .map((year) => getRecord(model, selectedCompany, year, representative.normalizedVariable)?.value ?? null)
                      .filter((value): value is number => value !== null);
                    return (
                      <tr key={representative.normalizedVariable} className={representative.normalizedVariable === activeProfileVariable ? "selected-row" : ""} onClick={() => setSelectedVariable(representative.normalizedVariable)}>
                        <td><button type="button" className="data-variable-name"><strong>{representative.variable}</strong><small><span className="category-pill">{dataCategory(representative.variable)}</span>{representative.code || "بدون کد"}</small></button></td>
                        <td><div className="data-value-cell"><strong>{formatNumber(record?.value ?? null, 2)}</strong><small>{record?.unit || representative.unit || "—"}</small></div></td>
                        <td><span className={`score-cell ${scoreBandClass(record?.score ?? null)}`}>{formatNumber(record?.score ?? null, 1)}</span></td>
                        <td><span className={`change-pill ${change.percent === null ? "neutral" : change.percent >= 0 ? "up" : "down"}`}>{change.percent === null ? "—" : percent(change.percent)}</span></td>
                        <td><span className={`record-status ${scoreBandClass(record?.score ?? null)}`}>{dataStatus(record?.score ?? null)}</span></td>
                        <td><MiniSparkline values={history} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </article>
            <aside className="data-inspector-card">
              <header><div><p className="eyebrow">جزئیات شاخص انتخاب‌شده</p><h3>{activeProfileRecord?.variable ?? "شاخصی انتخاب نشده است"}</h3><span>{dataCategory(activeProfileRecord?.variable ?? "")} · {activeProfileRecord?.code || "بدون کد"}</span></div><span className={`record-status ${scoreBandClass(activeProfileCurrent?.score ?? null)}`}>{dataStatus(activeProfileCurrent?.score ?? null)}</span></header>
              <div className="data-inspector-reading"><div><span>مقدار سال {selectedYear.toLocaleString("fa-IR", { useGrouping: false })}</span><strong>{formatNumber(activeProfileCurrent?.value ?? null, 2)}</strong><small>{activeProfileCurrent?.unit || activeProfileRecord?.unit || "—"}</small></div><b>امتیاز {formatNumber(activeProfileCurrent?.score ?? null, 1)} از ۱۰</b></div>
              <TrendChart years={model.years} series={[{ name: selectedCompany, color: "#1d4ed8", values: activeProfileHistory }]} unit={activeProfileCurrent?.unit || activeProfileRecord?.unit || ""} />
              <dl className="data-inspector-stats">
                <div><dt>تغییر سالانه</dt><dd className={activeProfileChange.percent === null ? "neutral" : activeProfileChange.percent >= 0 ? "up" : "down"}>{activeProfileChange.percent === null ? "—" : percent(activeProfileChange.percent)}</dd></div>
                <div><dt>میانگین دوره</dt><dd>{formatNumber(activeProfileAverage, 2)}</dd></div>
                <div><dt>کمینه دوره</dt><dd>{activeProfileNumbers.length ? formatNumber(Math.min(...activeProfileNumbers), 2) : "—"}</dd></div>
                <div><dt>بیشینه دوره</dt><dd>{activeProfileNumbers.length ? formatNumber(Math.max(...activeProfileNumbers), 2) : "—"}</dd></div>
              </dl>
              <footer><span><FileCheck2 size={15} />پوشش نمره شرکت {percent(companyScoreCoverage)}</span><span><Building2 size={15} />{model.natureByCompany.get(selectedCompany) ?? "ماهیت نامشخص"}</span></footer>
            </aside>
          </section>
        </>
      )}

      {view === "trend" && (
        <>
          <section className="selection-workbench">
            <article>
              <header><span>۱</span><div><strong>شرکت‌ها</strong><small>حداکثر پنج شرکت</small></div></header>
              <div className="selection-chips">{model.companies.map((company) => <button type="button" key={company} className={trendCompanies.includes(company) ? "active" : ""} onClick={() => setTrendCompanies((current) => toggleLimited(current, company, 5, 1))}>{company}</button>)}</div>
            </article>
            <article>
              <header><span>۲</span><div><strong>متغیرها</strong><small>حداکثر سه متغیر</small></div></header>
              <div className="variable-checklist">{variables.slice(0, 75).map((record) => <label key={record.normalizedVariable}><input type="checkbox" checked={trendVariables.includes(record.normalizedVariable)} onChange={() => setTrendVariables((current) => toggleLimited(current, record.normalizedVariable, 3, 1))} /><span>{record.variable}</span><small>{record.unit}</small></label>)}</div>
            </article>
            <article className="trend-options">
              <header><span>۳</span><div><strong>نوع داده</strong><small>مبنای نمایش نمودار</small></div></header>
              <SelectField label="نوع داده" value={trendDataType} onChange={(value) => setTrendDataType(value as typeof trendDataType)}>
                <option value="value">مقدار خام</option><option value="score">نمره</option><option value="change">درصد تغییر</option>
              </SelectField>
              <p className="trend-helper"><Info size={15} />برای مقایسه متغیرهایی با واحد متفاوت، سامانه آن‌ها را با سال پایه ۱۰۰ هم‌مقیاس می‌کند.</p>
            </article>
          </section>
          {mixedUnits && <div className="data-warning"><AlertTriangle size={17} />متغیرهای با واحد متفاوت به شاخص پایه ۱۰۰ تبدیل شدند تا روی یک محور قابل مقایسه باشند.</div>}
          <section className="data-chart-card trend-main-card">
            <header><div><p className="eyebrow">تحلیل روند</p><h3>{activeTrendVariables.map((record) => record.variable).join(" · ") || "متغیری انتخاب نشده است"}</h3></div><span className="table-count">روند خطی</span></header>
            <TrendChart years={model.years} series={trendSeries} unit={trendUnit} />
          </section>
          <section className="table-card">
            <header><div><p className="eyebrow">داده پشتیبان نمودار</p><h3>مقادیر سالانه انتخاب‌شده</h3></div></header>
            <div className="table-scroll"><table><thead><tr><th>شرکت / متغیر</th>{model.years.map((year) => <th key={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</th>)}</tr></thead><tbody>{trendSeries.map((series) => <tr key={series.name}><td><strong>{series.name}</strong></td>{series.values.map((value, index) => <td key={`${series.name}-${model.years[index]}`}>{formatNumber(value, 2)}</td>)}</tr>)}</tbody></table></div>
          </section>
        </>
      )}

      {view === "compare" && (
        <>
          <section className="compare-control-card">
            <div>
              <span>انتخاب شرکت‌ها؛ حداقل دو و حداکثر پنج</span>
              <div className="selection-chips">{model.companies.map((company) => <button type="button" key={company} className={compareCompanies.includes(company) ? "active" : ""} onClick={() => setCompareCompanies((current) => toggleLimited(current, company, 5, 2))}>{company}</button>)}</div>
            </div>
            <SelectField label="نوع مقایسه" value={compareMode} onChange={(value) => setCompareMode(value as typeof compareMode)}>
              <option value="value">مقدار خام</option><option value="score">نمره</option><option value="change">درصد تغییر</option>
            </SelectField>
            <SelectField label="شاخص نمودار" value={activeVariable} onChange={setSelectedVariable} wide>
              {variables.map((record) => <option key={record.normalizedVariable} value={record.normalizedVariable}>{record.variable}</option>)}
            </SelectField>
          </section>
          <section className="data-visual-grid">
            <article className="data-chart-card">
              <header><div><p className="eyebrow">روند مقایسه‌ای</p><h3>{activeRecord?.variable ?? "شاخص انتخاب نشده"}</h3></div></header>
              <TrendChart years={model.years} series={comparisonSeries} unit={compareMode === "score" ? "امتیاز" : compareMode === "change" ? "نسبت تغییر" : activeRecord?.unit ?? ""} />
            </article>
            <article className="comparison-head multi">
              {compareCompanies.map((company, index) => {
                const record = getRecord(model, company, selectedYear, activeVariable);
                const value = compareMode === "score" ? record?.score ?? null : compareMode === "change" ? yearChange(model, company, selectedYear, activeVariable).percent : record?.value ?? null;
                return <div key={company} style={{ borderColor: SERIES_COLORS[index % SERIES_COLORS.length] }}><span>{company}</span><strong>{formatNumber(value, 2)}</strong><small>{compareMode === "score" ? "امتیاز" : compareMode === "change" ? "نسبت" : record?.unit ?? activeRecord?.unit}</small></div>;
              })}
            </article>
          </section>
          <section className="table-card data-matrix-card">
            <header><div><p className="eyebrow">مقایسه چندشرکتی</p><h3>{variables.length.toLocaleString("fa-IR")} شاخص در سال {selectedYear.toLocaleString("fa-IR", { useGrouping: false })}</h3></div></header>
            <div className="table-scroll"><table><thead><tr><th>گروه</th><th>شاخص</th><th>واحد</th>{compareCompanies.map((company) => <th key={company}>{company}</th>)}<th>میانگین</th><th>بهترین</th></tr></thead><tbody>
              {variables.map((representative) => {
                const values = compareCompanies.map((company) => {
                  const record = getRecord(model, company, selectedYear, representative.normalizedVariable);
                  if (compareMode === "score") return record?.score ?? null;
                  if (compareMode === "change") return yearChange(model, company, selectedYear, representative.normalizedVariable).percent;
                  return record?.value ?? null;
                });
                const numeric = values.filter((value): value is number => value !== null);
                return <tr key={representative.normalizedVariable} onClick={() => setSelectedVariable(representative.normalizedVariable)}><td><span className="category-pill">{dataCategory(representative.variable)}</span></td><td><button type="button" className="company-link">{representative.variable}</button></td><td>{compareMode === "score" ? "امتیاز" : compareMode === "change" ? "نسبت" : representative.unit || "—"}</td>{values.map((value, index) => <td key={`${representative.normalizedVariable}-${compareCompanies[index]}`}><strong>{formatNumber(value, 2)}</strong></td>)}<td>{numeric.length ? formatNumber(numeric.reduce((sum, value) => sum + value, 0) / numeric.length, 2) : "—"}</td><td>{numeric.length ? formatNumber(Math.max(...numeric), 2) : "—"}</td></tr>;
              })}
            </tbody></table></div>
          </section>
        </>
      )}

      {view === "export" && (
        <section className="export-builder">
          <div className="export-builder-main">
            <article>
              <header><span>۱</span><div><h3>انتخاب شرکت‌ها</h3><p>{exportCompanies.length.toLocaleString("fa-IR")} شرکت انتخاب شده است.</p></div></header>
              <div className="selection-chips">{model.companies.map((company) => <button type="button" key={company} className={exportCompanies.includes(company) ? "active" : ""} onClick={() => setExportCompanies((current) => toggleLimited(current, company, model.companies.length, 1))}>{company}</button>)}</div>
            </article>
            <article>
              <header><span>۲</span><div><h3>انتخاب سال‌ها</h3><p>{exportYears.length.toLocaleString("fa-IR")} سال انتخاب شده است.</p></div></header>
              <div className="selection-chips">{model.years.map((year) => <button type="button" key={year} className={exportYears.includes(year) ? "active" : ""} onClick={() => setExportYears((current) => toggleLimited(current.map(String), String(year), model.years.length, 1).map(Number))}>{year.toLocaleString("fa-IR", { useGrouping: false })}</button>)}</div>
            </article>
            <article>
              <header><span>۳</span><div><h3>انتخاب متغیرها</h3><p>{exportVariables.length.toLocaleString("fa-IR")} متغیر انتخاب شده است.</p></div></header>
              <div className="variable-checklist export-variables">{variables.map((record) => <label key={record.normalizedVariable}><input type="checkbox" checked={exportVariables.includes(record.normalizedVariable)} onChange={() => setExportVariables((current) => toggleLimited(current, record.normalizedVariable, variables.length, 1))} /><span>{record.variable}</span><small>{record.unit}</small></label>)}</div>
            </article>
            <article>
              <header><span>۴</span><div><h3>نوع داده</h3><p>حداقل یک نوع داده را فعال نگه دارید.</p></div></header>
              <div className="export-type-grid">
                <label><input type="checkbox" checked={includeValue} onChange={(event) => setIncludeValue(event.target.checked)} /><strong>مقدار خام</strong><span>عدد و واحد ثبت‌شده</span></label>
                <label><input type="checkbox" checked={includeScore} onChange={(event) => setIncludeScore(event.target.checked)} /><strong>نمره</strong><span>مقیاس صفر تا ۱۰</span></label>
                <label><input type="checkbox" checked={includeChange} onChange={(event) => setIncludeChange(event.target.checked)} /><strong>تغییر</strong><span>مقدار و درصد سالانه</span></label>
              </div>
            </article>
            <article>
              <header><span>۵</span><div><h3>نمودارهای منتخب</h3><p>مشخصات و داده پشتیبان هر نمودار به فایل اضافه می‌شود.</p></div></header>
              <div className="selection-chips">{selectedCharts.map((chart) => <button type="button" key={chart} className={chartSelections.includes(chart) ? "active" : ""} onClick={() => setChartSelections((current) => toggleLimited(current, chart, selectedCharts.length))}>{chartSelections.includes(chart) ? <Check size={14} /> : null}{chart}</button>)}</div>
            </article>
          </div>
          <aside className="export-cart">
            <span className="output-icon"><FileSpreadsheet size={25} /></span>
            <h3>سبد خروجی</h3>
            <dl>
              <div><dt>شرکت</dt><dd>{exportCompanies.length.toLocaleString("fa-IR")}</dd></div>
              <div><dt>سال</dt><dd>{exportYears.length.toLocaleString("fa-IR")}</dd></div>
              <div><dt>متغیر</dt><dd>{exportVariables.length.toLocaleString("fa-IR")}</dd></div>
              <div><dt>رکورد تقریبی</dt><dd>{selectedExportCount.toLocaleString("fa-IR")}</dd></div>
              <div><dt>نمودار</dt><dd>{chartSelections.length.toLocaleString("fa-IR")}</dd></div>
            </dl>
            <div className="sheet-list"><strong>شیت‌های فایل</strong>{["داده‌های منتخب", "مقایسه شرکت‌ها", "روند زمانی", "نمودارهای منتخب", "مشخصات خروجی"].map((sheet) => <span key={sheet}><Check size={14} />{sheet}</span>)}</div>
            {!includeValue && !includeScore && !includeChange && <div className="validation-callout danger"><AlertTriangle size={16} />یک نوع داده انتخاب کنید.</div>}
            <button type="button" className="primary-button wide" disabled={!exportCompanies.length || !exportYears.length || !exportVariables.length || (!includeValue && !includeScore && !includeChange)} onClick={() => exportCustomDataWorkbook({ model, companies: exportCompanies, years: exportYears, variables: exportVariables, includeValue, includeScore, includeChange, chartSelections })}><Download size={17} />ساخت و دریافت Excel</button>
          </aside>
        </section>
      )}
    </div>
  );
}

async function downloadIssues(model: FinancialModel) {
  const issueRows = model.issues.map((issue) => ({
    نوع: ISSUE_LABELS[issue.type],
    شدت:
      issue.severity === "error"
        ? "خطا"
        : issue.severity === "warning"
          ? "هشدار"
          : "اطلاعات",
    شرکت: issue.company ?? "",
    سال: issue.year ?? "",
    متغیر: issue.variable ?? "",
    ردیف: issue.row ?? "",
    شرح: issue.message,
  }));
  const summaryRows = [
    { شاخص: "تعداد رکوردها", مقدار: model.summary.totalRecords },
    { شاخص: "تعداد شرکت‌ها", مقدار: model.summary.companies },
    { شاخص: "تعداد سال‌ها", مقدار: model.summary.years },
    { شاخص: "تعداد متغیرها", مقدار: model.summary.variables },
    { شاخص: "سهم کل رکوردهای دارای نمره", مقدار: model.summary.scoreCompleteness },
    { شاخص: "پوشش ۱۳ شاخص رتبه‌بندی", مقدار: model.summary.rankingScoreCompleteness },
    { شاخص: "امتیاز الزامی مفقود", مقدار: model.summary.missingRequiredScores },
    { شاخص: "رکوردهای ناقص", مقدار: model.summary.incompleteRecords },
    { شاخص: "رکوردهای تکراری", مقدار: model.summary.duplicateRecords },
    { شاخص: "نمره‌های نامعتبر", مقدار: model.summary.invalidScores },
    { شاخص: "متغیر با دامنه نمره محدود", مقدار: model.summary.invalidScoreScales },
    { شاخص: "ماهیت تکمیل‌شده", مقدار: model.summary.imputedNatureRows },
  ];
  const groupedRows = Object.entries(
    model.issues.reduce<Record<string, number>>((grouped, issue) => {
      const label = ISSUE_LABELS[issue.type];
      grouped[label] = (grouped[label] ?? 0) + 1;
      return grouped;
    }, {}),
  ).map(([type, count]) => ({ "نوع کنترل": type, تعداد: count }));
  const diagnosticRows = model.scoreDiagnostics.map((diagnostic) => ({
    متغیر: diagnostic.variable,
    "تعداد رکورد": diagnostic.count,
    حداقل: diagnostic.minimum,
    حداکثر: diagnostic.maximum,
    میانگین: diagnostic.mean,
    میانه: diagnostic.median,
    "انحراف معیار": diagnostic.standardDeviation,
    دامنه: diagnostic.range,
    "تعداد صفر": diagnostic.zeroCount,
    "تعداد ۱۰": diagnostic.tenCount,
    "درصد مفقود": diagnostic.missingPercent,
    "وضعیت دامنه": diagnostic.scaleValid ? "مناسب" : "محدود",
    توضیح: diagnostic.reason,
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(issueRows), "جزئیات خطاها");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "خلاصه کیفیت");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(groupedRows), "تجمیع کنترل‌ها");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(diagnosticRows), "آمار دامنه نمره");
  XLSX.writeFile(workbook, "گزارش-کیفیت-داده.xlsx");
}

function QualityPage({ model }: { model: FinancialModel }) {
  const [issueFilter, setIssueFilter] = useState<DataIssue["type"] | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | DataIssue["severity"]>("all");
  const grouped = new Map<DataIssue["type"], number>();
  for (const issue of model.issues) grouped.set(issue.type, (grouped.get(issue.type) ?? 0) + 1);
  const visible = model.issues.filter(
    (issue) =>
      (issueFilter === "all" || issue.type === issueFilter) &&
      (severityFilter === "all" || issue.severity === severityFilter),
  );
  const invalidScales = useMemo(() => {
    const groups = new Map<string, number[]>();
    model.validRecords.forEach((record) => {
      if (record.score !== null) groups.set(record.normalizedVariable, [...(groups.get(record.normalizedVariable) ?? []), record.score]);
    });
    return [...groups.entries()]
      .filter(([, values]) => Math.max(...values) < 2 || Math.max(...values) - Math.min(...values) < 2)
      .map(([variable, values]) => ({ variable, min: Math.min(...values), max: Math.max(...values), count: values.length }));
  }, [model]);
  return (
    <div className="quality-page">
      <section className="page-title-row">
        <div>
          <p className="eyebrow">کنترل کیفیت</p>
          <h2>وضعیت داده ورودی و موارد قابل پیگیری</h2>
          <span>هیچ مقدار خالی در محاسبات به‌صورت صفر فرض نشده است.</span>
        </div>
        <button className="outline-button" type="button" onClick={() => downloadIssues(model)}>
          <Download size={17} />
          دانلود Excel کیفیت داده
        </button>
      </section>
      {invalidScales.length > 0 && (
        <section className="table-card quality-scale-card">
          <header><div><p className="eyebrow">پایش دامنه نمرات</p><h3>هشدار دامنه مشاهده‌شده محدود</h3></div><span className="table-count">{invalidScales.length.toLocaleString("fa-IR")} متغیر</span></header>
          <p className="table-note">این کنترل فقط محدودبودن دامنه نمرات موجود در فایل را نشان می‌دهد. هر نمره معتبر صفر تا ۱۰ همچنان مستقیماً در مدل استفاده می‌شود و از داده خام بازتولید نمی‌شود.</p>
          <div className="table-scroll"><table><thead><tr><th>متغیر</th><th>حداقل</th><th>حداکثر</th><th>تعداد نمره</th></tr></thead><tbody>{invalidScales.map((item) => <tr key={item.variable}><td>{item.variable}</td><td>{formatNumber(item.min, 2)}</td><td>{formatNumber(item.max, 2)}</td><td>{item.count.toLocaleString("fa-IR")}</td></tr>)}</tbody></table></div>
        </section>
      )}
      <section className="quality-overview">
        <QualityStat icon={<Building2 size={18} />} label="تعداد شرکت‌ها" value={model.summary.companies.toLocaleString("fa-IR")} />
        <QualityStat icon={<PanelTop size={18} />} label="تعداد سال‌ها" value={model.summary.years.toLocaleString("fa-IR")} />
        <QualityStat icon={<Database size={18} />} label="تعداد رکوردها" value={model.summary.totalRecords.toLocaleString("fa-IR")} />
        <QualityStat icon={<Layers3 size={18} />} label="تعداد متغیرها" value={model.summary.variables.toLocaleString("fa-IR")} />
        <QualityStat
          icon={<FileCheck2 size={18} />}
          label="سهم کل رکوردهای دارای امتیاز"
          value={percent(model.summary.scoreCompleteness)}
          tone={model.summary.scoreCompleteness > 0.45 ? "good" : "warning"}
        />
        <QualityStat
          icon={<CircleGauge size={18} />}
          label="پوشش ۱۳ شاخص رتبه"
          value={percent(model.summary.rankingScoreCompleteness)}
          tone={model.summary.rankingScoreCompleteness >= 0.75 ? "good" : "warning"}
        />
        <QualityStat
          icon={<AlertTriangle size={18} />}
          label="امتیاز الزامی مفقود"
          value={model.summary.missingRequiredScores.toLocaleString("fa-IR")}
          tone={model.summary.missingRequiredScores ? "warning" : "good"}
        />
        <QualityStat
          icon={<AlertTriangle size={18} />}
          label="رکوردهای ناقص"
          value={model.summary.incompleteRecords.toLocaleString("fa-IR")}
          tone="warning"
        />
        <QualityStat
          icon={<ClipboardCheck size={18} />}
          label="رکوردهای تکراری"
          value={model.summary.duplicateRecords.toLocaleString("fa-IR")}
          tone={model.summary.duplicateRecords ? "danger" : "good"}
        />
        <QualityStat
          icon={<ShieldCheck size={18} />}
          label="ماهیت تکمیل‌شده"
          value={model.summary.imputedNatureRows.toLocaleString("fa-IR")}
          tone="good"
        />
        <QualityStat
          icon={<CircleGauge size={18} />}
          label="متغیر با دامنه محدود"
          value={model.summary.invalidScoreScales.toLocaleString("fa-IR")}
          tone={model.summary.invalidScoreScales ? "warning" : "good"}
        />
      </section>
      <section className="table-card score-diagnostics-card">
        <header>
          <div>
            <p className="eyebrow">پایش توزیع نمره</p>
            <h3>دامنه مشاهده‌شده نمره به تفکیک متغیر</h3>
          </div>
          <span className="table-note-inline">دامنه کمتر از ۲ = هشدار تفکیک‌پذیری؛ نه حذف از مدل</span>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>متغیر</th>
                <th>حداقل</th>
                <th>حداکثر</th>
                <th>میانگین</th>
                <th>میانه</th>
                <th>انحراف معیار</th>
                <th>صفر</th>
                <th>۱۰</th>
                <th>مفقود</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {model.scoreDiagnostics
                .filter((diagnostic) => diagnostic.maximum !== null)
                .sort((a, b) => Number(a.scaleValid) - Number(b.scaleValid))
                .map((diagnostic) => (
                  <tr key={diagnostic.normalizedVariable}>
                    <td><strong>{diagnostic.variable}</strong><small className="cell-note">{diagnostic.reason}</small></td>
                    <td>{formatNumber(diagnostic.minimum, 2)}</td>
                    <td>{formatNumber(diagnostic.maximum, 2)}</td>
                    <td>{formatNumber(diagnostic.mean, 2)}</td>
                    <td>{formatNumber(diagnostic.median, 2)}</td>
                    <td>{formatNumber(diagnostic.standardDeviation, 2)}</td>
                    <td>{diagnostic.zeroCount.toLocaleString("fa-IR")}</td>
                    <td>{diagnostic.tenCount.toLocaleString("fa-IR")}</td>
                    <td>{percent(diagnostic.missingPercent)}</td>
                    <td><span className={`severity ${diagnostic.scaleValid ? "info" : "warning"}`}>{diagnostic.scaleValid ? "مناسب" : "محدود"}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="issue-summary-grid">
        {[...grouped.entries()]
          .filter(([type]) => type !== "missing-score")
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([type, count]) => (
            <button
              key={type}
              type="button"
              className={issueFilter === type ? "active" : ""}
              onClick={() => setIssueFilter(issueFilter === type ? "all" : type)}
            >
              <span>{ISSUE_LABELS[type]}</span>
              <strong>{count.toLocaleString("fa-IR")}</strong>
            </button>
          ))}
      </section>
      <section className="table-card">
        <header>
          <div>
            <p className="eyebrow">فهرست کنترل‌ها</p>
            <h3>{visible.length.toLocaleString("fa-IR")} مورد</h3>
          </div>
          <SelectField label="شدت" value={severityFilter} onChange={(value) => setSeverityFilter(value as typeof severityFilter)}>
            <option value="all">همه</option>
            <option value="error">خطا</option>
            <option value="warning">هشدار</option>
            <option value="info">اطلاع</option>
          </SelectField>
        </header>
        <div className="table-scroll quality-table">
          <table>
            <thead>
              <tr>
                <th>نوع</th>
                <th>شدت</th>
                <th>شرکت</th>
                <th>سال</th>
                <th>متغیر</th>
                <th>شرح</th>
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, 500).map((issue, index) => (
                <tr key={`${issue.type}-${issue.row}-${index}`}>
                  <td>{ISSUE_LABELS[issue.type]}</td>
                  <td>
                    <span className={`severity ${issue.severity}`}>{issue.severity}</span>
                  </td>
                  <td>{issue.company ?? "—"}</td>
                  <td>{issue.year ?? "—"}</td>
                  <td>{issue.variable ?? "—"}</td>
                  <td>{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length > 500 && (
            <p className="table-note">برای حفظ سرعت، ۵۰۰ مورد نخست نمایش داده شده است؛ فایل خروجی شامل همه موارد است.</p>
          )}
        </div>
      </section>
    </div>
  );
}

const WEIGHT_GROUPS: {
  key: keyof ModelSettings["weights"];
  title: string;
  items: { key: string; label: string }[];
}[] = [
  {
    key: "profitability",
    title: "سودآوری",
    items: [
      { key: "operatingMargin", label: "حاشیه سود عملیاتی" },
      { key: "npm", label: "حاشیه سود خالص" },
    ],
  },
  {
    key: "cashQuality",
    title: "کیفیت سود و جریان نقد",
    items: [
      { key: "cfoNi", label: "CFO / NI" },
      { key: "fcfMargin", label: "حاشیه FCF" },
      { key: "ocfStability", label: "پایداری OCF" },
    ],
  },
  {
    key: "growth",
    title: "رشد",
    items: [
      { key: "revenueGrowth", label: "رشد درآمد" },
      { key: "operatingProfitGrowth", label: "رشد سود عملیاتی" },
    ],
  },
  {
    key: "capitalReturn",
    title: "بازده سرمایه",
    items: [
      { key: "roic", label: "ROIC / ROCE" },
      { key: "assetTurnover", label: "گردش دارایی‌ها" },
    ],
  },
  {
    key: "resilience",
    title: "تاب‌آوری مالی",
    items: [
      { key: "debtEbitda", label: "بدهی خالص / EBITDA" },
      { key: "interestCoverage", label: "پوشش بهره" },
      { key: "quickRatio", label: "نسبت آنی" },
    ],
  },
  {
    key: "financialPerformance",
    title: "عملکرد مالی",
    items: [
      { key: "profitability", label: "سودآوری" },
      { key: "capitalReturn", label: "بازده سرمایه" },
      { key: "cashQuality", label: "کیفیت سود" },
    ],
  },
];

function SettingsPage({
  settings,
  onSave,
}: {
  settings: ModelSettings;
  onSave: (settings: ModelSettings) => void;
}) {
  const [draft, setDraft] = useState<ModelSettings>(structuredClone(settings));
  const valid = settingsAreValid(draft);

  function changeWeight(groupKey: keyof ModelSettings["weights"], itemKey: string, value: number) {
    setDraft((current) => {
      const next = structuredClone(current);
      const group = next.weights[groupKey] as unknown as Record<string, number>;
      group[itemKey] = value / 100;
      return next;
    });
  }

  return (
    <div className="settings-page">
      <section className="page-title-row">
        <div>
          <p className="eyebrow">تنظیمات مدل</p>
          <h2>محورهای دیدبان، مرزها و حداقل پوشش داده</h2>
          <span>وزن رسمی شش بُعد در رتبه‌نما مدیریت می‌شود؛ تنظیمات این صفحه فقط دیدبان مالی را کنترل می‌کند.</span>
        </div>
        <div className="settings-actions">
          <button type="button" className="outline-button" onClick={() => setDraft(structuredClone(DEFAULT_SETTINGS))}>
            <RotateCcw size={17} />
            بازیابی پیش‌فرض
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!valid}
            onClick={() => onSave(draft)}
          >
            <Check size={17} />
            ذخیره و محاسبه مجدد
          </button>
        </div>
      </section>
      {!valid && (
        <div className="validation-callout danger">
          <AlertTriangle size={18} />
          <div>
            <strong>تنظیمات نیازمند اصلاح است</strong>
            <span>مجموع وزن هر محور باید دقیقاً ۱۰۰٪ و مرز ضعیف کمتر از مرز مطلوب باشد.</span>
          </div>
        </div>
      )}
      <section className="settings-layout">
        <div className="weight-groups">
          {WEIGHT_GROUPS.map((group) => {
            const values = draft.weights[group.key] as unknown as Record<string, number>;
            const total = Object.values(values).reduce((sum, value) => sum + value, 0);
            return (
              <article className="weight-card" key={group.key}>
                <header>
                  <div>
                    <p className="eyebrow">محور ترکیبی</p>
                    <h3>{group.title}</h3>
                  </div>
                  <span className={Math.abs(total - 1) < 0.001 ? "total valid" : "total invalid"}>
                    مجموع {percent(total)}
                  </span>
                </header>
                <div className="weight-inputs">
                  {group.items.map((item) => (
                    <label key={item.key}>
                      <span>{item.label}</span>
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round((values[item.key] ?? 0) * 100)}
                          onChange={(event) =>
                            changeWeight(group.key, item.key, Number(event.target.value))
                          }
                        />
                        <b>٪</b>
                      </div>
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <aside className="model-controls">
          <article hidden>
            <header>
              <Target size={18} />
              <h3>ترکیب مطلق و نسبی</h3>
            </header>
            <label>
              <span>وزن امتیاز مطلق</span>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={Math.round((draft.performance ?? DEFAULT_SETTINGS.performance).absoluteWeight * 100)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    performance: {
                      ...(current.performance ?? DEFAULT_SETTINGS.performance),
                      absoluteWeight: Number(event.target.value) / 100,
                      relativeWeight: 1 - Number(event.target.value) / 100,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>وزن امتیاز نسبی</span>
              <strong>{percent((draft.performance ?? DEFAULT_SETTINGS.performance).relativeWeight)}</strong>
            </label>
            <p>مقدار پیش‌فرض: ۷۵٪ مطلق و ۲۵٪ نسبی. امتیاز نسبی جایگزین استاندارد مطلق نمی‌شود.</p>
          </article>
          <article hidden>
            <header>
              <TrendingUp size={18} />
              <h3>تورم و نسخه مدل</h3>
            </header>
            <label>
              <span>نرخ تورم سالانه</span>
              <input
                type="number"
                min="0"
                max="500"
                step="0.1"
                placeholder="ثبت نشده"
                value={(draft.performance ?? DEFAULT_SETTINGS.performance).inflationRate === null ? "" : Math.round(((draft.performance ?? DEFAULT_SETTINGS.performance).inflationRate ?? 0) * 1000) / 10}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    performance: {
                      ...(current.performance ?? DEFAULT_SETTINGS.performance),
                      inflationRate: event.target.value === "" ? null : Number(event.target.value) / 100,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>نسخه فعال مدل</span>
              <input
                type="text"
                value={(draft.performance ?? DEFAULT_SETTINGS.performance).modelVersion}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    performance: {
                      ...(current.performance ?? DEFAULT_SETTINGS.performance),
                      modelVersion: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <p>اگر تورم خالی باشد، رشد درآمد با برچسب «رشد اسمی» گزارش می‌شود.</p>
          </article>
          <article>
            <header>
              <SlidersHorizontal size={18} />
              <h3>مرز طبقه‌بندی</h3>
            </header>
            <label>
              <span>پایان ناحیه ضعیف</span>
              <input
                type="number"
                min="0.1"
                max="9"
                step="0.1"
                value={draft.lowBoundary}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    lowBoundary: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>شروع ناحیه مطلوب</span>
              <input
                type="number"
                min="1"
                max="9.9"
                step="0.1"
                value={draft.highBoundary}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    highBoundary: Number(event.target.value),
                  }))
                }
              />
            </label>
            <div className="boundary-preview">
              <span className="weak">۰ تا {draft.lowBoundary}</span>
              <span className="medium">{draft.lowBoundary} تا {draft.highBoundary}</span>
              <span className="good">{draft.highBoundary} تا ۱۰</span>
            </div>
          </article>
          <article>
            <header>
              <CircleGauge size={18} />
              <h3>حداقل پوشش داده</h3>
            </header>
            <label>
              <span>وزن معتبر لازم</span>
              <div className="range-field">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={draft.minimumCoverage * 100}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minimumCoverage: Number(event.target.value) / 100,
                    }))
                  }
                />
                <strong>{percent(draft.minimumCoverage)}</strong>
              </div>
            </label>
            <p>در پوشش کمتر از این حد، محور با برچسب «داده ناکافی» نمایش داده می‌شود.</p>
          </article>
          <article hidden>
            <header>
              <FileCheck2 size={18} />
              <h3>پوشش امتیاز پایه</h3>
            </header>
            <label>
              <span>حداقل وزن شش بُعد</span>
              <div className="range-field">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={(draft.performance ?? DEFAULT_SETTINGS.performance).minimumBaseCoverage * 100}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      performance: {
                        ...(current.performance ?? DEFAULT_SETTINGS.performance),
                        minimumBaseCoverage: Number(event.target.value) / 100,
                      },
                    }))
                  }
                />
                <strong>{percent((draft.performance ?? DEFAULT_SETTINGS.performance).minimumBaseCoverage)}</strong>
              </div>
            </label>
            <p>زیر این حد، امتیاز نهایی با برچسب «غیرقابل اتکا» محاسبه نمی‌شود.</p>
          </article>
          <article hidden>
            <header>
              <AlertTriangle size={18} />
              <h3>جریمه‌های استثنایی</h3>
            </header>
            <label>
              <span>پوشش بهره کمتر از یک</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={(draft.performance ?? DEFAULT_SETTINGS.performance).criticalInterestCoveragePenalty}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    performance: {
                      ...(current.performance ?? DEFAULT_SETTINGS.performance),
                      criticalInterestCoveragePenalty: Number(event.target.value),
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>OCF منفی در دو سال از سه سال</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={(draft.performance ?? DEFAULT_SETTINGS.performance).recurringNegativeOcfPenalty}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    performance: {
                      ...(current.performance ?? DEFAULT_SETTINGS.performance),
                      recurringNegativeOcfPenalty: Number(event.target.value),
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>EBITDA منفی و بدهی خالص مثبت</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={(draft.performance ?? DEFAULT_SETTINGS.performance).severeNetDebtPenalty}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    performance: {
                      ...(current.performance ?? DEFAULT_SETTINGS.performance),
                      severeNetDebtPenalty: Number(event.target.value),
                    },
                  }))
                }
              />
            </label>
            <p>مجموع جریمه‌های اضافی حداکثر یک امتیاز است و سقف‌های بحرانی مستقل اعمال می‌شوند.</p>
          </article>
          <article hidden>
            <header>
              <ShieldCheck size={18} />
              <h3>قاعده پایداری OCF</h3>
            </header>
            <p>
              سه سال: ۱۰ منهای دو برابر انحراف معیار. دو سال: ۱۰ منهای اختلاف مطلق.
              یک سال: حذف مؤلفه و بازتوزیع وزن.
            </p>
          </article>
          <article hidden>
            <header>
              <TrendingUp size={18} />
              <h3>قاعده رشد سود عملیاتی</h3>
            </header>
            <p>
              برای سه مقدار مثبت از CAGR استفاده می‌شود. در تغییر علامت، تغییر نمره
              نرمال‌شده مبناست و روش فعال در جزئیات محاسبه درج می‌شود.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}

function HomePage({
  model,
  matrix,
  performanceMatrix,
  selectedCompany,
  selectedYear,
  setTab,
}: {
  model: FinancialModel;
  matrix: Map<string, Map<number, AxisBundle>>;
  performanceMatrix: PerformanceMatrix;
  selectedCompany: string;
  selectedYear: number;
  setTab: (tab: AppTab) => void;
}) {
  const result = performanceMatrix.get(selectedCompany)?.get(selectedYear);
  const bundle = matrix.get(selectedCompany)?.get(selectedYear);
  const selectedRecords = model.index.get(selectedCompany)?.get(selectedYear);
  const rawMetric = (variable: string) =>
    selectedRecords?.get(normalizeText(variable))?.value ?? null;
  const dimensions = result
    ? PERFORMANCE_DIMENSION_KEYS
        .map((key) => result.dimensions[key])
        .filter((dimension) => dimension.score !== null)
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    : [];
  const modules: {
    key: AppTab;
    number: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    features: string[];
  }[] = [
    {
      key: "analysis",
      number: "۰۱",
      icon: <BarChart3 size={27} />,
      title: "دیدبان مالی",
      subtitle: "تحلیل چندبعدی وضعیت و مسیر مالی شرکت‌ها",
      features: ["چهار ماتریس اسکاتر", "مسیر سه‌ساله و ۹ ناحیه", "مقایسه پرتفوی و هم‌ماهیت"],
    },
    {
      key: "performance",
      number: "۰۲",
      icon: <CircleGauge size={27} />,
      title: "رتبه‌نمای عملکرد",
      subtitle: "امتیازدهی، رتبه‌بندی و ارزیابی عملکرد مالی",
      features: ["مدل شش‌بُعدی و ۱۳ شاخص", "وزن‌دهی گرافیکی و سناریو", "رتبه و تحلیل پویا"],
    },
    {
      key: "data",
      number: "۰۳",
      icon: <Database size={27} />,
      title: "مرکز داده مالی",
      subtitle: "مشاهده، مقایسه و استخراج داده‌ها و شاخص‌ها",
      features: ["پروفایل کامل شرکت", "روند و مقایسه چندشرکتی", "خروجی سفارشی Excel"],
    },
  ];
  return (
    <div className="system-home">
      <section className="system-home-hero">
        <div>
          <span className="product-badge"><Sparkles size={15} />سامانه مدیریتی یکپارچه IPS</span>
          <h1>سامانه هوشمند پایش و ارزیابی مالی شرکت‌ها</h1>
          <p>یک مرجع واحد برای مشاهده داده، تحلیل موقعیت مالی، ارزیابی عملکرد و تصمیم‌گیری درباره شرکت‌های زیرمجموعه.</p>
        </div>
        <div className="home-context-card">
          <span>فیلتر فعال</span>
          <strong>{selectedCompany}</strong>
          <p>سال {selectedYear.toLocaleString("fa-IR", { useGrouping: false })} · {model.natureByCompany.get(selectedCompany) ?? "ماهیت نامشخص"}</p>
          <div>
            <span>امتیاز نهایی</span>
            <b>{formatNumber(result?.finalScore ?? null, 2)}</b>
            <small>{result?.classificationLabel ?? "داده ناکافی"}</small>
          </div>
        </div>
      </section>
      <section className="home-summary-strip">
        <QualityStat icon={<Building2 size={18} />} label="شرکت زیرمجموعه" value={model.summary.companies.toLocaleString("fa-IR")} />
        <QualityStat icon={<PanelTop size={18} />} label="دوره مالی" value={`${model.summary.years.toLocaleString("fa-IR")} سال`} />
        <QualityStat icon={<Database size={18} />} label="شاخص و متغیر" value={model.summary.variables.toLocaleString("fa-IR")} />
        <QualityStat icon={<FileCheck2 size={18} />} label="پوشش ۱۳ شاخص رتبه" value={percent(model.summary.rankingScoreCompleteness)} tone={model.summary.rankingScoreCompleteness >= 0.75 ? "good" : "warning"} />
      </section>
      <section className="company-profile-snapshot">
        <header>
          <div>
            <p className="eyebrow">پروفایل مالی شرکت</p>
            <h2>{selectedCompany}</h2>
          </div>
          <span className={`performance-class ${result?.classification ?? "unreliable"}`}>{result?.classificationLabel ?? "داده ناکافی"}</span>
        </header>
        <div className="profile-kpi-grid">
          <div><span>درآمد عملیاتی</span><strong>{formatCompact(rawMetric("درآمدهای عملیاتی"))}</strong></div>
          <div><span>سود عملیاتی</span><strong>{formatCompact(rawMetric("سود (زیان) عملیاتی"))}</strong></div>
          <div><span>سود خالص</span><strong>{formatCompact(rawMetric("سود (زیان) خالص (عملیات در حال تداوم)"))}</strong></div>
          <div><span>جریان نقد عملیاتی</span><strong>{formatCompact(rawMetric("OCF جریان نقد عملیاتی"))}</strong></div>
          <div><span>امتیاز نهایی</span><strong>{formatNumber(result?.finalScore ?? null, 2)}</strong></div>
          <div><span>رتبه پرتفوی</span><strong>{result?.ranking.overallRank?.toLocaleString("fa-IR") ?? "—"}</strong></div>
        </div>
        <div className="profile-insight-grid">
          <article>
            <span>وضعیت چهار اسکاتر</span>
            <div className="scatter-status-list">
              {CHART_DEFINITIONS.map((definition) => {
                const x = bundle?.axes[definition.xKey].score ?? null;
                const y = bundle?.axes[definition.yKey].score ?? null;
                const tone = x === null || y === null ? "empty" : x >= SCATTER_BOUNDARIES.high && y >= SCATTER_BOUNDARIES.high ? "good" : x < SCATTER_BOUNDARIES.low || y < SCATTER_BOUNDARIES.low ? "weak" : "medium";
                return <b className={tone} key={definition.key}>{definition.title}: {x === null || y === null ? "داده ناکافی" : `${formatNumber(x, 1)} / ${formatNumber(y, 1)}`}</b>;
              })}
            </div>
          </article>
          <article><span>مهم‌ترین قوت</span><strong>{dimensions[0]?.label ?? "نامشخص"}</strong><small>{formatNumber(dimensions[0]?.score ?? null, 2)} از ۱۰</small></article>
          <article><span>مهم‌ترین ضعف</span><strong>{dimensions.at(-1)?.label ?? "نامشخص"}</strong><small>{formatNumber(dimensions.at(-1)?.score ?? null, 2)} از ۱۰</small></article>
          <article><span>مهم‌ترین هشدار</span><strong>{result?.penalties[0]?.label ?? (result?.warnings[0] ? "محدودیت مدل" : "هشدار بحرانی ندارد")}</strong><small>{result?.penalties[0]?.evidence ?? result?.warnings[0] ?? "—"}</small></article>
        </div>
      </section>
      <section className="module-card-grid">
        {modules.map((module) => (
          <button type="button" key={module.key} className={`module-card module-${module.key}`} onClick={() => setTab(module.key)}>
            <div className="module-card-top"><span>{module.icon}</span><b>{module.number}</b></div>
            <h2>{module.title}</h2>
            <p>{module.subtitle}</p>
            <ul>{module.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul>
            <span className="module-open">ورود به ماژول <ArrowLeft size={17} /></span>
          </button>
        ))}
      </section>
      <section className="home-guidance">
        <div><ShieldCheck size={21} /><span><strong>پردازش محلی و امن</strong>فایل اصلی تغییر نمی‌کند و داده داخل مرورگر پردازش می‌شود.</span></div>
        <div><Activity size={21} /><span><strong>محاسبات قابل حسابرسی</strong>فرمول، وزن داخلی، پوشش و بازتوزیع برای هر امتیاز قابل مشاهده است.</span></div>
        <div><Layers3 size={21} /><span><strong>State مشترک</strong>شرکت و سال انتخاب‌شده هنگام جابه‌جایی بین ماژول‌ها حفظ می‌شوند.</span></div>
      </section>
    </div>
  );
}

function OutputsPage({
  model,
  matrix,
  performanceMatrix,
  goToBuilder,
}: {
  model: FinancialModel;
  matrix: Map<string, Map<number, AxisBundle>>;
  performanceMatrix: PerformanceMatrix;
  goToBuilder: () => void;
}) {
  return (
    <div className="outputs-page">
      <section className="page-title-row">
        <div><p className="eyebrow">خروجی‌ها</p><h2>مرکز دریافت گزارش‌ها</h2><span>خروجی آماده مدل امتیازدهی یا ساخت فایل سفارشی بر اساس شرکت، سال و متغیر.</span></div>
      </section>
      <section className="output-option-grid">
        <article>
          <span className="output-icon"><CircleGauge size={25} /></span>
          <h3>گزارش امتیاز و رتبه‌بندی</h3>
          <p>امتیاز رسمی سالانه، امتیاز سه‌ساله، شش بُعد، ۱۳ شاخص، پوشش و رتبه‌ها در شیت‌های مستقل.</p>
          <button type="button" className="primary-button" onClick={() => exportAxisWorkbook(model, matrix, performanceMatrix)}><FileSpreadsheet size={17} />دریافت Excel امتیازها</button>
        </article>
        <article>
          <span className="output-icon"><Database size={25} /></span>
          <h3>سازنده خروجی سفارشی</h3>
          <p>شرکت‌ها، سال‌ها، متغیرها و نوع داده را انتخاب کنید و فایل چندشیتی مختص جلسه یا تحلیل خود بسازید.</p>
          <button type="button" className="primary-button" onClick={goToBuilder}><SlidersHorizontal size={17} />ورود به سازنده خروجی</button>
        </article>
        <article>
          <span className="output-icon"><Printer size={25} /></span>
          <h3>نسخه PDF مدیریتی</h3>
          <p>صفحه فعال را با چیدمان چاپی ذخیره کنید؛ برای نمودارها ابتدا حالت تمام‌صفحه را بررسی کنید.</p>
          <button type="button" className="outline-button" onClick={() => window.print()}><Printer size={17} />چاپ / ذخیره PDF</button>
        </article>
      </section>
    </div>
  );
}

async function exportAxisWorkbook(
  model: FinancialModel,
  matrix: Map<string, Map<number, AxisBundle>>,
  performanceMatrix: PerformanceMatrix,
) {
  const axisRows = model.companies.flatMap((company) =>
    model.years.map((year) => {
      const bundle = matrix.get(company)?.get(year);
      return {
        شرکت: company,
        ماهیت: model.natureByCompany.get(company) ?? "",
        سال: year,
        سودآوری: bundle?.axes.profitability.score ?? null,
        "کیفیت سود": bundle?.axes.cashQuality.score ?? null,
        رشد: bundle?.axes.growth.score ?? null,
        "بازده سرمایه": bundle?.axes.capitalReturn.score ?? null,
        "تاب‌آوری مالی": bundle?.axes.resilience.score ?? null,
        "عملکرد مالی": bundle?.axes.financialPerformance.score ?? null,
        "کارایی سرمایه در گردش": bundle?.axes.workingCapital.score ?? null,
        "سودآوری عملیاتی": bundle?.axes.operatingProfitability.score ?? null,
      };
    }),
  );
  const performanceResults = model.companies.flatMap((company) =>
    model.years
      .map((year) => performanceMatrix.get(company)?.get(year))
      .filter((result): result is PerformanceResult => Boolean(result)),
  );
  const scoreRows = performanceResults.map((result) => ({
    شرکت: result.company,
    ماهیت: result.nature,
    سال: result.year,
    "نسخه مدل": result.modelVersion,
    "گروه مقایسه": result.comparisonGroup,
    "امتیاز رسمی سالانه": result.finalScore,
    "پوشش مدل": result.baseCoverage,
    "اعتبار امتیاز": result.confidenceLabel,
    "امتیاز پایدار سه‌ساله": result.weightedHistoryScore,
    "روش سابقه": result.historyLabel,
    طبقه: result.classificationLabel,
    "رتبه گروه سازگار": result.ranking.overallRank,
    "رتبه هم‌ماهیت": result.ranking.peerRank,
    صدک: result.ranking.percentile,
    "فاصله از برتر": result.ranking.gapToLeader,
    "فاصله از میانگین": result.ranking.gapToAverage,
    "فاصله از میانه": result.ranking.gapToMedian,
    "تغییر رتبه": result.ranking.rankChange,
  }));
  const dimensionRows = performanceResults.flatMap((result) =>
    PERFORMANCE_DIMENSION_KEYS.map((key) => {
      const dimension = result.dimensions[key];
      return {
        شرکت: result.company,
        سال: result.year,
        بُعد: dimension.label,
        وزن: dimension.modelWeight,
        پوشش: dimension.coverage,
        "امتیاز بُعد": dimension.score,
        "وزن تعدیل‌شده": dimension.adjustedModelWeight,
        "سهم در امتیاز سالانه": dimension.baseContribution,
        "تغییر سالانه": dimension.yearOverYearChange,
        "رتبه بُعدی": dimension.portfolioRank,
        فرمول: dimension.formula,
        هشدار: dimension.warnings.join(" | "),
      };
    }),
  );
  const componentRows = performanceResults.flatMap((result) =>
    PERFORMANCE_DIMENSION_KEYS.flatMap((key) =>
      result.dimensions[key].components.map((component) => ({
        شرکت: result.company,
        سال: result.year,
        بُعد: result.dimensions[key].label,
        شاخص: component.label,
        متغیر: component.variable,
        مقدار: component.value,
        واحد: component.unit,
        امتیاز: component.score,
        "روش امتیاز": component.scoreMethod,
        "وزن اولیه": component.originalWeight,
        "وزن مؤثر": component.adjustedWeight,
        سهم: component.contribution,
        توضیح: component.method,
      })),
    ),
  );
  const scoreDiagnosticRows = model.scoreDiagnostics.map((diagnostic) => ({
    متغیر: diagnostic.variable,
    حداقل: diagnostic.minimum,
    حداکثر: diagnostic.maximum,
    میانگین: diagnostic.mean,
    میانه: diagnostic.median,
    "انحراف معیار": diagnostic.standardDeviation,
    دامنه: diagnostic.range,
    صفر: diagnostic.zeroCount,
    ده: diagnostic.tenCount,
    "درصد مفقود": diagnostic.missingPercent,
    وضعیت: diagnostic.scaleValid ? "مناسب" : "محدود",
    توضیح: diagnostic.reason,
  }));
  const warningRows = performanceResults.flatMap((result) =>
    result.warnings.map((warning) => ({
      شرکت: result.company,
      سال: result.year,
      پوشش: result.baseCoverage,
      "اعتبار امتیاز": result.confidenceLabel,
      هشدار: warning,
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scoreRows), "امتیاز نهایی");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dimensionRows), "جزئیات ابعاد");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(componentRows), "جزئیات شاخص‌ها");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(warningRows), "پوشش و هشدارها");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(axisRows), "محورهای دیدبان");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scoreDiagnosticRows), "آمار دامنه نمره");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["عنوان", "سامانه هوشمند پایش و ارزیابی مالی شرکت‌ها"],
      ["فایل ورودی", model.fileName],
      ["زمان پردازش", formatDate(model.importedAt)],
      ["تعداد شرکت", model.summary.companies],
      ["تعداد سال", model.summary.years],
      ["نسخه مدل", performanceResults[0]?.modelVersion ?? "—"],
      ["قاعده پوشش داخلی بُعد", "حداقل ۶۰٪ وزن داخلی"],
      ["قاعده پوشش کل", "۷۵٪ معتبر؛ ۶۰٪ تا کمتر از ۷۵٪ موقت؛ کمتر از ۶۰٪ بدون امتیاز و رتبه رسمی"],
      ["یادداشت", "نمره خالی در هیچ محاسبه‌ای صفر فرض نشده است."],
    ]),
    "مشخصات خروجی",
  );
  XLSX.writeFile(workbook, "گزارش-امتیاز-و-رتبه‌بندی-پرتفوی.xlsx");
}

export default function DashboardApp() {
  const [models, setModels] = useState<HoldingModels>({ atieh: null, metil: null });
  const [holding, setHolding] = useState<HoldingSelection>("atieh");
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState<HoldingFlags>({ atieh: false, metil: false });
  const [fileErrors, setFileErrors] = useState<HoldingErrors>({ atieh: "", metil: "" });
  const [error, setError] = useState("");
  const [duplicateConfirmed, setDuplicateConfirmed] = useState<HoldingFlags>({ atieh: false, metil: false });
  const [tab, setTab] = useState<AppTab>("home");
  const [dataEntryView, setDataEntryView] = useState<DataView>("profile");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState(0);
  const [natureFilter, setNatureFilter] = useState("همه");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("trend");
  const [bubbleMetric, setBubbleMetric] = useState<BubbleMetric>("none");
  const [showAverage, setShowAverage] = useState(DEFAULT_SETTINGS.showAverage);
  const [showLabels, setShowLabels] = useState(DEFAULT_SETTINGS.showLabels);
  const [highlightSelected, setHighlightSelected] = useState(true);
  const [settings, setSettings] = useState<ModelSettings>(loadStoredSettings);
  const [exportingImage, setExportingImage] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const model = models[holding];

  const matrix = useMemo(
    () => (model ? buildAxisMatrix(model, settings) : new Map<string, Map<number, AxisBundle>>()),
    [model, settings],
  );
  const performanceMatrix = useMemo(
    () => (model ? buildPerformanceMatrix(model, matrix, settings) : new Map()),
    [model, matrix, settings],
  );

  function setDefaultContext(target: HoldingSelection, parsed: FinancialModel) {
    const preferredName = target === "metil" ? "فولاد متیل" : "آتیه فولاد نقش جهان";
    const preferred = parsed.companies.includes(preferredName)
      ? preferredName
      : parsed.companies[0] ?? "";
    setSelectedCompany(preferred);
    setSelectedYear(parsed.years.at(-1) ?? 0);
    setNatureFilter("همه");
  }

  function switchHolding(nextHolding: HoldingSelection) {
    const nextModel = models[nextHolding];
    if (!nextModel || nextHolding === holding) return;
    setHolding(nextHolding);
    setDefaultContext(nextHolding, nextModel);
    setMobileMenu(false);
    setError("");
  }

  async function handleFile(target: HoldingSelection, file: File) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setFileErrors((current) => ({
        ...current,
        [target]: "فرمت فایل پشتیبانی نمی‌شود. فایل XLSX، XLS یا CSV انتخاب کنید.",
      }));
      return;
    }
    setBusy((current) => ({ ...current, [target]: true }));
    setFileErrors((current) => ({ ...current, [target]: "" }));
    setDuplicateConfirmed((current) => ({ ...current, [target]: false }));
    try {
      const parsed = await parseExcelFile(file);
      setModels((current) => ({ ...current, [target]: parsed }));
      if (target === holding) setDefaultContext(target, parsed);
    } catch (reason) {
      setModels((current) => ({ ...current, [target]: null }));
      setFileErrors((current) => ({
        ...current,
        [target]: reason instanceof Error ? reason.message : "فایل قابل پردازش نبود.",
      }));
    } finally {
      setBusy((current) => ({ ...current, [target]: false }));
    }
  }

  function saveSettings(next: ModelSettings) {
    const normalized = { ...next, showAverage, showLabels };
    setSettings(normalized);
    localStorage.setItem("ips-financial-model-settings-v4", JSON.stringify(normalized));
    setTab("performance");
  }

  async function exportReportImage() {
    if (!reportRef.current || !selectedCompany) return;
    setExportingImage(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 1.5,
        backgroundColor: "#f4f7fb",
        filter: (node) =>
          !(node instanceof HTMLElement && node.classList.contains("no-print")),
      });
      const anchor = document.createElement("a");
      anchor.download = `${safeFileName(selectedCompany)}-${selectedYear}.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch {
      setError("تهیه تصویر کامل صفحه ممکن نشد؛ می‌توانید از خروجی چاپ/PDF استفاده کنید.");
    } finally {
      setExportingImage(false);
    }
  }

  if (!entered || !model) {
    return (
      <UploadScreen
        models={models}
        busy={busy}
        errors={fileErrors}
        duplicateConfirmed={duplicateConfirmed}
        onDuplicateConfirmed={(target, value) =>
          setDuplicateConfirmed((current) => ({ ...current, [target]: value }))
        }
        onFile={handleFile}
        onEnter={() => {
          const initialModel = models.atieh;
          if (!initialModel) return;
          setHolding("atieh");
          setDefaultContext("atieh", initialModel);
          setTab("home");
          setEntered(true);
          setError("");
        }}
        onClear={(target) => {
          setModels((current) => ({ ...current, [target]: null }));
          setFileErrors((current) => ({ ...current, [target]: "" }));
          setDuplicateConfirmed((current) => ({ ...current, [target]: false }));
        }}
      />
    );
  }

  const navItems: { key: AppTab; label: string; icon: React.ReactNode }[] = [
    { key: "home", label: "صفحه اصلی", icon: <Home size={18} /> },
    { key: "analysis", label: "دیدبان مالی", icon: <BarChart3 size={18} /> },
    { key: "performance", label: "رتبه‌نمای عملکرد", icon: <CircleGauge size={18} /> },
    { key: "data", label: "مرکز داده مالی", icon: <Database size={18} /> },
    { key: "quality", label: "کیفیت داده", icon: <ClipboardCheck size={18} /> },
    { key: "settings", label: "تنظیمات مدل", icon: <Settings2 size={18} /> },
    { key: "outputs", label: "خروجی‌ها", icon: <Download size={18} /> },
  ];
  const primaryNav = navItems.filter((item) => ["analysis", "performance", "data"].includes(item.key));
  const utilityNav = navItems.filter((item) => !["analysis", "performance", "data"].includes(item.key));

  return (
    <main className="app-shell" dir="rtl">
      <header className="app-header no-print">
        <div className="header-brand">
          <button
            type="button"
            className="icon-button mobile-menu-button"
            onClick={() => setMobileMenu((current) => !current)}
            aria-label="منوی اصلی"
          >
            <Menu size={20} />
          </button>
          <span className="brand-mark">
            <BarChart3 size={21} />
          </span>
          <div>
            <strong>سامانه هوشمند پایش و ارزیابی مالی شرکت‌ها</strong>
            <span>IPS Finance · پایش یکپارچه پرتفوی</span>
          </div>
        </div>
          <nav className={mobileMenu ? "open" : ""}>
          <div className="primary-module-tabs">{primaryNav.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "active" : ""}
              onClick={() => {
                setTab(item.key);
                setMobileMenu(false);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}</div>
          <div className="utility-nav">{utilityNav.map((item) => (
            <button key={item.key} type="button" className={tab === item.key ? "active" : ""} onClick={() => { if (item.key === "data" && tab !== "data") setDataEntryView("profile"); setTab(item.key); setMobileMenu(false); }}>{item.icon}{item.label}</button>
          ))}</div>
          </nav>
        <div className="header-actions">
          <div className="file-status">
            <FileSpreadsheet size={17} />
            <div>
              <strong>{model.fileName}</strong>
              <span>بارگذاری: {formatDate(model.importedAt)}</span>
            </div>
          </div>
          <div className="utility-actions">
            <button type="button" className={`icon-button ${tab === "home" ? "active" : ""}`} onClick={() => setTab("home")} aria-label="صفحه اصلی" title="صفحه اصلی"><Home size={17} /></button>
          </div>
          <FileDrop onFile={(file) => handleFile(holding, file)} busy={busy[holding]} compact />
          <div className="export-menu">
            <button type="button" className="primary-button">
              <Download size={17} />
              خروجی گزارش
              <ChevronDown size={14} />
            </button>
            <div className="export-popover">
              <button type="button" onClick={() => window.print()}>
                <Printer size={16} /> چاپ / ذخیره PDF
              </button>
              <button type="button" onClick={() => exportAxisWorkbook(model, matrix, performanceMatrix)}>
                <FileSpreadsheet size={16} /> Excel امتیاز و رتبه‌بندی
              </button>
              {tab === "analysis" && <button type="button" onClick={exportReportImage} disabled={exportingImage}>{exportingImage ? <LoaderCircle className="spin" size={16} /> : <ImageDown size={16} />}تصویر دیدبان مالی</button>}
            </div>
          </div>
        </div>
      </header>
      <div className="shared-context-bar no-print">
        <div className="holding-dashboard-tabs" role="tablist" aria-label="انتخاب هلدینگ برای نمایش">
          {HOLDING_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={holding === key}
              className={holding === key ? "active" : ""}
              onClick={() => switchHolding(key)}
            >
              <Building2 size={15} />
              {HOLDING_SHORT_LABELS[key]}
              <small>{models[key]?.summary.companies.toLocaleString("fa-IR") ?? "—"} شرکت</small>
            </button>
          ))}
        </div>
        <span className="active-holding-context"><Layers3 size={15} />{HOLDING_LABELS[holding]}</span>
        <span><Building2 size={15} />{selectedCompany}</span>
        <span><PanelTop size={15} />سال {selectedYear.toLocaleString("fa-IR", { useGrouping: false })}</span>
        <span><Layers3 size={15} />{model.natureByCompany.get(selectedCompany) ?? "ماهیت نامشخص"}</span>
        <span><ShieldCheck size={15} />داده محلی</span>
        <button type="button" onClick={() => setTab("home")}><Home size={15} />پروفایل شرکت</button>
      </div>

      <div className="app-content">
        {error && (
          <div className="floating-error">
            <AlertTriangle size={17} />
            {error}
            <button type="button" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {tab === "home" && (
          <HomePage
            model={model}
            matrix={matrix}
            performanceMatrix={performanceMatrix}
            selectedCompany={selectedCompany}
            selectedYear={selectedYear}
            setTab={setTab}
          />
        )}
        {tab === "analysis" && (
          <CompanyDashboard
            model={model}
            matrix={matrix}
            settings={settings}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            natureFilter={natureFilter}
            setNatureFilter={setNatureFilter}
            displayMode={displayMode}
            setDisplayMode={setDisplayMode}
            bubbleMetric={bubbleMetric}
            setBubbleMetric={setBubbleMetric}
            showAverage={showAverage}
            setShowAverage={setShowAverage}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            highlightSelected={highlightSelected}
            setHighlightSelected={setHighlightSelected}
            reportRef={reportRef}
          />
        )}
        {tab === "performance" && (
          <DynamicRankingPage
            key={`${holding}-${model.fileName}`}
            model={model}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
        )}
        {tab === "data" && <DataCenterPage key={`${holding}-${model.fileName}-${dataEntryView}`} model={model} initialView={dataEntryView} selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
        {tab === "quality" && <QualityPage model={model} />}
        {tab === "settings" && <SettingsPage settings={settings} onSave={saveSettings} />}
        {tab === "outputs" && (
          <OutputsPage
            model={model}
            matrix={matrix}
            performanceMatrix={performanceMatrix}
            goToBuilder={() => {
              setDataEntryView("export");
              setTab("data");
            }}
          />
        )}
      </div>
      <footer className="app-footer no-print">
        <span>
          <ShieldCheck size={15} /> داده فایل در مرورگر پردازش می‌شود و فایل اصلی تغییر نمی‌کند.
        </span>
        <span>
          {model.summary.companies.toLocaleString("fa-IR")} شرکت ·{" "}
          {model.summary.years.toLocaleString("fa-IR")} سال ·{" "}
          {model.summary.totalRecords.toLocaleString("fa-IR")} رکورد
        </span>
      </footer>
    </main>
  );
}
