import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Info,
  Printer,
  RotateCcw,
  Share2,
} from 'lucide-react';
import {
  createCalculatorStartedTracker,
  trackCalculatorEvent,
  trackSuccessfulCalculatorCalculation,
} from '../../../lib/analytics/calculatorAnalytics';
import { preserveNumberInputOnWheel } from '../../../lib/forms/numberInputWheel';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import type { LengthUnit } from '../../../lib/units/measurements';
import { copyTextToClipboard, restartCopyFeedbackTimer } from '../gravel/copyFeedback';
import { currencies, formatMoney, type CurrencyCode } from '../gravel/currencies';
import { paverAnalyticsParameters } from './analytics';
import {
  calculatePaver,
  convertPaverMeasurementSystem,
  createDefaultPaverInput,
  preparePaverInputForSubmission,
  createPaverEstimateReport,
  createPaverEstimateText,
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  formatPaverNumber,
  paverPresets,
  projectLabel,
  squareFeetToArea,
  validatePaverInput,
} from './index';
import type {
  PaverCalculation,
  PaverInput,
  PaverPresetId,
  ProjectType,
  ValidationIssue,
  WastePreset,
} from './types';

const projectOptions: Array<{ value: ProjectType; label: string }> = [
  { value: 'patio', label: 'Patio' },
  { value: 'walkway', label: 'Walkway / Path' },
  { value: 'driveway', label: 'Driveway' },
  { value: 'pool-deck', label: 'Pool Deck' },
  { value: 'other', label: 'Other' },
];
const CURRENCY_STORAGE_KEY = 'duc-paver-currency';
const numberFromEvent = (event: ChangeEvent<HTMLInputElement>) =>
  Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : Number.NaN;
const optionalNumberFromEvent = (event: ChangeEvent<HTMLInputElement>) =>
  event.target.value === '' ? undefined : numberFromEvent(event);
const controlClass = (invalid = false) =>
  `h-11 w-full rounded-control border bg-panel px-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/60 focus-visible:outline-offset-1 sm:h-9 ${invalid ? 'border-danger' : 'border-line'}`;

