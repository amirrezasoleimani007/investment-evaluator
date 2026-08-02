import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("ships the Excel reader inside the dashboard bundle", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../dist/client/.vite/manifest.json", import.meta.url), "utf8"),
  );
  const dashboard = manifest["app/dashboard-app.tsx"];

  assert.ok(dashboard, "dashboard entry is missing from the client manifest");
  assert.ok(
    !(dashboard.dynamicImports ?? []).some((entry) => /(^|\/)xlsx(\/|$)/i.test(entry)),
    "xlsx must not be fetched as a lazy chunk after a user selects a file",
  );

  const dashboardAsset = new URL(`../dist/client/${dashboard.file}`, import.meta.url);
  assert.ok((await stat(dashboardAsset)).size > 500_000, "Excel reader is not embedded in the dashboard asset");
  assert.match(await readFile(dashboardAsset, "utf8"), /0\.18\.5/);
});

test("keeps both holding databases in memory and exposes a dashboard switch", async () => {
  const source = await readFile(new URL("../app/dashboard-app.tsx", import.meta.url), "utf8");

  assert.match(source, /type HoldingModels = Record<HoldingSelection, FinancialModel \| null>/);
  assert.match(source, /role="tablist" aria-label="انتخاب هلدینگ برای نمایش"/);
  assert.match(source, /models=\{models\}/);
  assert.match(source, /onFile=\{\(file\) => handleFile\(holding, file\)\}/);
});

test("scatter points show only the company name and every axis has formula help", async () => {
  const source = await readFile(new URL("../components/scatter-chart.tsx", import.meta.url), "utf8");

  const tooltipStart = source.indexOf("function TooltipContent");
  const tooltipEnd = source.indexOf("export default function ScatterChart");
  const tooltipSource = source.slice(tooltipStart, tooltipEnd);

  assert.match(tooltipSource, /<strong>\{point\.company\}<\/strong>/);
  assert.doesNotMatch(tooltipSource, /point\.year|point\.interpretation|point\.regionTitle/);
  assert.match(source, /axisHelp\("x", definition\.xLabel, xFormula\)/);
  assert.match(source, /axisHelp\("y", definition\.yLabel, yFormula\)/);
  assert.match(source, /AXIS_FORMULAS/);
  assert.match(source, /axis-component-row/);
  assert.match(source, /component\.originalWeight/);
  assert.match(source, /فرمول نهایی/);
  assert.match(source, /۰٫۶۰ × حاشیه جریان نقد عملیاتی \+ ۰٫۴۰ × حاشیه سود عملیاتی/);
});

test("dynamic ranking uses the six-dimension thirteen-indicator model", async () => {
  const engine = await readFile(new URL("../lib/dynamic-ranking-engine.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../components/dynamic-ranking.tsx", import.meta.url), "utf8");

  for (const code of ["144", "186", "187", "146", "176", "162", "175", "169", "174", "173", "164", "152", "168"]) {
    assert.match(engine, new RegExp(`code: "${code}"`));
  }
  assert.equal((engine.match(/baseWeight: 0\.2/g) ?? []).length, 3);
  assert.equal((engine.match(/baseWeight: 0\.15/g) ?? []).length, 2);
  assert.equal((engine.match(/baseWeight: 0\.1,/g) ?? []).length, 1);
  assert.match(engine, /MINIMUM_DIMENSION_COVERAGE = 0\.6/);
  assert.match(engine, /VALID_SCORE_COVERAGE = 0\.75/);
  assert.match(engine, /denseRanks/);
  assert.match(engine, /row\.validity === "valid"/);
  assert.match(engine, /Math\.abs\(scoreDifference\) > 1e-12/);
  assert.match(engine, /blendScenarioWeights/);
  assert.match(engine, /redistributeRankingWeight/);
  assert.match(page, /وزن‌دهی گرافیکی و زنده/);
  assert.match(page, /اثر سناریو بر رتبه/);
  assert.match(page, /مدل شش‌بُعدی مالی/);
  assert.match(page, /خروجی Excel/);
});

test("financial workbook import detects the data sheet and header row", async () => {
  const parser = await readFile(new URL("../lib/workbook-parser.ts", import.meta.url), "utf8");

  assert.match(parser, /workbook\.SheetNames\.flatMap/);
  assert.match(parser, /HEADER_SCAN_LIMIT = 30/);
  assert.match(parser, /matchedRequiredColumnCount/);
  assert.match(parser, /selected\.headerRowIndex \+ 2/);
});

test("home and global exports use the official baseline ranking model", async () => {
  const performance = await readFile(new URL("../lib/performance-engine.ts", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/dashboard-app.tsx", import.meta.url), "utf8");

  assert.match(performance, /buildDynamicRanking\(model, year, BASE_RANKING_WEIGHTS\)/);
  assert.doesNotMatch(performance, /function activeWeights/);
  assert.match(dashboard, /امتیاز رسمی سالانه/);
  assert.doesNotMatch(dashboard, /امتیاز سالانه سفارشی/);
});
