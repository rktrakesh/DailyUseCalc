import {
  createEstimateReportHtml,
  type EstimateReportData,
} from '../../components/reports/EstimateReport';

function openReportWindow(data: EstimateReportData): Window | null {
  const reportWindow = window.open('', '_blank', 'popup,width=960,height=820');
  if (!reportWindow) return null;

  const reportDocument = new DOMParser().parseFromString(
    createEstimateReportHtml(data),
    'text/html',
  );
  reportWindow.document.replaceChild(
    reportWindow.document.importNode(reportDocument.documentElement, true),
    reportWindow.document.documentElement,
  );
  reportWindow.document.title = data.documentTitle;
  return reportWindow;
}

function openAndPrint(data: EstimateReportData): boolean {
  const reportWindow = openReportWindow(data);
  if (!reportWindow) return false;
  window.setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 100);
  return true;
}

export function printReport(data: EstimateReportData): boolean {
  return openAndPrint(data);
}

export function downloadReportAsPdf(data: EstimateReportData): boolean {
  return openAndPrint(data);
}