export default function PaverCalculator() {
  const [input, setInput] = useState<PaverInput>(createDefaultPaverInput);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [submitted, setSubmitted] = useState<{ input: PaverInput; result: PaverCalculation }>();
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const formSection = useRef<HTMLElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const started = useRef(createCalculatorStartedTracker());
  const analytics = (source = input) => paverAnalyticsParameters(source);

  useEffect(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    if (saved && currencies.some(([code]) => code === saved))
      setInput((current) => ({ ...current, currency: saved }));
    return () => {
      if (copyTimer.current !== undefined) clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    const form = formSection.current;
    if (!form) return;
    const preventNumberStepping = (event: WheelEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'number')
        preserveNumberInputOnWheel({
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          preventDefault: () => event.preventDefault(),
        });
    };
    form.addEventListener('wheel', preventNumberStepping, { passive: false });
    return () => form.removeEventListener('wheel', preventNumberStepping);
  }, []);

  const update = (changes: Partial<PaverInput>) => {
    setInput((current) => ({ ...current, ...changes }));
    started.current(analytics({ ...input, ...changes }));
  };
  const errorFor = (field: ValidationIssue['field']) =>
    issues.find((issue) => issue.field === field)?.message;

  function calculate() {
    const preparedInput = preparePaverInputForSubmission(input);
    const nextIssues = validatePaverInput(preparedInput);
    setIssues(nextIssues);
    setCopied(false);
    if (nextIssues.length) {
      const first = nextIssues[0];
      if (['jointWidth', 'baseDepth', 'sandDepth', 'pricePerPaver'].includes(first.field))
        setAdvancedOpen(true);
      setStatus('Check the highlighted fields.');
      requestAnimationFrame(() => document.getElementById(`paver-${first.field}`)?.focus());
      return;
    }
    const snapshot = structuredClone(preparedInput);
    const result = calculatePaver(snapshot);
    setSubmitted({ input: snapshot, result });
    setStatus('Estimate updated.');
    trackSuccessfulCalculatorCalculation(nextIssues, analytics(snapshot));
  }

  function clear() {
    const currency = input.currency;
    setInput(createDefaultPaverInput(currency));
    setAdvancedOpen(false);
    setIssues([]);
    setSubmitted(undefined);
    setStatus('');
    setCopied(false);
    if (copyTimer.current !== undefined) clearTimeout(copyTimer.current);
    trackCalculatorEvent('calculator_clear', analytics());
  }

  async function copy() {
    if (!submitted) return;
    const success = await copyTextToClipboard(
      (text) => navigator.clipboard.writeText(text),
      createPaverEstimateText(submitted.input, submitted.result),
    );
    if (!success) {
      setCopied(false);
      setStatus('Copy failed. Please try again.');
      return;
    }
    setCopied(true);
    setStatus('Estimate copied.');
    copyTimer.current = restartCopyFeedbackTimer(copyTimer.current, () => setCopied(false));
    trackCalculatorEvent('calculator_copy', analytics(submitted.input));
  }

  function print() {
    if (!submitted) return;
    if (printReport(createPaverEstimateReport(submitted.input, submitted.result))) {
      trackCalculatorEvent('calculator_print', analytics(submitted.input));
      setStatus('Print dialog opened.');
    } else setStatus('Allow pop-ups to print this estimate.');
  }

  async function pdf() {
    if (!submitted || preparingPdf) return;
    setPreparingPdf(true);
    try {
      await downloadReportAsPdf(createPaverEstimateReport(submitted.input, submitted.result));
      trackCalculatorEvent('calculator_pdf', analytics(submitted.input));
      setStatus('PDF download started.');
    } catch {
      setStatus('PDF download failed. Please try again.');
    } finally {
      setPreparingPdf(false);
    }
  }

  async function share() {
    if (!submitted) return;
    const text = createPaverEstimateText(submitted.input, submitted.result);
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Paver estimate',
          text,
          url: 'https://dailyusecalc.com/paver/',
        });
        trackCalculatorEvent('calculator_share', {
          ...analytics(submitted.input),
          share_method: 'native',
        });
      } else {
        const success = await copyTextToClipboard(
          (value) => navigator.clipboard.writeText(value),
          text,
        );
        if (!success) throw new Error('copy failed');
        setStatus('Share text copied.');
        trackCalculatorEvent('calculator_share', {
          ...analytics(submitted.input),
          share_method: 'clipboard_fallback',
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('Sharing was unavailable. Please try Copy.');
    }
  }

  const dimensionUnits: LengthUnit[] =
    input.measurementSystem === 'metric' ? ['m', 'cm', 'mm'] : ['ft', 'in', 'yd'];
  const depthUnits: LengthUnit[] =
    input.measurementSystem === 'metric' ? ['cm', 'mm', 'm'] : ['in', 'ft'];
  const areaUnits =
    input.measurementSystem === 'metric'
      ? [['sq-m', 'sq m']]
      : [
          ['sq-ft', 'sq ft'],
          ['sq-yd', 'sq yd'],
        ];

  return (
    <div className="space-y-3">
      <section
        ref={formSection}
        className="rounded-card border border-line bg-panel p-3 shadow-card sm:p-4"
        aria-labelledby="paver-form-heading"
      >
        <h2 id="paver-form-heading" className="sr-only">
          Paver project details
        </h2>
        <h3 className="text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-brand">
          Project
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="Project"
            value={input.projectType}
            onChange={(value) => update({ projectType: value as ProjectType })}
          >
            {projectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Measure by"
            value={input.measureMode}
            onChange={(value) => update({ measureMode: value as PaverInput['measureMode'] })}
          >
            <option value="dimensions">Dimensions</option>
            <option value="area">Known Area</option>
          </SelectField>
          {input.measureMode === 'dimensions' ? (
            <SelectField
              label="Shape"
              value={input.shape}
              onChange={(value) => update({ shape: value as PaverInput['shape'] })}
            >
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
            </SelectField>
          ) : (
            <div className="hidden xl:block" />
          )}
          <SelectField
            label="Units"
            value={input.measurementSystem}
            onChange={(value) => {
              const converted = convertPaverMeasurementSystem(
                input,
                value as PaverInput['measurementSystem'],
              );
              setInput(converted);
              started.current(analytics(converted));
            }}
          >
            <option value="imperial">Imperial (US)</option>
            <option value="metric">Metric</option>
          </SelectField>
        </div>

        <h3 className="mt-4 border-t border-line pt-3 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-brand">
          Project size
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {input.measureMode === 'area' ? (
            <NumberWithUnit
              id="paver-knownArea"
              label="Project area"
              value={input.knownArea}
              unit={input.areaUnit}
              units={areaUnits}
              error={errorFor('knownArea')}
              onValue={(knownArea) => update({ knownArea })}
              onUnit={(areaUnit) => update({ areaUnit: areaUnit as PaverInput['areaUnit'] })}
            />
          ) : input.shape === 'circle' ? (
            <DimensionField
              id="paver-diameter"
              label="Diameter"
              dimension={input.diameter}
              units={dimensionUnits}
              error={errorFor('diameter')}
              onChange={(diameter) => update({ diameter })}
            />
          ) : (
            <>
              <DimensionField
                id="paver-length"
                label="Length"
                dimension={input.length}
                units={dimensionUnits}
                error={errorFor('length')}
                onChange={(length) => update({ length })}
              />
              <DimensionField
                id="paver-width"
                label="Width"
                dimension={input.width}
                units={dimensionUnits}
                error={errorFor('width')}
                onChange={(width) => update({ width })}
              />
            </>
          )}
        </div>

        <h3 className="mt-4 border-t border-line pt-3 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-brand">
          Paver &amp; waste
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Paver size"
            value={input.paverPreset}
            onChange={(value) => {
              const preset = paverPresets.find((item) => item.id === value);
              update(
                preset
                  ? {
                      paverPreset: value as PaverPresetId,
                      paverLength:
                        input.measurementSystem === 'metric'
                          ? preset.lengthInches * 25.4
                          : preset.lengthInches,
                      paverWidth:
                        input.measurementSystem === 'metric'
                          ? preset.widthInches * 25.4
                          : preset.widthInches,
                      paverUnit: input.measurementSystem === 'metric' ? 'mm' : 'in',
                    }
                  : { paverPreset: 'custom' },
              );
            }}
          >
            {paverPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom size</option>
          </SelectField>
          <SelectField
            label="Waste allowance"
            value={input.wastePreset}
            onChange={(value) =>
              update({
                wastePreset: value as WastePreset,
                ...(value === 'custom' ? {} : { wastePercent: Number(value) }),
              })
            }
            helper="Extra pavers help cover cuts, breakage, and spare material."
          >
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="10">10%</option>
            <option value="15">15%</option>
            <option value="custom">Custom</option>
          </SelectField>
        </div>
        {(input.paverPreset === 'custom' || input.wastePreset === 'custom') && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {input.paverPreset === 'custom' && (
              <>
                <SimpleNumber
                  id="paver-paverLength"
                  label="Paver length"
                  value={input.paverLength}
                  unit={input.paverUnit}
                  error={errorFor('paverLength')}
                  onChange={(paverLength) => update({ paverLength })}
                />
                <SimpleNumber
                  id="paver-paverWidth"
                  label="Paver width"
                  value={input.paverWidth}
                  unit={input.paverUnit}
                  error={errorFor('paverWidth')}
                  onChange={(paverWidth) => update({ paverWidth })}
                />
              </>
            )}
            {input.wastePreset === 'custom' && (
              <SimpleNumber
                id="paver-wastePercent"
                label="Custom waste"
                value={input.wastePercent}
                unit="%"
                error={errorFor('wastePercent')}
                onChange={(wastePercent) => update({ wastePercent })}
              />
            )}
          </div>
        )}

        <details
          className="group mt-4 border-t border-line pt-1"
          open={advancedOpen}
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-bold text-ink marker:content-none hover:bg-panel-muted focus-visible:outline-2 focus-visible:outline-brand/70 focus-visible:outline-offset-1">
            <span>
              <span>Advanced options (optional)</span>
              <span className="mt-0.5 block text-center text-[0.66rem] font-medium text-ink-soft">
                Estimate joint spacing, base, bedding sand, and paver cost.
              </span>
            </span>
            <ChevronDown
              size={16}
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="space-y-4 border-t border-line pt-4">
            <fieldset className="grid gap-2">
              <legend className="text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-brand">
                Paver layout
              </legend>
              <div className="max-w-sm">
                <SimpleNumber
                  id="paver-jointWidth"
                  label="Joint width"
                  value={input.jointWidth}
                  unit={input.jointUnit}
                  error={errorFor('jointWidth')}
                  onChange={(jointWidth) => update({ jointWidth })}
                  optional
                  placeholder="e.g. 0.25"
                  helper="Optional. Leave blank to ignore additional joint spacing."
                />
              </div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-brand">
                Installation materials
              </legend>
              <div className="grid items-start gap-3 md:grid-cols-2">
                <DimensionField
                  id="paver-baseDepth"
                  label="Base depth"
                  dimension={input.baseDepth}
                  units={depthUnits}
                  error={errorFor('baseDepth')}
                  onChange={(baseDepth) => update({ baseDepth })}
                  placeholder="e.g. 4"
                  helper="Enter the compacted base depth planned for your project."
                />
                <DimensionField
                  id="paver-sandDepth"
                  label="Bedding sand depth"
                  dimension={input.sandDepth}
                  units={depthUnits}
                  error={errorFor('sandDepth')}
                  onChange={(sandDepth) => update({ sandDepth })}
                  placeholder="e.g. 1"
                  helper="Enter the planned bedding sand depth."
                />
              </div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-brand">
                Cost
              </legend>
              <div className="grid items-start gap-3 md:grid-cols-2">
                <SelectField
                  label="Currency"
                  value={input.currency}
                  onChange={(value) => {
                    localStorage.setItem(CURRENCY_STORAGE_KEY, value);
                    update({ currency: value as CurrencyCode });
                  }}
                >
                  {currencies.map(([code, symbol]) => (
                    <option key={code} value={code}>
                      {code} ({symbol})
                    </option>
                  ))}
                </SelectField>
                <SimpleNumber
                  id="paver-pricePerPaver"
                  label="Price per paver"
                  value={input.pricePerPaver}
                  unit={input.currency}
                  error={errorFor('pricePerPaver')}
                  onChange={(pricePerPaver) => update({ pricePerPaver })}
                  optional
                  placeholder="e.g. 1.25"
                  helper="Enter the material price for one paver."
                />
              </div>
            </fieldset>
          </div>
        </details>
        {errorFor('purchasing') && (
          <p className="mt-2 text-xs font-semibold text-danger">{errorFor('purchasing')}</p>
        )}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.42fr)] gap-2">
          <button
            type="button"
            onClick={calculate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand px-3 text-xs font-bold text-white hover:bg-brand-strong sm:text-sm"
          >
            Calculate Pavers Needed <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel px-3 text-sm font-bold text-ink hover:bg-panel-muted"
          >
            <RotateCcw size={15} aria-hidden="true" /> Clear
          </button>
        </div>
        <p className="mt-2 min-h-4 text-center text-xs text-ink-soft" aria-live="polite">
          {status}
        </p>
      </section>
      {submitted && (
        <Results
          input={submitted.input}
          result={submitted.result}
          copied={copied}
          preparingPdf={preparingPdf}
          onCopy={copy}
          onPrint={print}
          onPdf={pdf}
          onShare={share}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  helper?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink">
      {label}
      <span className="relative">
        <select
          className={`${controlClass()} appearance-none pr-7`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft"
          size={14}
          aria-hidden="true"
        />
      </span>
      {helper && (
        <span className="text-[0.66rem] font-medium leading-4 text-ink-soft">{helper}</span>
      )}
    </label>
  );
}
function SimpleNumber({
  id,
  label,
  value,
  unit,
  error,
  onChange,
  optional = false,
  placeholder,
  helper,
}: {
  id: string;
  label: string;
  value?: number;
  unit: string;
  error?: string;
  onChange: (value: number | undefined) => void;
  optional?: boolean;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <label htmlFor={id} className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink">
      {label}
      <span className="relative">
        <input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          autoComplete="off"
          placeholder={placeholder}
          value={value !== undefined && Number.isFinite(value) ? value : ''}
          onChange={(event) =>
            onChange(optional ? optionalNumberFromEvent(event) : numberFromEvent(event))
          }
          className={`${controlClass(Boolean(error))} pr-16 tabular-nums`}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [helper ? `${id}-help` : undefined, error ? `${id}-error` : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.66rem] font-semibold text-ink-soft">
          {unit}
        </span>
      </span>
      {helper && (
        <span id={`${id}-help`} className="text-[0.66rem] font-medium leading-4 text-ink-soft">
          {helper}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="text-[0.68rem] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
function NumberWithUnit({
  id,
  label,
  value,
  unit,
  units,
  error,
  onValue,
  onUnit,
  placeholder,
  helper,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  units: string[][];
  error?: string;
  onValue: (value: number) => void;
  onUnit: (unit: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <label htmlFor={id} className="grid gap-1 text-[0.7rem] font-bold text-ink">
      {label}
      <span className="grid grid-cols-[minmax(0,1fr)_4.5rem]">
        <input
          id={id}
          name={id}
          className={`${controlClass(Boolean(error))} rounded-r-none`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          autoComplete="off"
          placeholder={placeholder}
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => onValue(numberFromEvent(event))}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [helper ? `${id}-help` : undefined, error ? `${id}-error` : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        <select
          aria-label={`${label} unit`}
          className="h-11 rounded-r-control border border-l-0 border-line bg-panel px-1 text-xs text-ink sm:h-9"
          value={unit}
          onChange={(event) => onUnit(event.target.value)}
        >
          {units.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </span>
      {helper && (
        <span id={`${id}-help`} className="text-[0.66rem] font-medium leading-4 text-ink-soft">
          {helper}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="text-[0.68rem] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
function DimensionField({
  id,
  label,
  dimension,
  units,
  error,
  onChange,
  placeholder,
  helper,
}: {
  id: string;
  label: string;
  dimension: PaverInput['length'];
  units: LengthUnit[];
  error?: string;
  onChange: (value: PaverInput['length']) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <NumberWithUnit
      id={id}
      label={label}
      value={dimension.value}
      unit={dimension.unit}
      units={units.map((unit) => [unit, unit])}
      error={error}
      placeholder={placeholder}
      helper={helper}
      onValue={(value) => onChange({ ...dimension, value })}
      onUnit={(unit) => onChange({ ...dimension, unit: unit as LengthUnit })}
    />
  );
}
function Results({
  input,
  result,
  copied,
  preparingPdf,
  onCopy,
  onPrint,
  onPdf,
  onShare,
}: {
  input: PaverInput;
  result: PaverCalculation;
  copied: boolean;
  preparingPdf: boolean;
  onCopy: () => void;
  onPrint: () => void;
  onPdf: () => void;
  onShare: () => void;
}) {
  const metric = input.measurementSystem === 'metric';
  const area = metric
    ? `${formatPaverNumber(squareFeetToArea(result.projectAreaSquareFeet, 'sq-m'))} sq m`
    : `${formatPaverNumber(result.projectAreaSquareFeet)} sq ft`;
  const coverage = metric
    ? `${formatPaverNumber(squareFeetToArea(result.effectiveCoverageSquareFeet, 'sq-m'), 4)} sq m per paver`
    : `${formatPaverNumber(result.effectiveCoverageSquareFeet, 4)} sq ft per paver`;
  const coverageRate = metric
    ? result.paversPerSquareFoot / squareFeetToArea(1, 'sq-m')
    : result.paversPerSquareFoot;
  const geometry =
    input.measureMode === 'area'
      ? `Known area · ${area}`
      : input.shape === 'circle'
        ? `Circle · ${formatPaverNumber(input.diameter.value)} ${input.diameter.unit} diameter`
        : `Rectangle · ${formatPaverNumber(input.length.value)} ${input.length.unit} × ${formatPaverNumber(input.width.value)} ${input.width.unit}`;
  const joint =
    input.jointWidth > 0
      ? `${formatPaverNumber(input.jointWidth, 3)} ${input.jointUnit} joint width`
      : 'No additional joint spacing';
  return (
    <section
      className="overflow-hidden rounded-card border border-brand/25 bg-panel shadow-card"
      aria-labelledby="paver-results-heading"
    >
      <div className="border-b border-brand/20 bg-brand-soft/55 p-4 sm:p-5">
        <div className="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-brand">
          <CheckCircle2 size={15} aria-hidden="true" /> Your paver estimate
        </div>
        <h2
          id="paver-results-heading"
          className="mt-1.5 text-4xl font-extrabold tracking-[-0.045em] text-ink tabular-nums sm:text-5xl"
        >
          {result.requiredPavers.toLocaleString()}{' '}
          <span className="text-2xl sm:text-3xl">pavers</span>
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Recommended quantity including {input.wastePercent}% waste
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-panel-muted sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <ResultHighlight label="Project area" value={area} />
          <ResultHighlight
            label="Paver coverage"
            value={coverage}
            detail={`${formatPaverNumber(coverageRate)} pavers / ${metric ? 'sq m' : 'sq ft'}`}
          />
        </div>

        <section className="mt-4" aria-labelledby="paver-breakdown-heading">
          <h3
            id="paver-breakdown-heading"
            className="text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-brand"
          >
            Quantity breakdown
          </h3>
          <dl className="mt-2 overflow-hidden rounded-control border border-line">
            <BreakdownRow label="Pavers before waste" value={formatPaverNumber(result.rawPavers)} />
            <BreakdownRow
              label={`Waste allowance (${input.wastePercent}%)`}
              value={`+${formatPaverNumber(result.wastePavers)}`}
            />
            <BreakdownRow
              label="Recommended quantity"
              value={`${result.requiredPavers.toLocaleString()} pavers`}
              emphasis
            />
          </dl>
        </section>

        {(result.baseVolumeCubicFeet !== undefined ||
          result.sandVolumeCubicFeet !== undefined ||
          result.estimatedCost !== undefined) && (
          <div className="mt-4 grid items-stretch gap-2 sm:grid-cols-3">
            {result.baseVolumeCubicFeet !== undefined && (
              <OptionalResult
                label="Paver base"
                value={
                  metric
                    ? `${formatPaverNumber(cubicFeetToCubicMeters(result.baseVolumeCubicFeet))} cu m`
                    : `${formatPaverNumber(cubicFeetToCubicYards(result.baseVolumeCubicFeet))} cu yd`
                }
                detail={
                  metric
                    ? `${formatPaverNumber(cubicFeetToCubicMeters(result.baseVolumeCubicFeet) * 1_000)} L`
                    : `${formatPaverNumber(result.baseVolumeCubicFeet)} cu ft`
                }
                note={`Based on ${formatPaverNumber(input.baseDepth.value)} ${input.baseDepth.unit} base depth`}
              />
            )}
            {result.sandVolumeCubicFeet !== undefined && (
              <OptionalResult
                label="Bedding sand"
                value={
                  metric
                    ? `${formatPaverNumber(cubicFeetToCubicMeters(result.sandVolumeCubicFeet))} cu m`
                    : `${formatPaverNumber(cubicFeetToCubicYards(result.sandVolumeCubicFeet))} cu yd`
                }
                detail={
                  metric
                    ? `${formatPaverNumber(cubicFeetToCubicMeters(result.sandVolumeCubicFeet) * 1_000)} L`
                    : `${formatPaverNumber(result.sandVolumeCubicFeet)} cu ft`
                }
                note={`Based on ${formatPaverNumber(input.sandDepth.value)} ${input.sandDepth.unit} bedding depth`}
              />
            )}
            {result.estimatedCost !== undefined && (
              <OptionalResult
                label="Paver material cost"
                value={formatMoney(result.estimatedCost, input.currency)}
                detail={`${result.requiredPavers.toLocaleString()} pavers × ${formatMoney(input.pricePerPaver!, input.currency)} each`}
                note="Paver material only."
              />
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <section
            className="rounded-control border border-line bg-panel-muted p-3"
            aria-labelledby="paver-method-heading"
          >
            <h3
              id="paver-method-heading"
              className="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.06em] text-brand"
            >
              <Info size={14} aria-hidden="true" /> How we got{' '}
              {result.requiredPavers.toLocaleString()} pavers
            </h3>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              {area} ÷ {coverage} = {formatPaverNumber(result.rawPavers)} pavers before waste.
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              After {input.wastePercent}% waste, the calculated quantity is{' '}
              {formatPaverNumber(result.wasteAdjustedPavers)}. The purchasing quantity is rounded up
              to {result.requiredPavers.toLocaleString()} whole pavers.
            </p>
          </section>
          <section
            className="rounded-control border border-line bg-panel-muted p-3"
            aria-labelledby="paver-project-details-heading"
          >
            <h3
              id="paver-project-details-heading"
              className="text-[0.68rem] font-extrabold uppercase tracking-[0.06em] text-brand"
            >
              Project details
            </h3>
            <p className="mt-2 text-xs font-semibold leading-5 text-ink">
              {projectLabel(input.projectType)} · {geometry}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              {formatPaverNumber(input.paverLength)} × {formatPaverNumber(input.paverWidth)}{' '}
              {input.paverUnit} pavers · {joint}
            </p>
          </section>
        </div>

        <aside className="mt-3 rounded-control border border-brand/20 bg-brand-soft/45 p-3 text-xs leading-5 text-ink-soft">
          <strong className="block text-[0.68rem] uppercase tracking-[0.06em] text-brand">
            Planning guidance
          </strong>
          <span className="mt-1 block">
            Confirm paver dimensions, joint layout, product coverage, cuts, and installation
            requirements before ordering.
          </span>
          <span className="mt-1 block">
            Planning estimate only. Actual requirements can vary with measurements, layout, cuts,
            and product specifications.
          </span>
        </aside>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Action
            label={copied ? 'Copied' : 'Copy'}
            icon={
              copied ? (
                <CheckCircle2 size={13} aria-hidden="true" />
              ) : (
                <Copy size={13} aria-hidden="true" />
              )
            }
            onClick={onCopy}
          />
          <Action label="Print" icon={<Printer size={13} aria-hidden="true" />} onClick={onPrint} />
          <Action
            label={preparingPdf ? 'Preparing…' : 'PDF'}
            icon={<Download size={13} aria-hidden="true" />}
            onClick={onPdf}
            disabled={preparingPdf}
          />
          <Action label="Share" icon={<Share2 size={13} aria-hidden="true" />} onClick={onShare} />
        </div>
      </div>
    </section>
  );
}
function ResultHighlight({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 p-3 sm:p-4">
      <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-brand">
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-extrabold text-ink tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-ink-soft tabular-nums">{detail}</p>}
    </div>
  );
}
function BreakdownRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-t border-line px-3 py-2.5 first:border-t-0 ${emphasis ? 'bg-brand-soft/55' : 'bg-panel'}`}
    >
      <dt
        className={`text-xs ${emphasis ? 'font-extrabold text-ink' : 'font-medium text-ink-soft'}`}
      >
        {label}
      </dt>
      <dd
        className={`text-right text-sm tabular-nums ${emphasis ? 'font-extrabold text-brand' : 'font-bold text-ink'}`}
      >
        {value}
      </dd>
    </div>
  );
}
function OptionalResult({
  label,
  value,
  detail,
  note,
}: {
  label: string;
  value: string;
  detail: string;
  note: string;
}) {
  return (
    <section className="min-w-0 rounded-control border border-line bg-panel-muted p-3">
      <h3 className="text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-brand">
        {label}
      </h3>
      <p className="mt-1.5 break-words text-xl font-extrabold text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink tabular-nums">{detail}</p>
      <p className="mt-1 text-[0.68rem] leading-4 text-ink-soft">{note}</p>
    </section>
  );
}
function Action({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-control border border-line bg-panel px-1 text-[0.68rem] font-bold text-ink hover:bg-panel-muted disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}
