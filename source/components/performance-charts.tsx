"use client";

import { formatNumber } from "@/lib/financial-engine";
import {
  PERFORMANCE_DIMENSION_KEYS,
  type PerformanceDimensionKey,
  type PerformanceResult,
} from "@/lib/performance-engine";

const DIMENSION_COLORS: Record<PerformanceDimensionKey, string> = {
  profitability: "#0f766e",
  cashQuality: "#0284c7",
  capitalReturn: "#1d4ed8",
  growth: "#7c3aed",
  resilience: "#0f4c81",
  workingCapital: "#d97706",
};

function points(values: number[], width: number, height: number, padding = 8) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  return values
    .map((value, index) => {
      const x =
        padding +
        (values.length <= 1 ? (width - padding * 2) / 2 : (index / (values.length - 1)) * (width - padding * 2));
      const y = padding + ((max - value) / spread) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function MiniSparkline({
  values,
  tone = "#1d4ed8",
}: {
  values: number[];
  tone?: string;
}) {
  if (!values.length) return <span className="sparkline-empty">—</span>;
  return (
    <svg className="mini-sparkline" viewBox="0 0 118 38" role="img" aria-label="روند سه‌ساله">
      <polyline
        points={points(values, 118, 38, 5)}
        fill="none"
        stroke={tone}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points(values, 118, 38, 5)
        .split(" ")
        .map((point, index) => {
          const [cx, cy] = point.split(",");
          return <circle key={`${point}-${index}`} cx={cx} cy={cy} r="3.2" fill="#fff" stroke={tone} strokeWidth="2" />;
        })}
    </svg>
  );
}

export function ScoreGauge({ score }: { score: number | null }) {
  const safe = Math.max(0, Math.min(10, score ?? 0));
  const angle = -90 + safe * 18;
  const radian = (angle * Math.PI) / 180;
  const cx = 120;
  const cy = 112;
  const needleX = cx + Math.cos(radian) * 58;
  const needleY = cy + Math.sin(radian) * 58;
  return (
    <div className="score-gauge">
      <svg viewBox="0 0 240 142" role="img" aria-label={`امتیاز نهایی ${formatNumber(score, 2)} از ۱۰`}>
        <path d="M 40 112 A 80 80 0 0 1 80 42" className="gauge-arc critical" />
        <path d="M 80 42 A 80 80 0 0 1 130 33" className="gauge-arc weak" />
        <path d="M 130 33 A 80 80 0 0 1 177 57" className="gauge-arc average" />
        <path d="M 177 57 A 80 80 0 0 1 200 112" className="gauge-arc good" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} className="gauge-needle" />
        <circle cx={cx} cy={cy} r="8" className="gauge-hub" />
        <text x="40" y="135" className="gauge-tick">۰</text>
        <text x="192" y="135" className="gauge-tick">۱۰</text>
      </svg>
      <div className="gauge-value">
        <strong>{formatNumber(score, 2)}</strong>
        <span>از ۱۰</span>
      </div>
    </div>
  );
}

