function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** Creates a browser-safe print title that browsers can use as a PDF filename hint. */
export function createReportFilename(calculatorSlug: string, date: Date): string {
  const normalizedSlug = calculatorSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeSlug = normalizedSlug || 'estimate';
  const localDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return `dailyusecalc-${safeSlug}-${localDate}`;
}

export function createPdfFilename(reportTitle: string): string {
  return reportTitle.toLowerCase().endsWith('.pdf') ? reportTitle : `${reportTitle}.pdf`;
}
