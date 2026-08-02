"use client";

import { useMemo, useState, type CSSProperties } from "react";
import * as XLSX from "xlsx";
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  BarChart3,
  CircleHelp,
  Download,
  Info,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { FinancialModel } from "@/lib/financial-engine";
import {
  BASE_RANKING_WEIGHTS,
  RANKING_METRICS,
  RANKING_SCENARIOS,
  blendScenarioWeights,
  buildDynamicRanking,
  buildRankingNarrative,
  rankingWeightTotal,
  redistributeRankingWeight,
  scoreCompanyYear,
  type DynamicRankingRow,
  type RankingMetricKey,
  type RankingScenarioKey,
  type RankingWeights,
} from "@/lib/dynamic-ranking-engine";

type ActiveScenario = RankingScenarioKey | "custom";

interface DynamicRankingProps {
  model: FinancialModel;
  selectedCompany: string;
  setSelectedCompany: (value: string) => void;
  selectedYear: number;
  setSelectedYear: (value: number) => void;
}

function faNumber(value: number, digits = 2) {
  return value.toLocaleString("fa-IR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function scoreText(value: number | null, digits = 2) {
  return value === null ? "—" : faNumber(value, digits);
}

function percentage(value: number, digits = 0) {
  return value.toLocaleString("fa-IR", {
    style: "percent",
    maximumFractionDigits: digits,
  });
}

function rankChangeFor(
  row: DynamicRankingRow,
  baselineByCompany: Map<string, DynamicRankingRow>,
) {
  const baseline = baselineByCompany.get(row.company);
  if (!baseline?.overallRank || !row.overallRank) return null;
  return baseline.overallRank - row.overallRank;
}

function ChangeBadge({ change, compact = false }: { change: number | null; compact?: boolean }) {
  if (change === null) return <span className={`rank-change neutral ${compact ? "compact" : ""}`}>—</span>;
  if (change > 0) {
    return <span className={`rank-change up ${compact ? "compact" : ""}`}><ArrowUp size={13} />{change.toLocaleString("fa-IR")}</span>;
  }
  if (change < 0) {
    return <span className={`rank-change down ${compact ? "compact" : ""}`}><ArrowDown size={13} />{Math.abs(change).toLocaleString("fa-IR")}</span>;
  }
  return <span className={`rank-change neutral ${compact ? "compact" : ""}`}>بدون تغییر</span>;
}

function WeightDonut({ weights }: { weights: RankingWeights }) {
  const { segments } = RANKING_METRICS.reduce(
    (result, metric) => {
      const start = result.cursor;
      const end = start + weights[metric.key] * 100;
      return {
        cursor: end,
        segments: [...result.segments, `${metric.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`],
      };
    },
    { cursor: 0, segments: [] as string[] },
  );
  return (
    <div className="weight-donut-wrap">
      <div className="weight-donut" style={{ background: `conic-gradient(${segments.join(", ")})` }}>
        <div><strong>{percentage(rankingWeightTotal(weights))}</strong><span>جمع وزن</span></div>
      </div>
      <div className="weight-legend">
        {RANKING_METRICS.map((metric) => (
          <span key={metric.key}><i style={{ background: metric.color }} />{metric.shortLabel}<b>{percentage(weights[metric.key])}</b></span>
        ))}
      </div>
    </div>
  );
}

function ScoreTrend({ rows }: { rows: DynamicRankingRow[] }) {
  const width = 720;
  const height = 270;
  const plot = { left: 48, right: 690, top: 28, bottom: 218 };
  const valid = rows.filter((row) => row.score !== null);
  if (!valid.length) return <div className="dynamic-chart-empty"><TrendingUp size={23} />برای این شرکت امتیاز سالانه قابل ترسیم نیست.</div>;
  const x = (index: number) => rows.length === 1
    ? (plot.left + plot.right) / 2
    : plot.left + (index / (rows.length - 1)) * (plot.right - plot.left);
  const y = (score: number) => plot.bottom - (score / 10) * (plot.bottom - plot.top);
  const points = rows.map((row, index) => row.score === null ? null : `${x(index)},${y(row.score)}`);
  const segments: string[][] = [];
  let current: string[] = [];
  points.forEach((point) => {
    if (point) current.push(point);
    else if (current.length) { segments.push(current); current = []; }
  });
  if (current.length) segments.push(current);
  return (
    <svg className="dynamic-trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="روند امتیاز سالانه شرکت منتخب">
      <defs>
        <linearGradient id="rankTrendArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2563eb" stopOpacity=".22" />
          <stop offset="1" stopColor="#2563eb" stopOpacity=".01" />
        </linearGradient>
      </defs>
      {[0, 2.5, 5, 7.5, 10].map((tick) => (
        <g key={tick}>
          <line x1={plot.left} x2={plot.right} y1={y(tick)} y2={y(tick)} stroke="#e5eaf1" strokeDasharray="4 6" />
          <text x={plot.left - 13} y={y(tick) + 4} textAnchor="middle">{tick.toLocaleString("fa-IR")}</text>
        </g>
      ))}
      {segments.map((segment, index) => (
        <polyline key={index} points={segment.join(" ")} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {rows.map((row, index) => (
        <g key={row.year}>
          <text x={x(index)} y={plot.bottom + 32} textAnchor="middle">{row.year.toLocaleString("fa-IR", { useGrouping: false })}</text>
          {row.score !== null && (
            <g>
              <circle cx={x(index)} cy={y(row.score)} r="7" fill="#fff" stroke="#2563eb" strokeWidth="4"><title>{`${row.year}: ${faNumber(row.score)}`}</title></circle>
              <text className="trend-point-label" x={x(index)} y={y(row.score) - 14} textAnchor="middle">{faNumber(row.score, 1)}</text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

function MetricRadar({ row }: { row: DynamicRankingRow }) {
  const center = { x: 180, y: 150 };
  const radius = 104;
  const angleFor = (index: number) => -Math.PI / 2 + (index / RANKING_METRICS.length) * Math.PI * 2;
  const point = (index: number, scale: number) => ({
    x: center.x + Math.cos(angleFor(index)) * radius * scale,
    y: center.y + Math.sin(angleFor(index)) * radius * scale,
  });
  const scorePoints = RANKING_METRICS.map((metric, index) => {
    const score = row.metrics[metric.key].score ?? 0;
    const p = point(index, score / 10);
    return `${p.x},${p.y}`;
  }).join(" ");
  return (
    <svg className="metric-radar" viewBox="0 0 360 325" role="img" aria-label="نمای شش‌بُعدی شرکت منتخب">
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon key={scale} points={RANKING_METRICS.map((_, index) => { const p = point(index, scale); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="#dce3ed" />
      ))}
      {RANKING_METRICS.map((metric, index) => {
        const end = point(index, 1);
        const label = point(index, 1.29);
        return (
          <g key={metric.key}>
            <line x1={center.x} y1={center.y} x2={end.x} y2={end.y} stroke="#e2e8f0" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">{metric.shortLabel}</text>
          </g>
        );
      })}
      <polygon points={scorePoints} fill="rgba(37, 99, 235, .18)" stroke="#2563eb" strokeWidth="3" />
      {RANKING_METRICS.map((metric, index) => {
        const score = row.metrics[metric.key].score;
        const p = point(index, (score ?? 0) / 10);
        return <circle key={metric.key} cx={p.x} cy={p.y} r="4.5" fill={metric.color}><title>{`${metric.label}: ${scoreText(score)}`}</title></circle>;
      })}
    </svg>
  );
}

function RankingBars({
  rows,
  selectedCompany,
  onSelect,
}: {
  rows: DynamicRankingRow[];
  selectedCompany: string;
  onSelect: (company: string) => void;
}) {
  const top = rows.filter((row) => row.overallRank !== null).slice(0, 10);
  if (!top.length) {
    return <div className="dynamic-chart-empty"><BarChart3 size={23} />در این سال شرکتی با پوشش رسمی ۷۵٪ وجود ندارد.</div>;
  }
  return (
    <div className="dynamic-ranking-bars">
      {top.map((row) => (
        <button type="button" key={row.company} className={row.company === selectedCompany ? "active" : ""} onClick={() => onSelect(row.company)}>
          <span className="bar-rank">{row.overallRank?.toLocaleString("fa-IR")}</span>
          <span className="bar-company">{row.company}</span>
          <span className="bar-track"><i style={{ width: `${Math.max(2, (row.score ?? 0) * 10)}%` }} /></span>
          <strong>{scoreText(row.score)}</strong>
        </button>
      ))}
    </div>
  );
}

export default function DynamicRankingPage({
  model,
  selectedCompany,
  setSelectedCompany,
  selectedYear,
  setSelectedYear,
}: DynamicRankingProps) {
  const [weights, setWeights] = useState<RankingWeights>({ ...BASE_RANKING_WEIGHTS });
  const [activeScenario, setActiveScenario] = useState<ActiveScenario>("balanced");
  const [intensity, setIntensity] = useState(0);
  const [nature, setNature] = useState("همه");
  const [query, setQuery] = useState("");

  const currentRows = useMemo(
    () => buildDynamicRanking(model, selectedYear, weights),
    [model, selectedYear, weights],
  );
  const baselineRows = useMemo(
    () => buildDynamicRanking(model, selectedYear, BASE_RANKING_WEIGHTS),
    [model, selectedYear],
  );
  const baselineByCompany = useMemo(
    () => new Map(baselineRows.map((row) => [row.company, row])),
    [baselineRows],
  );
  const selectedRow = currentRows.find((row) => row.company === selectedCompany) ?? currentRows[0];
  const selectedBaseline = selectedRow ? baselineByCompany.get(selectedRow.company) : undefined;
  const selectedRankChange = selectedRow ? rankChangeFor(selectedRow, baselineByCompany) : null;
  const filteredRows = currentRows.filter((row) =>
    (nature === "همه" || row.nature === nature) && row.company.includes(query.trim()),
  );
  const activeCompany = selectedRow?.company ?? selectedCompany;
  const companyHistory = useMemo(
    () => model.years.map((year) => scoreCompanyYear(model, activeCompany, year, weights)),
    [model, activeCompany, weights],
  );
  const availableMetrics = selectedRow
    ? RANKING_METRICS.map((metric) => selectedRow.metrics[metric.key]).filter((metric) => metric.score !== null)
    : [];
  const strengths = [...availableMetrics].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, 2);
  const weaknesses = [...availableMetrics].sort((a, b) => (a.score ?? 11) - (b.score ?? 11)).slice(0, 2);
  const narrative = selectedRow
    ? buildRankingNarrative(selectedRow, selectedBaseline, weights)
    : "داده‌ای برای تحلیل وجود ندارد.";
  const scenarioLabel = activeScenario === "custom" ? "سفارشی" : RANKING_SCENARIOS[activeScenario].label;
  const officialCount = currentRows.filter((row) => row.validity === "valid").length;
  const temporaryCount = currentRows.filter((row) => row.validity === "temporary").length;
  const insufficientCount = currentRows.length - officialCount - temporaryCount;
  const filteredOfficialCount = filteredRows.filter((row) => row.validity === "valid").length;
  const filtersActive = nature !== "همه" || Boolean(query.trim());
  const missingIndicatorCodes = selectedRow
    ? [...new Set(RANKING_METRICS.flatMap((metric) =>
        selectedRow.metrics[metric.key].indicators
          .filter((indicator) => indicator.score === null)
          .map((indicator) => indicator.code),
      ))]
    : [];

  function applyScenario(key: RankingScenarioKey) {
    const nextIntensity = key === "balanced" ? 0 : 1;
    setActiveScenario(key);
    setIntensity(nextIntensity);
    setWeights(blendScenarioWeights(key, nextIntensity));
  }

  function changeIntensity(next: number) {
    if (activeScenario === "custom") return;
    setIntensity(next);
    setWeights(blendScenarioWeights(activeScenario, next));
  }

  function changeMetricWeight(key: RankingMetricKey, nextWeight: number) {
    setActiveScenario("custom");
    setWeights((current) => redistributeRankingWeight(current, key, nextWeight));
  }

  function resetWeights() {
    setActiveScenario("balanced");
    setIntensity(0);
    setWeights({ ...BASE_RANKING_WEIGHTS });
  }

  function exportRanking() {
    const rows = currentRows.map((row) => ({
      "رتبه سفارشی": row.overallRank,
      "رتبه پایه": row.baseRank,
      شرکت: row.company,
      ماهیت: row.nature,
      سال: row.year,
      "امتیاز سالانه پایه": row.baseScore,
      "امتیاز سالانه سفارشی": row.score,
      "امتیاز پایدار سه‌ساله": row.threeYearScore,
      "روش سابقه": row.historyLabel,
      "اعتبار امتیاز": row.validityLabel,
      "تغییر رتبه": rankChangeFor(row, baselineByCompany),
      وضعیت: row.statusLabel,
      "پوشش داده": row.coverage,
      ...Object.fromEntries(RANKING_METRICS.map((metric) => [metric.label, row.metrics[metric.key].score])),
    }));
    const weightRows = RANKING_METRICS.map((metric) => ({
      "کدهای متغیر": metric.code,
      بُعد: metric.label,
      "وزن پایه": metric.baseWeight,
      "وزن فعال": weights[metric.key],
      سناریو: scenarioLabel,
      "شدت سناریو": activeScenario === "custom" ? "سفارشی" : intensity,
    }));
    const indicatorRows = currentRows.flatMap((row) =>
      RANKING_METRICS.flatMap((metric) =>
        row.metrics[metric.key].indicators.map((indicator) => ({
          شرکت: row.company,
          ماهیت: row.nature,
          سال: row.year,
          بُعد: metric.label,
          "کد متغیر": indicator.code,
          شاخص: indicator.label,
          امتیاز: indicator.score,
          "وزن داخلی": indicator.weight,
          "وزن مؤثر داخلی": indicator.effectiveWeight,
          سهم: indicator.contribution,
          وضعیت: indicator.issue ?? "معتبر",
        })),
      ),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "رتبه‌بندی");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(weightRows), "وزن ابعاد");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(indicatorRows), "جزئیات ۱۳ شاخص");
    XLSX.writeFile(workbook, `رتبه-نمای-عملکرد-${selectedYear}.xlsx`);
  }

  return (
    <div className="dynamic-ranking-page">
      <section className="dynamic-ranking-heading">
        <div>
          <p className="eyebrow">ماژول دوم · رتبه‌نمای عملکرد</p>
          <h2>رتبه‌بندی پویا بر پایه مدل شش‌بُعدی مالی</h2>
          <span>وزن شش بُعد را تغییر دهید و اثر آن را همان لحظه بر امتیاز، رتبه، نمودارها و تحلیل مدیریتی ببینید.</span>
        </div>
        <div className="ranking-heading-actions">
          <details className="ranking-method-help">
            <summary><CircleHelp size={17} />روش محاسبه</summary>
            <div>
              <strong>فرمول امتیاز نهایی</strong>
              <p>ابتدا ۱۳ امتیاز نرمال‌شده، شش بُعد را می‌سازند؛ سپس امتیاز سالانه از مجموع امتیاز ابعاد × وزن فعال محاسبه می‌شود.</p>
              <span>حداقل پوشش داخلی هر بُعد ۶۰٪ است. پوشش کل ۷۵٪ به بالا معتبر، ۶۰٪ تا کمتر از ۷۵٪ موقت و کمتر از ۶۰٪ فاقد امتیاز و رتبه رسمی است. داده خالی هرگز صفر فرض نمی‌شود.</span>
            </div>
          </details>
          <button type="button" className="outline-button" onClick={exportRanking}><Download size={16} />خروجی Excel</button>
        </div>
      </section>

      <section className="dynamic-ranking-filter-card">
        <label><span>شرکت منتخب</span><select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}>{model.companies.map((company) => <option key={company}>{company}</option>)}</select></label>
        <label><span>سال مالی</span><select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{[...model.years].reverse().map((year) => <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</option>)}</select></label>
        <label><span>ماهیت / صنعت</span><select value={nature} onChange={(event) => setNature(event.target.value)}><option value="همه">همه شرکت‌ها</option>{model.natures.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="ranking-search"><span>جست‌وجو در رتبه‌بندی</span><div><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام شرکت" /></div></label>
        <div className="ranking-filter-summary">
          <span><b>{currentRows.length.toLocaleString("fa-IR")}</b> شرکت از فایل خوانده شد</span>
          <span className="official"><b>{officialCount.toLocaleString("fa-IR")}</b> رتبه رسمی</span>
          <span className="temporary"><b>{temporaryCount.toLocaleString("fa-IR")}</b> امتیاز موقت</span>
          <span><b>{insufficientCount.toLocaleString("fa-IR")}</b> پوشش ناکافی</span>
          {filtersActive && <button type="button" onClick={() => { setNature("همه"); setQuery(""); }}><RotateCcw size={13} />پاک‌کردن فیلتر</button>}
        </div>
      </section>

      {selectedRow && (
        <section className={`dynamic-kpi-hero ${selectedRow.status}`} aria-live="polite">
          <article className="main-score-card">
            <span>امتیاز نهایی</span>
            <strong>{scoreText(selectedRow.score)}</strong>
            <small>از ۱۰ · پوشش {percentage(selectedRow.coverage)}</small>
            <div className="score-progress"><i style={{ width: `${(selectedRow.score ?? 0) * 10}%` }} /></div>
          </article>
          <article><span>رتبه گروه سازگار</span><strong>{selectedRow.overallRank?.toLocaleString("fa-IR") ?? "—"}</strong><small>از {selectedRow.totalRanked.toLocaleString("fa-IR")} شرکت مالی/غیرمالی هم‌گروه</small></article>
          <article><span>رتبه هم‌ماهیت</span><strong>{selectedRow.peerRank?.toLocaleString("fa-IR") ?? "—"}</strong><small>از {selectedRow.peerRanked.toLocaleString("fa-IR")} شرکت</small></article>
          <article><span>اثر سناریو بر رتبه</span><strong><ChangeBadge change={selectedRankChange} /></strong><small>نسبت به وزن‌های متوازن</small></article>
          <article><span>وضعیت مالی</span><strong className={`status-text ${selectedRow.status}`}>{selectedRow.statusLabel}</strong><small>{selectedRow.validityLabel}</small></article>
          <article><span>امتیاز پایدار سه‌ساله</span><strong>{scoreText(selectedRow.threeYearScore)}</strong><small>{selectedRow.historyLabel}</small></article>
        </section>
      )}

      {selectedRow && selectedRow.validity !== "valid" && (
        <section className={`ranking-coverage-callout ${selectedRow.validity}`} aria-live="polite">
          <AlertTriangle size={20} />
          <div>
            <strong>{selectedRow.validity === "temporary" ? "شرکت کامل خوانده شده، اما رتبه هنوز رسمی نیست" : "شرکت کامل خوانده شده، اما داده لازم برای امتیاز کافی نیست"}</strong>
            <p>
              پوشش فعلی {percentage(selectedRow.coverage)} است؛ حداقل پوشش رتبه رسمی ۷۵٪ است.
              {missingIndicatorCodes.length > 0 && ` امتیاز کدهای ${missingIndicatorCodes.join("، ")} در سال ${selectedYear.toLocaleString("fa-IR", { useGrouping: false })} موجود نیست یا معتبر نیست.`}
            </p>
          </div>
        </section>
      )}

      <section className="dynamic-weight-panel">
        <header>
          <div><p className="eyebrow">موتور سناریوسازی</p><h3>وزن‌دهی گرافیکی و زنده</h3><span>با تغییر هر وزن، سایر وزن‌ها به‌صورت نسبی تنظیم می‌شوند تا جمع همیشه ۱۰۰٪ بماند.</span></div>
          <button type="button" className="text-button" onClick={resetWeights}><RotateCcw size={15} />بازگشت به حالت متوازن</button>
        </header>
        <div className="scenario-pills" role="tablist" aria-label="سناریوهای آماده رتبه‌بندی">
          {(Object.keys(RANKING_SCENARIOS) as RankingScenarioKey[]).map((key) => (
            <button type="button" role="tab" aria-selected={activeScenario === key} className={activeScenario === key ? "active" : ""} key={key} onClick={() => applyScenario(key)}>{RANKING_SCENARIOS[key].label}</button>
          ))}
          {activeScenario === "custom" && <button type="button" className="active custom" aria-current="true">سفارشی</button>}
        </div>
        <div className="weight-panel-grid">
          <div className="weight-sliders">
            {RANKING_METRICS.map((metric) => (
              <div className="metric-weight-row" key={metric.key} style={{ "--metric-color": metric.color } as CSSProperties}>
                <div className="metric-weight-name"><i /><span><strong>{metric.shortLabel}</strong><small>{metric.label} · کد {metric.code}</small></span></div>
                <button type="button" aria-label={`کاهش وزن ${metric.shortLabel}`} onClick={() => changeMetricWeight(metric.key, weights[metric.key] - 0.01)}><Minus size={14} /></button>
                <input type="range" min="5" max="40" step="1" value={Math.round(weights[metric.key] * 100)} onChange={(event) => changeMetricWeight(metric.key, Number(event.target.value) / 100)} aria-label={`وزن ${metric.shortLabel}`} />
                <button type="button" aria-label={`افزایش وزن ${metric.shortLabel}`} onClick={() => changeMetricWeight(metric.key, weights[metric.key] + 0.01)}><Plus size={14} /></button>
                <output>{percentage(weights[metric.key])}</output>
              </div>
            ))}
          </div>
          <aside className="weight-visual-card">
            <WeightDonut weights={weights} />
            {activeScenario !== "custom" && activeScenario !== "balanced" && (
              <label className="scenario-intensity">
                <span><b>شدت سناریو</b><strong>{percentage(intensity)}</strong></span>
                <input type="range" min="0" max="100" step="5" value={Math.round(intensity * 100)} onChange={(event) => changeIntensity(Number(event.target.value) / 100)} />
                <small>۰٪ = متوازن · ۱۰۰٪ = سناریوی کامل</small>
              </label>
            )}
            <div className="active-scenario-note"><Target size={18} /><div><strong>{scenarioLabel}</strong><span>{activeScenario === "custom" ? "ترکیب وزن‌ها به‌صورت دستی تنظیم شده است." : RANKING_SCENARIOS[activeScenario].description}</span></div></div>
          </aside>
        </div>
      </section>

      {selectedRow && (
        <section className="dynamic-insight-banner" aria-live="polite">
          <span><Sparkles size={19} /></span>
          <div><strong>برداشت مدیریتی از تغییر وزن‌ها</strong><p>{narrative}</p></div>
        </section>
      )}

      <section className="dynamic-chart-grid">
        <article className="dynamic-chart-card wide"><header><div><p className="eyebrow">روند سالانه</p><h3>امتیاز شرکت منتخب در طول زمان</h3></div><TrendingUp size={18} /></header><ScoreTrend rows={companyHistory} /></article>
        <article className="dynamic-chart-card"><header><div><p className="eyebrow">مقایسه پرتفوی</p><h3>ده شرکت نخست</h3></div><BarChart3 size={18} /></header><RankingBars rows={currentRows} selectedCompany={selectedCompany} onSelect={setSelectedCompany} /></article>
        {selectedRow && <article className="dynamic-chart-card"><header><div><p className="eyebrow">پروفایل چندبعدی</p><h3>شش بُعد شرکت منتخب</h3></div><Target size={18} /></header><MetricRadar row={selectedRow} /></article>}
      </section>

      {selectedRow && (
        <section className="company-ranking-detail">
          <article className="metric-contribution-card">
            <header><div><p className="eyebrow">جزئیات قابل حسابرسی</p><h3>امتیاز، وزن و سهم هر بُعد</h3></div><Info size={18} /></header>
            <div className="metric-contribution-list">
              {RANKING_METRICS.map((metric) => {
                const result = selectedRow.metrics[metric.key];
                return (
                  <div key={metric.key}>
                    <i style={{ background: metric.color }} />
                    <span><strong>{metric.label}</strong><small>کدهای {metric.code} · پوشش {percentage(result.coverage)}</small></span>
                    <b className={`metric-score-chip ${result.score === null ? "empty" : result.score >= 7 ? "good" : result.score >= 4 ? "medium" : "weak"}`}>{scoreText(result.score)}</b>
                    <span className="metric-weight-value">وزن {percentage(result.configuredWeight)}</span>
                    <span className="metric-contribution-value">سهم {scoreText(result.score === null ? null : result.contribution)}</span>
                  </div>
                );
              })}
            </div>
          </article>
          <aside className="strength-weakness-card">
            <header><p className="eyebrow">تشخیص سریع</p><h3>نقاط قوت و زمینه‌های بهبود</h3></header>
            <div className="strength-block"><span><ShieldCheck size={17} />نقاط قوت</span>{strengths.map((metric) => <p key={metric.key}><b>{metric.shortLabel}</b><strong>{scoreText(metric.score)}</strong></p>)}</div>
            <div className="weakness-block"><span><CircleHelp size={17} />زمینه‌های بهبود</span>{weaknesses.map((metric) => <p key={metric.key}><b>{metric.shortLabel}</b><strong>{scoreText(metric.score)}</strong></p>)}</div>
          </aside>
        </section>
      )}

      <section className="dynamic-ranking-table-card">
        <header><div><p className="eyebrow">رتبه‌بندی پویا</p><h3>اثر وزن‌های فعال بر جایگاه شرکت‌ها</h3></div><div className="ranking-table-counts"><span>{filteredRows.length.toLocaleString("fa-IR")} شرکت نمایش داده شده</span><span className="official">{filteredOfficialCount.toLocaleString("fa-IR")} رتبه رسمی</span></div></header>
        <div className="table-scroll">
          <table>
            <thead><tr><th>رتبه</th><th>شرکت</th><th>امتیاز</th><th>رتبه پایه</th><th>تغییر</th>{RANKING_METRICS.map((metric) => <th key={metric.key} title={metric.label}>{metric.shortLabel}</th>)}<th>وضعیت</th><th>اعتبار</th><th>پوشش</th></tr></thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.company} className={row.company === selectedCompany ? "selected-row" : ""} onClick={() => setSelectedCompany(row.company)}>
                  <td><strong>{row.overallRank?.toLocaleString("fa-IR") ?? "—"}</strong></td>
                  <td><button type="button" className="company-link">{row.company}</button><small>{row.nature}</small></td>
                  <td><b>{scoreText(row.score)}</b></td>
                  <td>{baselineByCompany.get(row.company)?.overallRank?.toLocaleString("fa-IR") ?? "—"}</td>
                  <td><ChangeBadge change={rankChangeFor(row, baselineByCompany)} compact /></td>
                  {RANKING_METRICS.map((metric) => {
                    const score = row.metrics[metric.key].score;
                    return <td key={metric.key}><span className={`heat-score ${score === null ? "empty" : score >= 7 ? "good" : score >= 4 ? "medium" : "weak"}`}>{scoreText(score, 1)}</span></td>;
                  })}
                  <td><span className={`dynamic-status ${row.status}`}>{row.statusLabel}</span></td>
                  <td><span className={`score-validity ${row.validity}`}>{row.validityLabel}</span></td>
                  <td>{percentage(row.coverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
