export interface ReportMetric {
  label: string;
  value: string;
  emphasis?: boolean;
}

export interface ReportSection {
  title: string;
  rows: ReportMetric[];
}

export interface EstimateReportData {
  documentTitle: string;
  brandLogoUrl?: string;
  reportTitle: string;
  generatedAt: Date;
  projectName?: string;
  projectTypeLabel?: string;
  primaryResult: { label: string; value: string; supportingText: string; confirmation: string };
  summary: ReportMetric[];
  sections: ReportSection[];
  leftSections?: ReportSection[];
  rightSections?: ReportSection[];
  customSections?: Array<{ title: string; content?: string; contentHtml?: string }>;
  additionalDetails?: ReportMetric[];
  guidance?: ReportMetric[];
  warnings?: string[];
  notice: { title: string; content: string };
  footerUrl: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return entities[character];
  });
}

function formatGeneratedAt(date: Date) {
  const dateText = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    date,
  );
  return `${dateText} · ${timeText}`;
}

function renderRows(rows: ReportMetric[]) {
  return rows
    .map(
      ({ label, value, emphasis }) =>
        `<div class="report-row${emphasis ? ' report-row--emphasis' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join('');
}

function renderSection({ title, rows }: ReportSection) {
  return `<section class="report-section"><h2>${escapeHtml(title)}</h2><div class="report-panel">${renderRows(rows)}</div></section>`;
}

const styles = `
:root{color-scheme:light}*{box-sizing:border-box}@page{size:letter;margin:.25in}
body{margin:0;background:#eef4f3;color:#102027;font-family:Inter,Arial,sans-serif}.estimate-report{width:min(8.5in,100%);min-height:10.5in;margin:0 auto;padding:.18in;background:#fff}
.report-header,.report-footer{display:flex;justify-content:space-between;gap:18px}.brand{display:flex;align-items:center;gap:9px}.brand-logo{width:32px;height:32px;object-fit:contain}.brand-name,.report-title,h1,h2,p{margin:0}.brand-name{font-size:20px;font-weight:800;letter-spacing:-.6px}.brand-name span,h2{color:#087b80}.tagline,.generated,.report-footer{color:#506069;font-size:9px}.report-title,.generated{text-align:right}.report-title{font-size:17px;letter-spacing:.04em}.generated{margin-top:4px}
.rule{height:2px;margin:10px 0 13px;background:#087b80}.project-heading{margin-bottom:11px}h1{font-size:21px;line-height:1.1;letter-spacing:-.5px}.project-type{margin-top:5px;font-size:10px}.teal{color:#087b80}
.report-columns{display:grid;grid-template-columns:1fr 1fr;gap:15px;align-items:start}.report-stack{display:grid;gap:9px}.report-panel{overflow:hidden;border:1px solid #d7e1e3;border-radius:7px;break-inside:avoid}.report-section h2,.custom-section h2,.guidance h2{margin:0 0 5px;font-size:10px;font-weight:800;letter-spacing:.04em}.report-row{display:flex;justify-content:space-between;gap:10px;padding:5px 8px;border-top:1px solid #e6edef;font-size:8.5px;line-height:1.25}.report-row:first-child{border-top:0}.report-row strong{max-width:55%;text-align:right}.report-row--emphasis{color:#05636a;font-size:9px}
.primary-result{border-color:#a7d4d1;background:#f3faf9;padding:10px 12px;text-align:center}.primary-result h2{color:#05636a;font-size:10px}.primary-value{margin-top:8px;color:#05636a;font-size:32px;font-weight:800;letter-spacing:-1px;line-height:1}.primary-support{margin-top:5px;font-size:9px}.confirmation{margin-top:7px;color:#506069;font-size:7.5px}.summary{padding-top:8px}.summary h2{margin:0 8px 6px;color:#05636a;font-size:10px;letter-spacing:.04em}
.custom-section{font-size:8.5px;line-height:1.35;break-inside:avoid}.additional{break-inside:avoid}.guidance{margin-top:9px}.guidance-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.guidance-item{border:1px solid #d7e1e3;border-radius:7px;padding:6px 8px;font-size:8px;line-height:1.3;break-inside:avoid}.guidance-item strong{display:block;margin-bottom:2px;color:#05636a}.warnings{margin-top:7px;border:1px solid #e7c485;border-radius:7px;padding:5px 8px;background:#fffaf0;font-size:7.5px;line-height:1.3;break-inside:avoid}.warnings strong{color:#8b4b00}.warnings ul{margin:3px 0 0;padding-left:13px}.notice{margin-top:7px;border:1px solid #a7d4d1;border-radius:7px;padding:5px 8px;background:#f5fbfa;font-size:7.5px;line-height:1.3;break-inside:avoid}.notice strong{display:inline;margin-right:5px;color:#05636a}.report-footer{align-items:center;margin-top:7px;padding-top:5px;border-top:1.5px solid #087b80}.report-footer strong{color:#102027}
@media screen{.estimate-report{margin:20px auto;box-shadow:0 8px 28px rgb(16 32 39/.12)}}
@media print{body{background:#fff}.estimate-report{width:100%;min-height:auto;margin:0;padding:0;box-shadow:none}.report-section,.custom-section,.guidance-item,.warnings,.notice{break-inside:avoid}}
@media(max-width:680px){.estimate-report{padding:16px}.report-header,.report-footer{flex-direction:column}.report-title,.generated{text-align:left}.report-columns,.guidance-grid{grid-template-columns:1fr}.primary-value{font-size:30px}}
`;

export function createEstimateReportHtml(data: EstimateReportData) {
  const logoUrl = data.brandLogoUrl ?? '/logo/dailyusecalc-logo-176.png';
  const leftSections = data.leftSections ?? data.sections.slice(0, 2);
  const rightSections = data.rightSections ?? data.sections.slice(2);
  const customSections = (data.customSections ?? [])
    .map(
      (section) =>
        `<section class="custom-section"><h2>${escapeHtml(section.title)}</h2>${section.content !== undefined ? `<p>${escapeHtml(section.content)}</p>` : (section.contentHtml ?? '')}</section>`,
    )
    .join('');
  const additionalDetails = data.additionalDetails?.length
    ? `<div class="additional">${renderSection({ title: 'PURCHASING DETAILS', rows: data.additionalDetails })}</div>`
    : '';
  const guidance = data.guidance?.length
    ? `<section class="guidance"><h2>GUIDANCE</h2><div class="guidance-grid">${data.guidance.map(({ label, value }) => `<div class="guidance-item"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`).join('')}</div></section>`
    : '';
  const warnings = data.warnings?.length
    ? `<aside class="warnings"><strong>WARNINGS</strong><ul>${data.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></aside>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.documentTitle)}</title><style>${styles}</style></head><body><main class="estimate-report"><header class="report-header"><div class="brand"><img class="brand-logo" src="${escapeHtml(logoUrl)}" width="176" height="168" alt=""><div><p class="brand-name">DailyUse<span>Calc</span></p><p class="tagline">Smart Calculators for Everyday Projects</p></div></div><div><p class="report-title">${escapeHtml(data.reportTitle)}</p><p class="generated">Generated: ${escapeHtml(formatGeneratedAt(data.generatedAt))}</p></div></header><div class="rule"></div><section class="project-heading"><h1>${escapeHtml(data.projectName || 'Project Estimate')}</h1>${data.projectTypeLabel ? `<p class="project-type">Project Type: <strong class="teal">${escapeHtml(data.projectTypeLabel)}</strong></p>` : ''}</section><div class="report-columns"><div class="report-stack"><section class="report-panel primary-result"><h2>${escapeHtml(data.primaryResult.label)}</h2><p class="primary-value">${escapeHtml(data.primaryResult.value)}</p><p class="primary-support">${escapeHtml(data.primaryResult.supportingText)}</p><p class="confirmation">${escapeHtml(data.primaryResult.confirmation)}</p></section>${leftSections.map(renderSection).join('')}</div><div class="report-stack"><section class="report-panel summary"><h2>PROJECT SUMMARY</h2>${renderRows(data.summary)}</section>${rightSections.map(renderSection).join('')}${customSections}${additionalDetails}</div></div>${guidance}${warnings}<aside class="notice"><strong>${escapeHtml(data.notice.title)}</strong>${escapeHtml(data.notice.content)}</aside><footer class="report-footer"><span>${escapeHtml(data.footerUrl)}</span><span><strong>Thank you for using DailyUseCalc!</strong></span></footer></main></body></html>`;
}
