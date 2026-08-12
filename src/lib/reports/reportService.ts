import {
  createEstimateReportHtml,
  type EstimateReportData,
} from '../../components/reports/EstimateReport';

function openReportWindow(data: EstimateReportData): Window | null {
  const reportWindow = window.open('', '_blank', 'popup,width=960,height=820');
  if (!reportWindow) return null;

  const brandLogoUrl = new URL('/logo/dailyusecalc-logo-176.png', window.location.origin).href;

  const reportDocument = new DOMParser().parseFromString(
    createEstimateReportHtml({ ...data, brandLogoUrl }),
    'text/html',
  );
  reportWindow.document.replaceChild(
    reportWindow.document.importNode(reportDocument.documentElement, true),
    reportWindow.document.documentElement,
  );
  reportWindow.document.title = data.documentTitle;
  return reportWindow;
}

async function waitForReportImages(reportWindow: Window): Promise<void> {
  const images = Array.from(reportWindow.document.images);
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  );
}

function openAndPrint(data: EstimateReportData): boolean {
  const reportWindow = openReportWindow(data);
  if (!reportWindow) return false;
  void waitForReportImages(reportWindow).then(() => {
    if (!reportWindow.closed) {
      reportWindow.focus();
      reportWindow.print();
    }
  });
  return true;
}

export function printReport(data: EstimateReportData): boolean {
  return openAndPrint(data);
}

export async function downloadReportAsPdf(data: EstimateReportData): Promise<void> {
  const { downloadEstimatePdf } = await import('./pdfRenderer');
  await downloadEstimatePdf(data);
}
