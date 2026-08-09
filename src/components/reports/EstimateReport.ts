export interface ReportMetric {
  label: string;
  value: string;
  emphasis?: boolean;
}

export interface EstimateReportData {
  documentTitle: string;
  reportTitle: string;
  generatedAt: Date;
  projectName?: string;
  projectTypeLabel?: string;
  primaryResult: { label: string; value: string; supportingText: string; confirmation: string };
  summary: ReportMetric[];
  sections: Array<{ title: string; rows: ReportMetric[] }>;
  customSections?: Array<{ title: string; contentHtml: string }>;
  additionalDetails?: ReportMetric[];
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
  return `${dateText} • ${timeText}`;
}

function renderRows(rows: ReportMetric[]) {
  return rows
    .map(
      ({ label, value, emphasis }) =>
        `<div class="report-row${emphasis ? ' report-row--emphasis' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join('');
}

function renderSection(title: string, rows: ReportMetric[]) {
  return `<section class="report-section"><h2>${escapeHtml(title)}</h2><div class="report-panel">${renderRows(rows)}</div></section>`;
}

const styles = `
:root { color-scheme: light; } * { box-sizing: border-box; }
@page { size: letter; margin: .35in; }
body { margin: 0; background: #eef4f3; color: #102027; font-family: Inter, Arial, sans-serif; }
.estimate-report { width: min(8.5in,100%); min-height: 10.3in; margin: 0 auto; padding: .2in; background: #fff; }
.report-header,.report-footer { display:flex; justify-content:space-between; gap:24px; }
.brand { display:flex; align-items:center; gap:12px; }.brand-mark { display:grid; place-items:center; width:38px; height:38px; border-radius:10px; background:#087b80; color:#fff; font-size:22px; font-weight:800; }
.brand-name,.report-title,h1,h2,p { margin:0; }.brand-name { font-size:24px; font-weight:800; letter-spacing:-.8px; }.brand-name span,h2 { color:#087b80; }.tagline,.generated,.report-footer { color:#506069; font-size:11px; }.report-title,.generated { text-align:right; }.report-title { font-size:20px; letter-spacing:.04em; }.generated { margin-top:6px; }
.rule { height:2px; margin:18px 0 28px; background:#087b80; }.project-heading { margin-bottom:18px; }h1 { font-size:26px; line-height:1.16; letter-spacing:-.7px; }.project-type { margin-top:10px; font-size:13px; }.teal { color:#087b80; }
.report-columns { display:grid; grid-template-columns:1fr 1fr; gap:22px; align-items:start; }.report-stack { display:grid; gap:20px; }.report-panel { overflow:hidden; border:1px solid #d7e1e3; border-radius:9px; break-inside:avoid; }.report-section h2 { display:flex; gap:8px; margin:0 0 11px; font-size:14px; font-weight:800; letter-spacing:.03em; }
.report-row { display:flex; justify-content:space-between; gap:16px; padding:11px 14px; border-top:1px solid #e6edef; font-size:12px; }.report-row:first-child { border-top:0; }.report-row strong { text-align:right; }.report-row--emphasis { color:#05636a; font-size:13px; }
.primary-result { border-color:#a7d4d1; background:linear-gradient(135deg,#fff,#f0f9f8); padding:16px; text-align:center; }.primary-result h2 { margin:0; color:#05636a; font-size:13px; }.primary-value { margin-top:22px; color:#05636a; font-size:48px; font-weight:800; letter-spacing:-2px; line-height:1; }.primary-support { margin-top:12px; font-size:13px; }.confirmation { margin-top:22px; color:#05636a; font-size:12px; font-weight:700; }
.summary { padding:16px 0 0; }.summary h2 { margin:0 16px 13px; color:#05636a; font-size:13px; letter-spacing:.03em; }.custom-section { font-size:12px; line-height:1.55; break-inside:avoid; }.custom-section h2 { margin:0 0 11px; color:#05636a; font-size:14px; letter-spacing:.03em; }.custom-section .equation { display:grid; grid-template-columns:1fr auto 1fr auto 1fr; gap:8px; align-items:center; margin-top:16px; text-align:center; }.equation-box { border:1px solid #d7e1e3; border-radius:7px; padding:10px 6px; font-size:11px; }.equation-box strong { display:block; font-size:14px; }.equation-symbol { color:#506069; font-size:17px; }.equation-result { margin-top:12px; border:1px solid #a7d4d1; border-radius:7px; padding:10px; background:#f0f9f8; color:#05636a; text-align:center; }.equation-result strong { display:block; font-size:24px; }
.notice { border:1px solid #a7d4d1; border-radius:8px; padding:14px; background:#f5fbfa; font-size:11px; line-height:1.5; break-inside:avoid; }.notice strong { display:block; margin-bottom:4px; color:#05636a; }.report-footer { align-items:center; margin-top:22px; padding-top:12px; border-top:2px solid #087b80; }.report-footer strong { color:#102027; }
@media screen { .estimate-report { margin:24px auto; box-shadow:0 8px 28px rgb(16 32 39 / .12); } } @media print { body { background:#fff; }.estimate-report { width:100%; min-height:auto; margin:0; padding:0; box-shadow:none; } } @media (max-width:680px) { .estimate-report { padding:18px; }.report-header,.report-footer { flex-direction:column; }.report-title,.generated { text-align:left; }.report-columns { grid-template-columns:1fr; }.primary-value { font-size:42px; } }
`;

export function createEstimateReportHtml(data: EstimateReportData) {
  const customSections = (data.customSections ?? [])
    .map(
      (section) =>
        `<section class="custom-section"><h2>${escapeHtml(section.title)}</h2>${section.contentHtml}</section>`,
    )
    .join('');
  const additionalDetails = data.additionalDetails?.length
    ? renderSection('ADDITIONAL DETAILS', data.additionalDetails)
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.documentTitle)}</title><style>${styles}</style></head><body><main class="estimate-report"><header class="report-header"><div class="brand"><div class="brand-mark" aria-hidden="true">◆</div><div><p class="brand-name">DailyUse<span>Calc</span></p><p class="tagline">Smart Calculators for Everyday Projects</p></div></div><div><p class="report-title">${escapeHtml(data.reportTitle)}</p><p class="generated">Generated: ${escapeHtml(formatGeneratedAt(data.generatedAt))}</p></div></header><div class="rule"></div><section class="project-heading"><h1>${escapeHtml(data.projectName || 'Project Estimate')}</h1>${data.projectTypeLabel ? `<p class="project-type">Project Type: <strong class="teal">${escapeHtml(data.projectTypeLabel)}</strong></p>` : ''}</section><div class="report-columns"><div class="report-stack"><section class="report-panel primary-result"><h2>${escapeHtml(data.primaryResult.label)}</h2><p class="primary-value">${escapeHtml(data.primaryResult.value)}</p><p class="primary-support">${escapeHtml(data.primaryResult.supportingText)}</p><p class="confirmation">✓ ${escapeHtml(data.primaryResult.confirmation)}</p></section>${data.sections
    .slice(0, 2)
    .map((section) => renderSection(section.title, section.rows))
    .join(
      '',
    )}<aside class="notice"><strong>${escapeHtml(data.notice.title)}</strong>${escapeHtml(data.notice.content)}</aside></div><div class="report-stack"><section class="report-panel summary"><h2>PROJECT SUMMARY</h2>${renderRows(data.summary)}</section>${customSections}${additionalDetails}${data.sections
    .slice(2)
    .map((section) => renderSection(section.title, section.rows))
    .join(
      '',
    )}</div></div><footer class="report-footer"><span>${escapeHtml(data.footerUrl)}</span><span><strong>Thank you for using DailyUseCalc!</strong><br>Plan better. Build better.</span></footer></main></body></html>`;
}
