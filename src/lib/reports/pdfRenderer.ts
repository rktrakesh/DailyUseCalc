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

function heading(cursor: Cursor, title: string, bold: PDFFont) {
  cursor.page.drawText(title, { x: cursor.x, y: cursor.y, font: bold, size: 10, color: brand });
  cursor.y -= 14;
}

function rows(cursor: Cursor, metrics: ReportMetric[], regular: PDFFont, bold: PDFFont) {
  for (const metric of metrics) {
    const labels = wrap(metric.label, regular, 8.5, cursor.width * 0.52);
    const values = wrap(metric.value, bold, 8.5, cursor.width * 0.42);
    const height = Math.max(18, Math.max(labels.length, values.length) * 11 + 8);
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
      8.5,
      metric.emphasis ? brand : ink,
    );
    values.forEach((value, index) =>
      cursor.page.drawText(value, {
        x: cursor.x + cursor.width - 8 - bold.widthOfTextAtSize(value, 8.5),
        y: cursor.y - 7 - index * 11,
        font: bold,
        size: 8.5,
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
  cursor.y -= 12;
}

function paragraph(cursor: Cursor, title: string, value: string, regular: PDFFont, bold: PDFFont) {
  heading(cursor, title, bold);
  cursor.y -= text(
    cursor.page,
    wrap(value, regular, 8.5, cursor.width),
    cursor.x,
    cursor.y,
    regular,
    8.5,
  );
  cursor.y -= 12;
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

/** Renders shared report data as a selectable-text US Letter PDF. */
export async function downloadEstimatePdf(report: EstimateReportData) {
  const document = await PDFDocument.create();
  document.setTitle(report.documentTitle);
  document.setAuthor('DailyUseCalc');
  document.setSubject(report.reportTitle);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
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
  page.drawRectangle({
    x: MARGIN,
    y: y - 92,
    width: COLUMN,
    height: 92,
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
  page.drawText(report.primaryResult.value, {
    x: MARGIN + 12,
    y: y - 51,
    font: bold,
    size: 26,
    color: brand,
  });
  page.drawText(report.primaryResult.supportingText, {
    x: MARGIN + 12,
    y: y - 70,
    font: regular,
    size: 8.5,
    color: ink,
  });
  page.drawText(report.primaryResult.confirmation, {
    x: MARGIN + 12,
    y: y - 83,
    font: regular,
    size: 7.3,
    color: soft,
  });

  const summary: Cursor = { page, x: MARGIN + COLUMN + GAP, width: COLUMN, y };
  heading(summary, 'PROJECT SUMMARY', bold);
  rows(summary, report.summary, regular, bold);
  const left: Cursor = { page, x: MARGIN, width: COLUMN, y: y - 108 };
  for (const section of report.leftSections ?? report.sections.slice(0, 2)) {
    heading(left, section.title, bold);
    rows(left, section.rows, regular, bold);
  }
  const right: Cursor = { page, x: MARGIN + COLUMN + GAP, width: COLUMN, y: summary.y - 2 };
  for (const section of report.rightSections ?? report.sections.slice(2)) {
    heading(right, section.title, bold);
    rows(right, section.rows, regular, bold);
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
    );
  if (report.additionalDetails?.length) {
    heading(right, 'PURCHASING DETAILS', bold);
    rows(right, report.additionalDetails, regular, bold);
  }
  for (const item of report.guidance ?? [])
    paragraph(left, `GUIDANCE - ${item.label.toUpperCase()}`, item.value, regular, bold);
  if (report.warnings?.length)
    paragraph(left, 'WARNINGS', report.warnings.join(' '), regular, bold);
  paragraph(left, report.notice.title, report.notice.content, regular, bold);
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
  download(await document.save(), createPdfFilename(report.documentTitle));
}
