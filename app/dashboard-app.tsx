"use client";

import { useMemo, useRef, useState } from "react";
import {
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
  ImageDown,
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
import {
  CHART_DEFINITIONS,
  DEFAULT_SETTINGS,
  REQUIRED_COLUMNS,
  bandLabel,
  buildAxisMatrix,
  buildChartPoint,
  buildFinancialModel,
  chartNarrative,
  formatNumber,
  managementInsights,
  previousComparableScore,
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

type AppTab = "analysis" | "performance" | "data" | "quality" | "settings";

const PERFORMANCE_AXIS_KEYS: AxisKey[] = [
  "profitability",
  "cashQuality",
  "growth",
  "capitalReturn",
  "resilience",
  "financialPerformance",
  "workingCapital",
  "operatingProfitability",
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
};

const BAND_COLORS: Record<Band, string> = {
  weak: "red",
  medium: "amber",
  good: "green",
};

type DataView = "profile" | "compare" | "raw";

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

function averageAxisScore(bundle: AxisBundle | undefined) {
  if (!bundle) return null;
  const scores = PERFORMANCE_AXIS_KEYS.map((key) => bundle.axes[key].score).filter(
    (score): score is number => score !== null,
  );
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
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
    const stored = window.localStorage.getItem("ips-financial-model-settings");
    if (stored) {
      const parsed = JSON.parse(stored) as ModelSettings;
      if (settingsAreValid(parsed)) return parsed;
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
  const XLSX = await import("xlsx");
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, {
    type: "array",
    cellDates: false,
    cellFormula: false,
    raw: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("فایل Excel فاقد شیت قابل خواندن است.");
  const sheet = workbook.Sheets[firstSheetName];
  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: 0,
    blankrows: false,
    raw: true,
  });
  const headers = (headerRows[0] ?? []).map((value) => String(value ?? "").trim());
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
    blankrows: false,
  });
  rows.forEach((row, rowIndex) => {
    headers.forEach((header, columnIndex) => {
      const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
      const cell = sheet[address];
      if (cell?.t === "e") row[header] = cell.w ?? "#ERROR!";
    });
  });
  if (!rows.length) throw new Error("در شیت اول فایل، رکوردی برای پردازش وجود ندارد.");
  return buildFinancialModel(rows, headers, file.name);
}