export function WaterfallChart({ result }: { result: PerformanceResult }) {
  const base = result.currentBaseScore ?? 0;
  const historyEffect =
    result.weightedHistoryScore !== null && result.currentBaseScore !== null
      ? result.weightedHistoryScore - result.currentBaseScore
      : 0;
  const entries = [
    { label: "امتیاز پایه", value: base, kind: "total" },
    { label: "اثر سه‌ساله", value: historyEffect, kind: historyEffect >= 0 ? "positive" : "negative" },
    {
      label: "ارزش‌آفرینی",
      value: result.valueCreationAdjustment,
      kind: result.valueCreationAdjustment >= 0 ? "positive" : "negative",
    },
    {
      label: "روند",
      value: result.trendAdjustment,
      kind: result.trendAdjustment >= 0 ? "positive" : "negative",
    },
    { label: "جریمه‌ها", value: -result.totalPenalty, kind: "negative" },
    { label: "امتیاز نهایی", value: result.finalScore ?? 0, kind: "final" },
  ];
  const width = 760;
  const height = 300;
  const padding = { top: 26, right: 24, bottom: 74, left: 42 };
  const plotHeight = height - padding.top - padding.bottom;
  const y = (value: number) => padding.top + ((10 - Math.max(0, Math.min(10, value))) / 10) * plotHeight;
  const barWidth = 76;
  const gap = (width - padding.left - padding.right - entries.length * barWidth) / (entries.length - 1);
  let cumulative = 0;
  return (
    <div className="chart-svg-wrap waterfall-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="نمودار آبشاری ساخت امتیاز">
        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} className="perf-grid" />
            <text x={padding.left - 10} y={y(tick) + 4} className="perf-axis-label">{tick.toLocaleString("fa-IR")}</text>
          </g>
        ))}
        {entries.map((entry, index) => {
          const x = padding.left + index * (barWidth + gap);
          const isTotal = entry.kind === "total" || entry.kind === "final";
          const start = isTotal ? 0 : cumulative;
          const end = isTotal ? entry.value : cumulative + entry.value;
          const top = y(Math.max(start, end));
          const bottom = y(Math.min(start, end));
          const rectHeight = Math.max(4, bottom - top);
          if (!isTotal) cumulative = end;
          else cumulative = entry.value;
          return (
            <g key={entry.label}>
              {index > 0 && index < entries.length - 1 && (
                <line
                  x1={x - gap}
                  x2={x}
                  y1={y(start)}
                  y2={y(start)}
                  className="waterfall-connector"
                />
              )}
              <rect x={x} y={top} width={barWidth} height={rectHeight} rx="8" className={`waterfall-bar ${entry.kind}`} />
              <text x={x + barWidth / 2} y={Math.max(16, top - 8)} className="waterfall-value">
                {entry.value > 0 && !isTotal ? "+" : ""}
                {formatNumber(entry.value, 2)}
              </text>
              <text x={x + barWidth / 2} y={height - 42} className="waterfall-label">
                {entry.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DimensionContributionChart({ result }: { result: PerformanceResult }) {
  return (
    <div className="dimension-bars">
      {PERFORMANCE_DIMENSION_KEYS.map((key) => {
        const dimension = result.dimensions[key];
        const contribution = dimension.baseContribution;
        const maximum = dimension.adjustedModelWeight * 10;
        const percent = maximum ? (contribution / maximum) * 100 : 0;
        return (
          <div className="dimension-bar-row" key={key}>
            <div>
              <span>{dimension.label}</span>
              <small>وزن {Math.round(dimension.modelWeight * 100).toLocaleString("fa-IR")}٪</small>
            </div>
            <div className="dimension-bar-track">
              <i
                style={{
                  width: `${Math.max(0, Math.min(100, percent))}%`,
                  background: DIMENSION_COLORS[key],
                }}
              />
            </div>
            <strong>{formatNumber(contribution, 2)}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreTrendChart({
  results,
}: {
  results: PerformanceResult[];
}) {
  const width = 760;
  const height = 290;
  const padding = { top: 30, right: 26, bottom: 50, left: 48 };
  const sorted = [...results].sort((a, b) => a.year - b.year);
  const x = (index: number) =>
    padding.left +
    (sorted.length <= 1
      ? (width - padding.left - padding.right) / 2
      : (index / (sorted.length - 1)) * (width - padding.left - padding.right));
  const y = (value: number) =>
    padding.top + ((10 - value) / 10) * (height - padding.top - padding.bottom);
  const basePoints = sorted
    .map((result, index) =>
      result.currentBaseScore === null ? null : `${x(index)},${y(result.currentBaseScore)}`,
    )
    .filter((value): value is string => value !== null);
  const finalPoints = sorted
    .map((result, index) => result.finalScore === null ? null : `${x(index)},${y(result.finalScore)}`)
    .filter((value): value is string => value !== null);
  return (
    <div className="chart-svg-wrap">
      <div className="perf-legend">
        <span><i style={{ background: "#64748b" }} />امتیاز پایه</span>
        <span><i style={{ background: "#1d4ed8" }} />امتیاز نهایی</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="روند امتیاز پایه و نهایی">
        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} className="perf-grid" />
            <text x={padding.left - 10} y={y(tick) + 4} className="perf-axis-label">{tick.toLocaleString("fa-IR")}</text>
          </g>
        ))}
        {sorted.map((result, index) => (
          <text key={result.year} x={x(index)} y={height - 18} className="perf-year">
            {result.year.toLocaleString("fa-IR", { useGrouping: false })}
          </text>
        ))}
        {basePoints.length > 1 && <polyline points={basePoints.join(" ")} className="perf-line base" />}
        {finalPoints.length > 1 && <polyline points={finalPoints.join(" ")} className="perf-line final" />}
        {sorted.map((result, index) => (
          <g key={`points-${result.year}`}>
            {result.currentBaseScore !== null && (
              <circle cx={x(index)} cy={y(result.currentBaseScore)} r="5" className="perf-point base">
                <title>{`امتیاز پایه ${formatNumber(result.currentBaseScore, 2)}`}</title>
              </circle>
            )}
            {result.finalScore !== null && (
              <circle cx={x(index)} cy={y(result.finalScore)} r="5" className="perf-point final">
                <title>{`امتیاز نهایی ${formatNumber(result.finalScore, 2)}`}</title>
              </circle>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function RankingBars({
  rows,
  selectedCompany,
}: {
  rows: PerformanceResult[];
  selectedCompany: string;
}) {
  const displayed = rows.slice(0, 10);
  return (
    <div className="ranking-bars">
      {displayed.map((result, index) => (
        <div className={result.company === selectedCompany ? "selected" : ""} key={result.company}>
          <span>{(index + 1).toLocaleString("fa-IR")}</span>
          <strong>{result.company}</strong>
          <div><i style={{ width: `${(result.finalScore ?? 0) * 10}%` }} /></div>
          <b>{formatNumber(result.finalScore, 2)}</b>
        </div>
      ))}
    </div>
  );
}

function matrixZone(score: number, slope: number) {
  if (score >= 7 && slope >= 0.15) return "پیشرو";
  if (score >= 7 && slope < -0.15) return "قوی ولی در حال افت";
  if (score < 5 && slope >= 0.15) return "در مسیر احیا";
  if (score >= 5 && slope >= 0.15) return "در حال بهبود";
  if (score < 3.5) return "بحرانی";
  return "نیازمند توجه";
}

export function ScoreTrendMatrix({
  rows,
  selectedCompany,
}: {
  rows: PerformanceResult[];
  selectedCompany: string;
}) {
  const width = 760;
  const height = 350;
  const padding = { top: 30, right: 32, bottom: 58, left: 58 };
  const x = (value: number) =>
    padding.left + (value / 10) * (width - padding.left - padding.right);
  const y = (value: number) => {
    const clamped = Math.max(-2, Math.min(2, value));
    return padding.top + ((2 - clamped) / 4) * (height - padding.top - padding.bottom);
  };
  return (
    <div className="chart-svg-wrap matrix-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ماتریس امتیاز نهایی و روند سه‌ساله">
        <rect x={x(7)} y={padding.top} width={x(10) - x(7)} height={y(0) - padding.top} className="matrix-zone leader" />
        <rect x={x(7)} y={y(0)} width={x(10) - x(7)} height={height - padding.bottom - y(0)} className="matrix-zone declining" />
        <rect x={x(3.5)} y={padding.top} width={x(7) - x(3.5)} height={y(0) - padding.top} className="matrix-zone improving" />
        <rect x={padding.left} y={padding.top} width={x(3.5) - padding.left} height={y(0) - padding.top} className="matrix-zone recovery" />
        <rect x={padding.left} y={y(0)} width={x(3.5) - padding.left} height={height - padding.bottom - y(0)} className="matrix-zone critical" />
        <rect x={x(3.5)} y={y(0)} width={x(7) - x(3.5)} height={height - padding.bottom - y(0)} className="matrix-zone attention" />
        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1={padding.top} y2={height - padding.bottom} className="perf-grid" />
            <text x={x(tick)} y={height - 24} className="perf-year">{tick.toLocaleString("fa-IR")}</text>
          </g>
        ))}
        {[-2, -1, 0, 1, 2].map((tick) => (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} className="perf-grid" />
            <text x={padding.left - 12} y={y(tick) + 4} className="perf-axis-label">{tick.toLocaleString("fa-IR")}</text>
          </g>
        ))}
        {rows
          .filter((result) => result.finalScore !== null && result.trendSlope !== null)
          .map((result) => (
            <g key={result.company} className={result.company === selectedCompany ? "matrix-point selected" : "matrix-point"}>
              <circle cx={x(result.finalScore as number)} cy={y(result.trendSlope as number)} r={result.company === selectedCompany ? 9 : 6}>
                <title>{`${result.company} · ${matrixZone(result.finalScore as number, result.trendSlope as number)} · امتیاز ${formatNumber(result.finalScore, 2)} · شیب ${formatNumber(result.trendSlope, 2)}`}</title>
              </circle>
              {result.company === selectedCompany && (
                <text x={x(result.finalScore as number) + 12} y={y(result.trendSlope as number) - 10} className="matrix-label">
                  {result.company}
                </text>
              )}
            </g>
          ))}
        <text x={(padding.left + width - padding.right) / 2} y={height - 4} className="matrix-axis-title">امتیاز نهایی</text>
        <text transform={`translate(16 ${(padding.top + height - padding.bottom) / 2}) rotate(-90)`} className="matrix-axis-title">شیب روند سه‌ساله</text>
      </svg>
    </div>
  );
}
