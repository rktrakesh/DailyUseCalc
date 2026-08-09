export interface ReportWindowOptions {
  documentTitle: string;
  html: string;
}

export function openReportWindow({ documentTitle, html }: ReportWindowOptions): Window | null {
  const reportWindow = window.open('', '_blank', 'popup,width=960,height=820');
  if (!reportWindow) return null;

  const reportDocument = new DOMParser().parseFromString(html, 'text/html');
  reportWindow.document.replaceChild(
    reportWindow.document.importNode(reportDocument.documentElement, true),
    reportWindow.document.documentElement,
  );
  reportWindow.document.title = documentTitle;
  return reportWindow;
}

export function printReport(reportWindow: Window): void {
  window.setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 100);
}