async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([
    [...REQUIRED_COLUMNS],
    [
      1,
      "تولیدی",
      "نام شرکت",
      1404,
      "حاشیه سود عملیاتی",
      501,
      "درصد",
      0.18,
      0.18,
      7.5,
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

function UploadScreen({
  model,
  busy,
  error,
  duplicateConfirmed,
  onDuplicateConfirmed,
  onFile,
  onEnter,
  onClear,
}: {
  model: FinancialModel | null;
  busy: boolean;
  error: string;
  duplicateConfirmed: boolean;
  onDuplicateConfirmed: (value: boolean) => void;
  onFile: (file: File) => void;
  onEnter: () => void;
  onClear: () => void;
}) {
  const blocking =
    !model ||
    model.missingColumns.length > 0 ||
    (model.duplicateCount > 0 && !duplicateConfirmed);
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
            فایل Excel را بارگذاری کنید و در سه ماژول یکپارچه، جایگاه مالی شرکت‌ها،
            امتیاز عملکرد و جزئیات داده‌های خام و مقایسه‌ای را بررسی کنید.
          </p>
          <div className="hero-proof">
            <span>
              <BarChart3 size={18} /> نقشه مالی
            </span>
            <span>
              <CircleGauge size={18} /> رادار عملکرد
            </span>
            <span>
              <Database size={18} /> مرکز داده
            </span>
          </div>
        </div>
        <div className="upload-panel">
          {!model ? (
            <FileDrop onFile={onFile} busy={busy} />
          ) : (
            <div className="file-ready">
              <div className="file-ready-header">
                <span className="file-icon">
                  <FileSpreadsheet size={24} />
                </span>
                <div>
                  <strong>{model.fileName}</strong>
                  <span>
                    {model.summary.totalRecords.toLocaleString("fa-IR")} رکورد ·{" "}
                    {model.summary.companies.toLocaleString("fa-IR")} شرکت
                  </span>
                </div>
                <button type="button" className="icon-button" onClick={onClear} aria-label="حذف فایل">
                  <X size={17} />
                </button>
              </div>
              <div className="mini-quality-grid">
                <QualityStat
                  icon={<Building2 size={17} />}
                  label="شرکت"
                  value={model.summary.companies.toLocaleString("fa-IR")}
                />
                <QualityStat
                  icon={<Database size={17} />}
                  label="متغیر"
                  value={model.summary.variables.toLocaleString("fa-IR")}
                />
                <QualityStat
                  icon={<FileCheck2 size={17} />}
                  label="پوشش نمره"
                  value={percent(model.summary.scoreCompleteness)}
                  tone={model.summary.scoreCompleteness > 0.45 ? "good" : "warning"}
                />
                <QualityStat
                  icon={<AlertTriangle size={17} />}
                  label="هشدار"
                  value={model.summary.warnings.toLocaleString("fa-IR")}
                  tone={model.summary.warnings ? "warning" : "good"}
                />
              </div>
              {model.missingColumns.length > 0 ? (
                <div className="validation-callout danger">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>ساختار فایل کامل نیست</strong>
                    <span>ستون‌های مفقود: {model.missingColumns.join("، ")}</span>
                  </div>
                </div>
              ) : (
                <div className="validation-callout success">
                  <Check size={18} />
                  <div>
                    <strong>ساختار فایل تأیید شد</strong>
                    <span>
                      {model.summary.imputedNatureRows
                        ? `ماهیت ${model.summary.imputedNatureRows.toLocaleString("fa-IR")} ردیف از ماهیت غالب شرکت تکمیل شد.`
                        : "تمام ستون‌های مورد انتظار شناسایی شدند."}
                    </span>
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
              <button type="button" className="primary-button wide" disabled={blocking} onClick={onEnter}>
                ورود به داشبورد
                <ArrowLeft size={18} />
              </button>
              <FileDrop onFile={onFile} busy={busy} compact />
            </div>
          )}
          {error && <div className="inline-error">{error}</div>}
        </div>
      </section>

      <section className="upload-steps">
        {[
          ["۰۱", "بارگذاری", "فایل اصلی بدون تغییر باقی می‌ماند."],
          ["۰۲", "کنترل کیفیت", "خطاها، کسری‌ها و تکرارها شناسایی می‌شوند."],
          ["۰۳", "تحلیل و امتیاز", "ماتریس‌های مالی و هشت محور عملکرد محاسبه می‌شوند."],
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
          </div>
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
              settings={settings}
              showAverage={showAverage && displayMode !== "trend"}
              showLabels={showLabels}
              showTrend={displayMode === "trend"}
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

function PerformancePage({
  model,
  matrix,
  settings,
  selectedCompany,
  setSelectedCompany,
  selectedYear,
  setSelectedYear,
}: {
  model: FinancialModel;
  matrix: Map<string, Map<number, AxisBundle>>;
  settings: ModelSettings;
  selectedCompany: string;
  setSelectedCompany: (value: string) => void;
  selectedYear: number;
  setSelectedYear: (value: number) => void;
}) {
  const [nature, setNature] = useState("همه");
  const [query, setQuery] = useState("");
  const [openAxis, setOpenAxis] = useState<AxisKey | null>(null);
  const bundle = matrix.get(selectedCompany)?.get(selectedYear);
  const ranking = model.companies
    .filter((company) => {
      const companyNature = model.natureByCompany.get(company) ?? "";
      return (nature === "همه" || companyNature === nature) && company.includes(query.trim());
    })
    .map((company) => {
      const companyBundle = matrix.get(company)?.get(selectedYear);
      const score = averageAxisScore(companyBundle);
      const coverage = companyBundle
        ? PERFORMANCE_AXIS_KEYS.reduce((sum, key) => sum + companyBundle.axes[key].coverage, 0) / PERFORMANCE_AXIS_KEYS.length
        : 0;
      return { company, bundle: companyBundle, score, coverage };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  if (!bundle) return <div className="empty-state"><AlertTriangle size={28} />برای شرکت و سال انتخاب‌شده امتیاز قابل نمایش وجود ندارد.</div>;

  const overallScore = averageAxisScore(bundle);
  const previousYear = [...model.years].filter((year) => year < selectedYear).sort((a, b) => b - a)[0];
  const previousScore = averageAxisScore(previousYear ? matrix.get(selectedCompany)?.get(previousYear) : undefined);
  const scoreDelta = overallScore !== null && previousScore !== null ? overallScore - previousScore : null;
  const selectedRank = ranking.findIndex((item) => item.company === selectedCompany) + 1;
  const axisOrder = PERFORMANCE_AXIS_KEYS.map((key) => bundle.axes[key]).filter((axis) => axis.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const averageCoverage = PERFORMANCE_AXIS_KEYS.reduce((sum, key) => sum + bundle.axes[key].coverage, 0) / PERFORMANCE_AXIS_KEYS.length;

  return (
    <div className="performance-page">
      <section className="page-title-row"><div><p className="eyebrow">ماژول دوم · رادار عملکرد</p><h2>ارزیابی امتیازی و رتبه‌بندی عملکرد مالی</h2><span>هشت محور عملکرد با قابلیت مشاهده فرمول، مؤلفه و پوشش داده.</span></div></section>
      <section className="filter-card compact"><div className="filter-grid">
        <SelectField label="شرکت" value={selectedCompany} onChange={setSelectedCompany} wide>{model.companies.map((company) => <option key={company} value={company}>{company}</option>)}</SelectField>
        <SelectField label="سال" value={selectedYear} onChange={(value) => setSelectedYear(Number(value))}>{[...model.years].reverse().map((year) => <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</option>)}</SelectField>
        <SelectField label="ماهیت" value={nature} onChange={setNature}><option value="همه">همه ماهیت‌ها</option>{model.natures.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <label className="search-field"><span>جست‌وجو در رتبه‌بندی</span><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام شرکت" /></div></label>
      </div></section>
      <section className="performance-summary">
        <article className={`performance-hero-score ${scoreBandClass(overallScore)}`}><span>میانگین هشت محور</span><div><strong>{formatNumber(overallScore, 2)}</strong><small>از ۱۰</small></div><span className={`performance-delta ${scoreDelta === null ? "neutral" : scoreDelta >= 0 ? "up" : "down"}`}>{scoreDelta === null ? "بدون مبنای سال قبل" : `${formatNumber(Math.abs(scoreDelta), 2)} ${scoreDelta >= 0 ? "بهبود" : "افت"}`}</span></article>
        <QualityStat icon={<Target size={18} />} label="رتبه در فیلتر جاری" value={selectedRank ? `${selectedRank.toLocaleString("fa-IR")} از ${ranking.length.toLocaleString("fa-IR")}` : "—"} />
        <QualityStat icon={<FileCheck2 size={18} />} label="میانگین پوشش محورها" value={percent(averageCoverage)} tone={averageCoverage >= settings.minimumCoverage ? "good" : "warning"} />
        <QualityStat icon={<TrendingUp size={18} />} label="قوی‌ترین محور" value={axisOrder[0]?.label ?? "—"} tone="good" />
        <QualityStat icon={<Target size={18} />} label="اولویت بهبود" value={axisOrder.at(-1)?.label ?? "—"} tone="warning" />
      </section>
      <section className="score-grid performance-score-grid">{PERFORMANCE_AXIS_KEYS.map((axisKey) => <ScoreCard key={axisKey} axis={bundle.axes[axisKey]} previous={previousComparableScore(matrix, selectedCompany, selectedYear, axisKey)} onOpen={() => setOpenAxis(axisKey)} />)}</section>
      <section className="table-card performance-table-card">
        <header><div><p className="eyebrow">رتبه‌بندی پرتفوی</p><h3>مقایسه امتیاز شرکت‌ها در سال {selectedYear.toLocaleString("fa-IR", { useGrouping: false })}</h3></div><span className="table-count">{ranking.length.toLocaleString("fa-IR")} شرکت</span></header>
        <div className="table-scroll performance-matrix"><table><thead><tr><th>رتبه</th><th>شرکت</th><th>ماهیت</th>{PERFORMANCE_AXIS_KEYS.map((key) => <th key={key}>{bundle.axes[key].label}</th>)}<th>میانگین</th><th>پوشش</th></tr></thead><tbody>
          {ranking.map((item, index) => <tr key={item.company} className={item.company === selectedCompany ? "selected-row" : ""} onClick={() => setSelectedCompany(item.company)}>
            <td>{(index + 1).toLocaleString("fa-IR")}</td><td><button type="button" className="company-link">{item.company}</button></td><td>{model.natureByCompany.get(item.company) ?? "—"}</td>
            {PERFORMANCE_AXIS_KEYS.map((key) => { const score = item.bundle?.axes[key].score ?? null; return <td key={key}><span className={`score-cell ${scoreBandClass(score)}`}>{formatNumber(score, 1)}</span></td>; })}
            <td><strong>{formatNumber(item.score, 2)}</strong></td><td>{percent(item.coverage)}</td>
          </tr>)}
        </tbody></table></div>
      </section>
      <CalculationDetails axes={bundle.axes} openAxis={openAxis} onClose={() => setOpenAxis(null)} />
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
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

function recordToExportRow(record: FinancialRecord) {
  return { شرکت: record.company, ماهیت: record.nature, سال: record.year, دسته: dataCategory(record.variable), متغیر: record.variable, "کد متغیر": record.code, واحد: record.unit, مقدار: record.value, "تبدیل به شاخص": record.indexedValue, نمره: record.score };
}

function DataCenterPage({
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
  const [view, setView] = useState<DataView>("profile");
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

function downloadIssues(model: FinancialModel) {
  const rows = [
    ["نوع", "شدت", "شرکت", "سال", "متغیر", "ردیف", "شرح"],
    ...model.issues.map((issue) => [
      ISSUE_LABELS[issue.type],
      issue.severity,
      issue.company ?? "",
      issue.year ?? "",
      issue.variable ?? "",
      issue.row ?? "",
      issue.message,
    ]),
  ];
  const csv = rows
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "گزارش-کیفیت-داده.csv";
  anchor.click();
  URL.revokeObjectURL(url);
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
          دانلود گزارش خطا
        </button>
      </section>
      <section className="quality-overview">
        <QualityStat icon={<Building2 size={18} />} label="تعداد شرکت‌ها" value={model.summary.companies.toLocaleString("fa-IR")} />
        <QualityStat icon={<PanelTop size={18} />} label="تعداد سال‌ها" value={model.summary.years.toLocaleString("fa-IR")} />
        <QualityStat icon={<Database size={18} />} label="تعداد رکوردها" value={model.summary.totalRecords.toLocaleString("fa-IR")} />
        <QualityStat icon={<Layers3 size={18} />} label="تعداد متغیرها" value={model.summary.variables.toLocaleString("fa-IR")} />
        <QualityStat
          icon={<FileCheck2 size={18} />}
          label="درصد نمرات موجود"
          value={percent(model.summary.scoreCompleteness)}
          tone={model.summary.scoreCompleteness > 0.45 ? "good" : "warning"}
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
          <h2>وزن‌ها، مرزها و حداقل پوشش داده</h2>
          <span>تغییرات فقط پس از تأیید و برابر بودن مجموع هر گروه با ۱۰۰٪ اعمال می‌شود.</span>
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
          <article>
            <header>
              <ShieldCheck size={18} />
              <h3>قاعده پایداری OCF</h3>
            </header>
            <p>
              سه سال: ۱۰ منهای دو برابر انحراف معیار. دو سال: ۱۰ منهای اختلاف مطلق.
              یک سال: حذف مؤلفه و بازتوزیع وزن.
            </p>
          </article>
          <article>
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

async function exportAxisWorkbook(
  model: FinancialModel,
  matrix: Map<string, Map<number, AxisBundle>>,
) {
  const XLSX = await import("xlsx");
  const rows = model.companies.flatMap((company) =>
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
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "امتیاز محورها");
  XLSX.writeFile(workbook, "امتیازهای-محوری-پرتفوی.xlsx");
}

export default function DashboardApp() {
  const [model, setModel] = useState<FinancialModel | null>(null);
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [tab, setTab] = useState<AppTab>("analysis");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState(0);
  const [natureFilter, setNatureFilter] = useState("همه");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("trend");
  const [bubbleMetric, setBubbleMetric] = useState<BubbleMetric>("none");
  const [showAverage, setShowAverage] = useState(DEFAULT_SETTINGS.showAverage);
  const [showLabels, setShowLabels] = useState(DEFAULT_SETTINGS.showLabels);
  const [settings, setSettings] = useState<ModelSettings>(loadStoredSettings);
  const [exportingImage, setExportingImage] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const matrix = useMemo(
    () => (model ? buildAxisMatrix(model, settings) : new Map<string, Map<number, AxisBundle>>()),
    [model, settings],
  );

  async function handleFile(file: File) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError("فرمت فایل پشتیبانی نمی‌شود. فایل XLSX، XLS یا CSV انتخاب کنید.");
      return;
    }
    setBusy(true);
    setError("");
    setEntered(false);
    setDuplicateConfirmed(false);
    try {
      const parsed = await parseExcelFile(file);
      setModel(parsed);
      const preferred = parsed.companies.includes("فولاد متیل")
        ? "فولاد متیل"
        : parsed.companies[0] ?? "";
      setSelectedCompany(preferred);
      setSelectedYear(parsed.years.at(-1) ?? 0);
      setNatureFilter("همه");
    } catch (reason) {
      setModel(null);
      setError(reason instanceof Error ? reason.message : "فایل قابل پردازش نبود.");
    } finally {
      setBusy(false);
    }
  }

  function saveSettings(next: ModelSettings) {
    const normalized = { ...next, showAverage, showLabels };
    setSettings(normalized);
    localStorage.setItem("ips-financial-model-settings", JSON.stringify(normalized));
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
        model={model}
        busy={busy}
        error={error}
        duplicateConfirmed={duplicateConfirmed}
        onDuplicateConfirmed={setDuplicateConfirmed}
        onFile={handleFile}
        onEnter={() => setEntered(true)}
        onClear={() => {
          setModel(null);
          setError("");
        }}
      />
    );
  }

  const navItems: { key: AppTab; label: string; icon: React.ReactNode }[] = [
    { key: "analysis", label: "نقشه مالی", icon: <BarChart3 size={18} /> },
    { key: "performance", label: "رادار عملکرد", icon: <CircleGauge size={18} /> },
    { key: "data", label: "مرکز داده", icon: <Database size={18} /> },
  ];

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
            <strong>سامانه تحلیل عملکرد مالی</strong>
            <span>شرکت‌های زیرمجموعه · IPS Finance</span>
          </div>
        </div>
        <nav className={mobileMenu ? "open" : ""}>
          {navItems.map((item) => (
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
          ))}
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
            <button type="button" className={`icon-button ${tab === "quality" ? "active" : ""}`} onClick={() => setTab("quality")} aria-label="کیفیت داده" title="کیفیت داده"><ClipboardCheck size={17} /></button>
            <button type="button" className={`icon-button ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")} aria-label="تنظیمات مدل" title="تنظیمات مدل"><Settings2 size={17} /></button>
          </div>
          <FileDrop onFile={handleFile} busy={busy} compact />
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
              <button type="button" onClick={() => exportAxisWorkbook(model, matrix)}>
                <FileSpreadsheet size={16} /> جدول Excel محورها
              </button>
              {tab === "analysis" && <button type="button" onClick={exportReportImage} disabled={exportingImage}>{exportingImage ? <LoaderCircle className="spin" size={16} /> : <ImageDown size={16} />}تصویر نقشه مالی</button>}
            </div>
          </div>
        </div>
      </header>

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
            reportRef={reportRef}
          />
        )}
        {tab === "performance" && (
          <PerformancePage
            model={model}
            matrix={matrix}
            settings={settings}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
        )}
        {tab === "data" && <DataCenterPage model={model} selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
        {tab === "quality" && <QualityPage model={model} />}
        {tab === "settings" && <SettingsPage settings={settings} onSave={saveSettings} />}
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
