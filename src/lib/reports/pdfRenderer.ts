import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { EstimateReportData, ReportMetric } from '../../components/reports/EstimateReport';
import { createPdfFilename } from './reportFilename';

const WIDTH = 612;
const HEIGHT = 792;
const MARGIN = 36;
const GAP = 18;
const COLUMN = (WIDTH - MARGIN * 2 - GAP) / 2;
const ink = rgb(0.06, 0.13, 0.16);
const soft = rgb(0.31, 0.38, 0.41);
const brand = rgb(0.02, 0.39, 0.42);
const line = rgb(0.84, 0.89, 0.89);
const softBrand = rgb(0.94, 0.98, 0.97);

interface Cursor {
  page: PDFPage;
  x: number;
  width: number;
  y: number;
}

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let current = '';
  for (const word of value.replace(/\s+/g, ' ').trim().split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapPrimaryValue(value: string, font: PDFFont, size: number, width: number) {
  const purchases = value
    .split(' + ')
    .map((item) => item.trim())
    .filter(Boolean);
  if (purchases.length < 2) return wrap(value, font, size, width);

  const lines: string[] = [];
  let current = '';
  for (const purchase of purchases) {
    const candidate = current ? `${current} + ${purchase}` : purchase;
    if (!current || font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
    else {
      lines.push(current);
      current = `+ ${purchase}`;
    }
  }
  if (current) lines.push(current);
  return lines.some((line) => font.widthOfTextAtSize(line, size) > width)
    ? wrap(value, font, size, width)
    : lines;
}

function text(
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = ink,
) {
  const height = size * 1.35;
  lines.forEach((item, index) =>
    page.drawText(item, { x, y: y - index * height, font, size, color }),
  );
  return lines.length * height;
}

function heading(cursor: Cursor, title: string, bold: PDFFont, compact = false) {
  cursor.page.drawText(title, {
    x: cursor.x,
    y: cursor.y,
    font: bold,
    size: compact ? 9.5 : 10,
    color: brand,
  });
  cursor.y -= compact ? 12 : 14;
}

function rows(
  cursor: Cursor,
  metrics: ReportMetric[],
  regular: PDFFont,
  bold: PDFFont,
  compact = false,
) {
  const fontSize = compact ? 8 : 8.5;
  const lineHeight = compact ? 9.5 : 11;
  for (const metric of metrics) {
    const labels = wrap(metric.label, regular, fontSize, cursor.width * 0.52);
    const values = wrap(metric.value, bold, fontSize, cursor.width * 0.42);
    const height = Math.max(
      compact ? 15 : 18,
      Math.max(labels.length, values.length) * lineHeight + (compact ? 5.5 : 8),
    );
    cursor.page.drawLine({
      start: { x: cursor.x, y: cursor.y + 4 },
      end: { x: cursor.x + cursor.width, y: cursor.y + 4 },
      thickness: 0.6,
      color: line,
    });
    text(
      cursor.page,
      labels,
      cursor.x + 8,
      cursor.y - 7,
      regular,
      fontSize,
      metric.emphasis ? brand : ink,
    );
    values.forEach((value, index) =>
      cursor.page.drawText(value, {
        x: cursor.x + cursor.width - 8 - bold.widthOfTextAtSize(value, fontSize),
        y: cursor.y - 7 - index * lineHeight,
        font: bold,
        size: fontSize,
        color: metric.emphasis ? brand : ink,
      }),
    );
    cursor.y -= height;
  }
  cursor.page.drawLine({
    start: { x: cursor.x, y: cursor.y + 4 },
    end: { x: cursor.x + cursor.width, y: cursor.y + 4 },
    thickness: 0.6,
    color: line,
  });
  cursor.y -= compact ? 8 : 12;
}

function paragraph(
  cursor: Cursor,
  title: string,
  value: string,
  regular: PDFFont,
  bold: PDFFont,
  compact = false,
) {
  const fontSize = compact ? 8 : 8.5;
  heading(cursor, title, bold, compact);
  cursor.y -= text(
    cursor.page,
    wrap(value, regular, fontSize, cursor.width),
    cursor.x,
    cursor.y,
    regular,
    fontSize,
  );
  cursor.y -= compact ? 9 : 12;
}

async function logo(document: PDFDocument) {
  try {
    const response = await fetch('/logo/dailyusecalc-logo-176.png');
    return response.ok ? await document.embedPng(await response.arrayBuffer()) : undefined;
  } catch {
    return undefined;
  }
}

function download(bytes: Uint8Array, filename: string) {
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Builds the shared selectable-text report PDF without triggering a browser download. */
export async function createEstimatePdfBytes(report: EstimateReportData) {
  const document = await PDFDocument.create();
  document.setTitle(report.documentTitle);
  document.setAuthor('DailyUseCalc');
  document.setSubject(report.reportTitle);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const compact = report.compactLayout === true;
  const page = document.addPage([WIDTH, HEIGHT]);
  const mark = await logo(document);
  if (mark) page.drawImage(mark, { x: MARGIN, y: HEIGHT - 68, ...mark.scaleToFit(32, 32) });
  page.drawText('DailyUse', { x: MARGIN + 42, y: HEIGHT - 47, font: bold, size: 15, color: ink });
  page.drawText('Calc', { x: MARGIN + 101, y: HEIGHT - 47, font: bold, size: 15, color: brand });
  page.drawText('Smart Calculators for Everyday Projects', {
    x: MARGIN + 42,
    y: HEIGHT - 60,
    font: regular,
    size: 7,
    color: soft,
  });
  const titleWidth = bold.widthOfTextAtSize(report.reportTitle, 15);
  page.drawText(report.reportTitle, {
    x: WIDTH - MARGIN - titleWidth,
    y: HEIGHT - 47,
    font: bold,
    size: 15,
    color: ink,
  });
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(report.generatedAt);
  const generated = `Generated: ${date}`;
  page.drawText(generated, {
    x: WIDTH - MARGIN - regular.widthOfTextAtSize(generated, 8),
    y: HEIGHT - 60,
    font: regular,
    size: 8,
    color: soft,
  });
  page.drawLine({
    start: { x: MARGIN, y: HEIGHT - 72 },
    end: { x: WIDTH - MARGIN, y: HEIGHT - 72 },
    thickness: 1.5,
    color: brand,
  });

  let y = HEIGHT - 100;
  page.drawText(report.projectName || 'Project Estimate', {
    x: MARGIN,
    y,
    font: bold,
    size: 18,
    color: ink,
  });
  y -= 17;
  if (report.projectTypeLabel)
    page.drawText(`Project Type: ${report.projectTypeLabel}`, {
      x: MARGIN,
      y,
      font: regular,
      size: 9,
      color: brand,
    });
  y -= 18;
  const primaryWidth = COLUMN - 24;
  let primarySize =
    report.primaryResult.value.length > 34 ? 16 : report.primaryResult.value.length > 20 ? 20 : 26;
  let primaryLines = wrapPrimaryValue(report.primaryResult.value, bold, primarySize, primaryWidth);
  while (primaryLines.length > 2 && primarySize > 13) {
    primarySize -= 1;
    primaryLines = wrapPrimaryValue(report.primaryResult.value, bold, primarySize, primaryWidth);
  }
  const primaryExtraHeight = report.adaptivePrimaryResult
    ? Math.max(0, primaryLines.length - 1) * primarySize * 1.35
    : 0;
  page.drawRectangle({
    x: MARGIN,
    y: y - 92 - primaryExtraHeight,
    width: COLUMN,
    height: 92 + primaryExtraHeight,
    color: softBrand,
    borderColor: brand,
    borderWidth: 0.8,
  });
  page.drawText(report.primaryResult.label, {
    x: MARGIN + 12,
    y: y - 18,
    font: bold,
    size: 9,
    color: brand,
  });
  const primaryStartY = primaryLines.length > 1 ? y - 42 : y - 51;
  text(page, primaryLines, MARGIN + 12, primaryStartY, bold, primarySize, brand);
  page.drawText(report.primaryResult.supportingText, {
    x: MARGIN + 12,
    y: y - 70 - primaryExtraHeight,
    font: regular,
    size: 8.5,
    color: ink,
  });
  page.drawText(report.primaryResult.confirmation, {
    x: MARGIN + 12,
    y: y - 83 - primaryExtraHeight,
    font: regular,
    size: 7.3,
    color: soft,
  });

  const summary: Cursor = { page, x: MARGIN + COLUMN + GAP, width: COLUMN, y };
  heading(summary, 'PROJECT SUMMARY', bold, compact);
  rows(summary, report.summary, regular, bold, compact);
  const left: Cursor = { page, x: MARGIN, width: COLUMN, y: y - 108 - primaryExtraHeight };
  for (const section of report.leftSections ?? report.sections.slice(0, 2)) {
    heading(left, section.title, bold, compact);
    rows(left, section.rows, regular, bold, compact);
  }
  const right: Cursor = { page, x: MARGIN + COLUMN + GAP, width: COLUMN, y: summary.y - 2 };
  for (const section of report.rightSections ?? report.sections.slice(2)) {
    heading(right, section.title, bold, compact);
    rows(right, section.rows, regular, bold, compact);
  }
  for (const section of report.customSections ?? [])
    paragraph(
      right,
      section.title,
      section.content ??
        new DOMParser().parseFromString(section.contentHtml ?? '', 'text/html').body.textContent ??
        '',
      regular,
      bold,
      compact,
    );
  if (report.additionalDetails?.length) {
    heading(right, 'PURCHASING DETAILS', bold, compact);
    rows(right, report.additionalDetails, regular, bold, compact);
  }
  if (compact) {
    if (report.guidance?.length)
      paragraph(
        left,
        'GUIDANCE',
        report.guidance.map((item) => `${item.label}: ${item.value}`).join(' '),
        regular,
        bold,
        true,
      );
    if (report.warnings?.length)
      paragraph(left, 'WARNINGS', report.warnings.join(' '), regular, bold, true);
    paragraph(
      report.additionalDetails?.length ? left : right,
      report.notice.title,
      report.notice.content,
      regular,
      bold,
      true,
    );
  } else {
    for (const item of report.guidance ?? [])
      paragraph(left, `GUIDANCE - ${item.label.toUpperCase()}`, item.value, regular, bold);
    if (report.warnings?.length)
      paragraph(left, 'WARNINGS', report.warnings.join(' '), regular, bold);
    paragraph(left, report.notice.title, report.notice.content, regular, bold);
  }
  const footerY = Math.max(34, Math.min(left.y, right.y) - 3);
  page.drawLine({
    start: { x: MARGIN, y: footerY },
    end: { x: WIDTH - MARGIN, y: footerY },
    thickness: 1,
    color: brand,
  });
  page.drawText(report.footerUrl, {
    x: MARGIN,
    y: footerY - 14,
    font: regular,
    size: 8,
    color: brand,
  });
  const thanks = 'Thank you for using DailyUseCalc!';
  page.drawText(thanks, {
    x: WIDTH - MARGIN - bold.widthOfTextAtSize(thanks, 8),
    y: footerY - 14,
    font: bold,
    size: 8,
    color: ink,
  });
  return document.save();
}

/** Renders and downloads the shared report as a selectable-text PDF. */
export async function downloadEstimatePdf(report: EstimateReportData) {
  download(await createEstimatePdfBytes(report), createPdfFilename(report.documentTitle));
}
