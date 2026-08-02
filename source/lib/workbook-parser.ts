import * as XLSX from "xlsx";
import {
  REQUIRED_COLUMNS,
  buildFinancialModel,
  matchedRequiredColumnCount,
  missingRequiredColumns,
  normalizeText,
  type FinancialModel,
} from "./financial-engine";

interface DataSheetCandidate {
  sheet: XLSX.WorkSheet;
  sheetName: string;
  sheetIndex: number;
  headerRowIndex: number;
  headers: string[];
  matchedColumns: number;
  dataRows: number;
  preferredName: boolean;
}

const HEADER_SCAN_LIMIT = 30;

function candidateRows(workbook: XLSX.WorkBook): DataSheetCandidate[] {
  return workbook.SheetNames.flatMap((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      range: 0,
      blankrows: true,
      raw: true,
      defval: null,
    });
    const endRow = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).e.r : 0;
    return rows.slice(0, HEADER_SCAN_LIMIT).map((row, headerRowIndex) => {
      const headers = row.map((value) => normalizeText(value));
      return {
        sheet,
        sheetName,
        sheetIndex,
        headerRowIndex,
        headers,
        matchedColumns: matchedRequiredColumnCount(headers),
        dataRows: Math.max(0, endRow - headerRowIndex),
        preferredName: /دیتا|پایگاه|database|data|db/i.test(normalizeText(sheetName)),
      };
    });
  });
}

export function selectFinancialDataSheet(workbook: XLSX.WorkBook): DataSheetCandidate {
  const candidates = candidateRows(workbook)
    .filter((candidate) => candidate.matchedColumns >= 3)
    .sort((a, b) =>
      b.matchedColumns - a.matchedColumns ||
      Number(b.preferredName) - Number(a.preferredName) ||
      b.dataRows - a.dataRows ||
      a.sheetIndex - b.sheetIndex ||
      a.headerRowIndex - b.headerRowIndex,
    );
  const selected = candidates[0];
  if (!selected) {
    throw new Error(
      `هیچ شیتی با ساختار دیتابیس مالی پیدا نشد. ستون‌های مورد انتظار: ${REQUIRED_COLUMNS.join("، ")}`,
    );
  }
  return selected;
}

export function parseFinancialWorkbook(
  data: ArrayBuffer,
  fileName: string,
): FinancialModel {
  const workbook = XLSX.read(data, {
    type: "array",
    cellDates: false,
    cellFormula: false,
    raw: true,
  });
  if (!workbook.SheetNames.length) {
    throw new Error("فایل Excel فاقد شیت قابل خواندن است.");
  }
  const selected = selectFinancialDataSheet(workbook);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(selected.sheet, {
    range: selected.headerRowIndex,
    defval: null,
    raw: true,
    blankrows: false,
  });
  rows.forEach((row, rowIndex) => {
    selected.headers.forEach((header, columnIndex) => {
      if (!header) return;
      const address = XLSX.utils.encode_cell({
        r: selected.headerRowIndex + rowIndex + 1,
        c: columnIndex,
      });
      const cell = selected.sheet[address];
      if (cell?.t === "e") row[header] = cell.w ?? "#ERROR!";
    });
  });
  if (!rows.length) {
    throw new Error(`در شیت «${selected.sheetName}» رکوردی برای پردازش وجود ندارد.`);
  }
  const missing = missingRequiredColumns(selected.headers);
  const sourceName = missing.length
    ? fileName
    : selected.sheetName === workbook.SheetNames[0]
      ? fileName
      : `${fileName} · شیت ${selected.sheetName}`;
  return buildFinancialModel(
    rows,
    selected.headers,
    sourceName,
    selected.headerRowIndex + 2,
  );
}
