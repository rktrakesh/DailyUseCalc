import type {
  GravelCalculation,
  GravelInput,
  GravelRecommendation,
  MeasurementSystem,
} from './types';

export interface GravelEstimateReportOptions {
  calculation: GravelCalculation;
  input: GravelInput;
  recommendation: GravelRecommendation;
  measurementSystem: MeasurementSystem;
  projectName?: string;
  notes?: string;
  generatedAt?: Date;
}

const projectLabels: Record<GravelInput['projectType'], string> = {
  driveway: 'Driveway',
  walkway: 'Walkway / Path',
  patio: 'Patio Base',
  landscaping: 'Decorative Landscaping',
  'french-drain': 'French Drain',
  'shed-base': 'Shed Base',
  other: 'Other',
};

const gravelLabels: Record<GravelInput['gravelType'], string> = {
  'crushed-stone': 'Crushed Stone',
  'pea-gravel': 'Pea Gravel',
  'river-rock': 'River Rock',
  limestone: 'Limestone',
  granite: 'Granite Gravel',
  custom: 'Custom Material',
};

function escapeHtml(value: string): string {
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

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  const dateText = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${dateText} • ${timeText}`;
}

function row(label: string, value: string, emphasis = false): string {
  return `<div class="report-row${emphasis ? ' report-row--emphasis' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

const reportStyles = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  @page { size: letter; margin: 0.35in; }
  body { margin: 0; background: #eef4f3; color: #102027; font-family: Inter, Arial, sans-serif; }
  .report { width: min(8.5in, 100%); min-height: 10.3in; margin: 0 auto; background: #fff; padding: 0.2in; }
  .report-header, .report-footer { display: flex; justify-content: space-between; gap: 24px; }
  .brand { display: flex; gap: 12px; align-items: center; }
  .brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 10px; background: #087b80; color: #fff; font-size: 22px; font-weight: 800; }
  .brand-name, .report-title, h1, h2, h3, p { margin: 0; }
  .brand-name { font-size: 24px; font-weight: 800; letter-spacing: -0.8px; }
  .brand-name span, .teal { color: #087b80; }
  .tagline, .generated, .report-footer { color: #506069; font-size: 11px; }
  .report-title { font-size: 20px; letter-spacing: 0.04em; text-align: right; }
  .generated { margin-top: 6px; text-align: right; }
  .rule { height: 2px; margin: 18px 0 28px; background: #087b80; }
  .project-heading { margin-bottom: 18px; }
  h1 { font-size: 26px; line-height: 1.16; letter-spacing: -0.7px; }
  .project-type { margin-top: 10px; font-size: 13px; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
  .stack { display: grid; gap: 20px; }
  .panel { border: 1px solid #d7e1e3; border-radius: 9px; overflow: hidden; break-inside: avoid; }
  .panel-inner { padding: 16px; }
  .panel-heading { display: flex; gap: 8px; align-items: center; margin: 0 0 13px; color: #05636a; font-size: 13px; font-weight: 800; letter-spacing: 0.03em; }
  .recommended { border-color: #a7d4d1; background: linear-gradient(135deg, #fff 0%, #f0f9f8 100%); text-align: center; }
  .recommended .panel-heading { justify-content: center; }
  .order-value { color: #05636a; font-size: 48px; font-weight: 800; letter-spacing: -2px; line-height: 1; }
  .order-subtitle { margin-top: 12px; font-size: 13px; }
  .checkline { margin-top: 22px; color: #05636a; font-size: 12px; font-weight: 700; }
  .report-row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 14px; border-top: 1px solid #e6edef; font-size: 12px; }
  .report-row:first-of-type { border-top: 0; }
  .report-row strong { text-align: right; font-weight: 700; }
  .report-row--emphasis { color: #05636a; font-size: 13px; }
  .section-title { display: flex; gap: 8px; align-items: center; margin: 0 0 11px; color: #05636a; font-size: 14px; font-weight: 800; letter-spacing: 0.03em; }
  .why-copy { font-size: 12px; line-height: 1.55; }
  .equation { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 8px; align-items: center; margin-top: 16px; text-align: center; }
  .equation-box { border: 1px solid #d7e1e3; border-radius: 7px; padding: 10px 6px; font-size: 11px; }
  .equation-box strong { display: block; font-size: 14px; }
  .equation-symbol { color: #506069; font-size: 17px; }
  .equation-result { margin-top: 12px; border: 1px solid #a7d4d1; border-radius: 7px; padding: 10px; background: #f0f9f8; color: #05636a; text-align: center; }
  .equation-result strong { display: block; font-size: 24px; }
  .notice { border: 1px solid #a7d4d1; border-radius: 8px; background: #f5fbfa; padding: 14px; font-size: 11px; line-height: 1.5; break-inside: avoid; }
  .notice strong { display: block; margin-bottom: 4px; color: #05636a; }
  .report-footer { align-items: center; margin-top: 22px; padding-top: 12px; border-top: 2px solid #087b80; }
  .report-footer strong { color: #102027; }
  @media screen { .report { margin: 24px auto; box-shadow: 0 8px 28px rgb(16 32 39 / 0.12); } }
  @media print { body { background: #fff; } .report { width: 100%; min-height: auto; margin: 0; padding: 0; box-shadow: none; } }
  @media (max-width: 680px) { .report { padding: 18px; } .report-header, .report-footer { align-items: flex-start; flex-direction: column; } .report-title, .generated { text-align: left; } .columns { grid-template-columns: 1fr; } .order-value { font-size: 42px; } }
`;

export function createGravelEstimateReportHtml({
  calculation,
  input,
  recommendation,
  measurementSystem,
  projectName,
  notes,
  generatedAt = new Date(),
}: GravelEstimateReportOptions): string {
  const isMetric = measurementSystem === 'metric';
  const volume = isMetric
    ? `${formatNumber(calculation.volumeCubicMeters)} m³`
    : `${formatNumber(calculation.volumeCubicYards)} yd³`;
  const adjustedVolume = isMetric
    ? `${formatNumber(calculation.adjustedVolumeCubicYards * 0.764554858)} m³`
    : `${formatNumber(calculation.adjustedVolumeCubicYards)} yd³`;
  const allowanceVolume = isMetric
    ? `${formatNumber(calculation.allowanceVolumeCubicYards * 0.764554858)} m³`
    : `${formatNumber(calculation.allowanceVolumeCubicYards)} yd³`;
  const area = isMetric
    ? `${formatNumber(calculation.surfaceAreaSquareFeet * 0.09290304)} m²`
    : `${formatNumber(calculation.surfaceAreaSquareFeet)} ft²`;
  const weight = isMetric
    ? `${formatNumber(calculation.estimatedWeightKilograms / 1000)} tonnes`
    : `${formatNumber(calculation.estimatedWeightTons)} tons`;
  const allowanceFactor = (1 + input.allowancePercent / 100).toFixed(2);
  const reportName = projectName?.trim() || 'Gravel Project Estimate';
  const additionalRows = [
    row('Estimated cost', formatCurrency(calculation.estimatedCost)),
    row(
      'Bags',
      calculation.bagCount === undefined ? '—' : `${formatNumber(calculation.bagCount, 0)} bags`,
    ),
    row(
      'Truck loads',
      calculation.truckLoads === undefined
        ? '—'
        : `${formatNumber(calculation.truckLoads, 0)} truck load${calculation.truckLoads === 1 ? '' : 's'}`,
    ),
    ...(notes?.trim() ? [row('Notes', notes.trim())] : []),
  ].join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>dailyusecalc-gravel-estimate</title><style>${reportStyles}</style></head><body><main class="report">
    <header class="report-header"><div class="brand"><div class="brand-mark" aria-hidden="true">◆</div><div><p class="brand-name">DailyUse<span>Calc</span></p><p class="tagline">Smart Calculators for Everyday Projects</p></div></div><div><p class="report-title">GRAVEL ESTIMATE</p><p class="generated">Generated: ${escapeHtml(formatDate(generatedAt))}</p></div></header>
    <div class="rule"></div>
    <section class="project-heading"><h1>${escapeHtml(reportName)}</h1><p class="project-type">Project Type: <strong class="teal">${escapeHtml(projectLabels[input.projectType])}</strong></p></section>
    <div class="columns"><div class="stack">
      <section class="panel recommended"><div class="panel-inner"><p class="panel-heading">RECOMMENDED ORDER</p><p class="order-value">${calculation.recommendedOrderCubicYards} yd³</p><p class="order-subtitle">Practical quantity to order</p><p class="checkline">✓ Round up for a complete project</p></div></section>
      <section><h2 class="section-title">▣ PROJECT MEASUREMENTS</h2><div class="panel">${row('Length', `${formatNumber(input.length.value)} ${input.length.unit}`)}${row('Width', `${formatNumber(input.width.value)} ${input.width.unit}`)}${row('Depth', `${formatNumber(input.depth.value)} ${input.depth.unit}`)}${row('Area', area)}${row('Volume', `${volume} (calculated)`)}</div></section>
      <section><h2 class="section-title">▣ ESTIMATE BREAKDOWN</h2><div class="panel">${row('Calculated need', volume)}${row(`Allowance (${input.allowancePercent}%)`, `+ ${allowanceVolume}`)}${row('Total with allowance', adjustedVolume)}${row('Recommended order', `${calculation.recommendedOrderCubicYards} yd³`, true)}${row('Estimated weight', weight)}</div></section>
      <aside class="notice"><strong>IMPORTANT</strong>This estimate is intended for planning purposes. Actual material requirements can vary based on ground conditions, compaction, installation method, and supplier specifications.</aside>
    </div><div class="stack">
      <section class="panel"><div class="panel-inner"><h2 class="panel-heading">▣ PROJECT SUMMARY</h2></div>${row('Gravel type', gravelLabels[input.gravelType])}${row('Measurement system', isMetric ? 'Metric' : 'Imperial (US)')}${row('Allowance', `${input.allowancePercent}%`)}${row('Estimated weight', weight)}</section>
      <section><h2 class="section-title">✦ WHY ${calculation.recommendedOrderCubicYards} YD³?</h2><p class="why-copy">${escapeHtml(recommendation.explanation)}</p><div class="equation"><div class="equation-box"><strong>${volume}</strong>Calculated need</div><span class="equation-symbol">×</span><div class="equation-box"><strong>${allowanceFactor}</strong>Allowance factor</div><span class="equation-symbol">=</span><div class="equation-box"><strong>${adjustedVolume}</strong>Total</div></div><div class="equation-result"><strong>${calculation.recommendedOrderCubicYards} yd³</strong>Recommended Order (Rounded Up)</div></section>
      <section><h2 class="section-title">▣ ADDITIONAL DETAILS</h2><div class="panel">${additionalRows}</div></section>
    </div></div>
    <footer class="report-footer"><span>dailyusecalc.com/gravel</span><span><strong>Thank you for using DailyUseCalc!</strong><br>Plan better. Build better.</span></footer>
  </main></body></html>`;
}
