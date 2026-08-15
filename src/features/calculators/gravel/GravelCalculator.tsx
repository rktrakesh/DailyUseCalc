import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Info,
  PackageOpen,
  Printer,
  RotateCcw,
  Share2,
  Weight,
} from 'lucide-react';
import ShapeIcon from '../../../components/calculators/ShapeIcon';
import { invalidateSubmittedResultOnValidationFailure } from '../../../lib/forms/calculationSubmission';
import { preserveNumberInputOnWheel } from '../../../lib/forms/numberInputWheel';
import type { AreaUnit, VolumeUnit } from '../../../lib/units/measurements';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import {
  createCalculatorStartedTracker,
  trackCalculatorEvent,
  trackSuccessfulCalculatorCalculation,
} from '../../../lib/analytics/calculatorAnalytics';
import {
  adjustedVolumeConversions,
  calculateGravel,
  recommendGravel,
  validateGravelInput,
} from './index';
import { DEFAULT_ADVANCED_OPTIONS_EXPANDED, hasAdvancedOptionIssue } from './advancedOptions';
import { createGravelEstimateReport } from './gravelReport';
import { gravelTypeGuidance } from './formGuidance';
import { gravelAnalyticsParameters, gravelSubmittedAnalyticsParameters } from './analytics';
import { copyTextToClipboard, restartCopyFeedbackTimer } from './copyFeedback';
import { convertGravelMeasurementSystem } from './unitSystem';
import { gravelResultAnnouncement } from './resultAnnouncement';
import { currencies, formatMoney, isCurrencyCode, type CurrencyCode } from './currencies';
import { createClearedGravelInput, createDefaultGravelInput } from './formDefaults';
import type {
  AreaShape,
  GravelInput,
  GravelType,
  MeasurementSystem,
  ProjectSizeMode,
  ProjectType,
} from './types';

const projectOptions: Array<{ value: ProjectType; label: string }> = [
  { value: 'driveway', label: 'Driveway' },
  { value: 'walkway', label: 'Walkway / Path' },
  { value: 'patio', label: 'Patio Base' },
  { value: 'landscaping', label: 'Decorative Landscaping' },
  { value: 'french-drain', label: 'French Drain' },
  { value: 'shed-base', label: 'Shed Base' },
  { value: 'other', label: 'Other' },
];

const gravelOptions: Array<{ value: GravelType; label: string }> = [
  { value: 'crushed-stone', label: 'Crushed Stone' },
  { value: 'pea-gravel', label: 'Pea Gravel' },
  { value: 'river-rock', label: 'River Rock' },
  { value: 'limestone', label: 'Limestone' },
  { value: 'granite', label: 'Granite Gravel' },
  { value: 'custom', label: 'Custom Material' },
];

const CURRENCY_STORAGE_KEY = 'duc-gravel-currency';

type GravelFormInput = GravelInput;

function numberFromEvent(event: ChangeEvent<HTMLInputElement>) {
  return Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : Number.NaN;
}

function optionalNumberFromEvent(event: ChangeEvent<HTMLInputElement>) {
  return event.target.value === '' ? undefined : numberFromEvent(event);
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function formatOrder(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function controlClass(invalid = false) {
  return `h-11 w-full rounded-control border bg-panel px-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/60 focus-visible:outline-offset-1 sm:h-9 ${invalid ? 'border-danger' : 'border-line'}`;
}

function selectLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function GravelCalculator() {
  const [advancedOptionsExpanded, setAdvancedOptionsExpanded] = useState(
    DEFAULT_ADVANCED_OPTIONS_EXPANDED,
  );
  const [input, setInput] = useState<GravelFormInput>(createDefaultGravelInput);
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('imperial');
  const [submitted, setSubmitted] = useState<{
    input: GravelInput;
    system: MeasurementSystem;
  }>();
  const [validationIssues, setValidationIssues] = useState<ReturnType<typeof validateGravelInput>>(
    [],
  );
  const [status, setStatus] = useState('');
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyFeedbackTimeout = useRef<number | undefined>(undefined);
  const started = useRef(createCalculatorStartedTracker());
  const analyticsParameters = () => gravelAnalyticsParameters(input, measurementSystem);
  const submittedAnalyticsParameters = () =>
    submitted ? gravelSubmittedAnalyticsParameters(submitted) : analyticsParameters();

  useEffect(() => {
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (isCurrencyCode(savedCurrency)) {
      setInput((current) => ({ ...current, currency: savedCurrency }));
    }
  }, []);

  useEffect(
    () => () => {
      if (copyFeedbackTimeout.current !== undefined)
        window.clearTimeout(copyFeedbackTimeout.current);
    },
    [],
  );

  const calculation = useMemo(
    () => (submitted ? calculateGravel(submitted.input) : undefined),
    [submitted],
  );
  const recommendation = useMemo(
    () => (calculation && submitted ? recommendGravel(submitted.input, calculation) : undefined),
    [calculation, submitted],
  );
  const errorFor = (field: string) =>
    validationIssues.find((issue) => issue.field === field)?.message;

  function updateSystem(nextSystem: MeasurementSystem) {
    if (nextSystem === measurementSystem) return;
    setInput((current) => {
      return {
        ...current,
        ...convertGravelMeasurementSystem(current, nextSystem),
      };
    });
    setMeasurementSystem(nextSystem);
    setValidationIssues([]);
  }

  function resetCopiedFeedback() {
    if (copyFeedbackTimeout.current !== undefined) {
      window.clearTimeout(copyFeedbackTimeout.current);
      copyFeedbackTimeout.current = undefined;
    }
    setCopied(false);
  }

  function calculateEstimate() {
    resetCopiedFeedback();
    const issues = validateGravelInput(input);
    setValidationIssues(issues);
    if (invalidateSubmittedResultOnValidationFailure(issues, () => setSubmitted(undefined))) {
      setStatus('Fix the highlighted fields, then calculate again.');
      if (hasAdvancedOptionIssue(issues)) setAdvancedOptionsExpanded(true);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitted({ input: structuredClone(input), system: measurementSystem });
    setStatus('Estimate updated.');
    trackSuccessfulCalculatorCalculation(issues, analyticsParameters());
  }

  function clearInputs() {
    resetCopiedFeedback();
    setInput(createClearedGravelInput(input.currency));
    setSubmitted(undefined);
    setValidationIssues([]);
    setMeasurementSystem('imperial');
    setAdvancedOptionsExpanded(DEFAULT_ADVANCED_OPTIONS_EXPANDED);
    setStatus('Calculator cleared.');
    trackCalculatorEvent('calculator_clear', analyticsParameters());
  }

  function estimateText() {
    if (!calculation || !recommendation || !submitted) return '';
    return [
      `Project: ${selectLabel(projectOptions, submitted.input.projectType)}`,
      `Recommended order: ${formatOrder(calculation.recommendedOrderCubicYards)} cubic yards`,
      `Calculated need: ${calculation.volumeCubicYards.toFixed(2)} cubic yards`,
      `Allowance: ${submitted.input.allowancePercent}%`,
      `Estimated weight: ${calculation.estimatedWeightTons.toFixed(2)} short tons`,
      recommendation.explanation,
    ].join('\n');
  }

  async function copyEstimate() {
    const success = await copyTextToClipboard(
      (text) => navigator.clipboard.writeText(text),
      estimateText(),
    );
    if (!success) {
      setStatus('Copy is unavailable in this browser.');
      return;
    }
    setCopied(true);
    setStatus('Estimate copied.');
    copyFeedbackTimeout.current = restartCopyFeedbackTimer(copyFeedbackTimeout.current, () => {
      copyFeedbackTimeout.current = undefined;
      setCopied(false);
    });
    trackCalculatorEvent('calculator_copy', submittedAnalyticsParameters());
  }

  async function shareEstimate() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gravel estimate', text: estimateText() });
        setStatus('Estimate shared.');
        trackCalculatorEvent('calculator_share', {
          ...submittedAnalyticsParameters(),
          share_method: 'native',
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(estimateText());
      setStatus('Estimate copied.');
      trackCalculatorEvent('calculator_share', {
        ...submittedAnalyticsParameters(),
        share_method: 'clipboard_fallback',
      });
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  }

  function reportData() {
    if (!calculation || !recommendation || !submitted) return;
    return createGravelEstimateReport({
      calculation,
      input: submitted.input,
      recommendation,
      measurementSystem: submitted.system,
    });
  }

  function printEstimate() {
    const report = reportData();
    if (!report) return;
    trackCalculatorEvent('calculator_print', submittedAnalyticsParameters());
    setStatus(
      printReport(report)
        ? 'Choose a printer or another destination in the print dialog.'
        : 'Allow pop-ups to print your estimate.',
    );
  }

  async function downloadEstimate() {
    const report = reportData();
    if (!report) return;
    setIsPreparingPdf(true);
    try {
      await downloadReportAsPdf(report);
      setStatus('PDF download started.');
      trackCalculatorEvent('calculator_pdf', submittedAnalyticsParameters());
    } catch (error) {
      console.error('PDF download failed:', error);
      setStatus('Could not prepare the PDF. Please try again.');
    } finally {
      setIsPreparingPdf(false);
    }
  }

  return (
    <div className="@container/calculator grid gap-3">
      <section
        className="rounded-card border border-line bg-panel p-3 shadow-card sm:p-4"
        aria-label="Gravel calculator inputs"
        onChange={() =>
          started.current({ calculator_id: 'gravel', calculator_name: 'Gravel Calculator' })
        }
      >
        <div className="grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
          <SelectField
            label="Project"
            name="project-type"
            value={input.projectType}
            onChange={(value) =>
              setInput((current) => ({ ...current, projectType: value as ProjectType }))
            }
          >
            {projectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Measure by"
            name="input-mode"
            value={input.inputMode}
            onChange={(value) =>
              setInput((current) => ({ ...current, inputMode: value as ProjectSizeMode }))
            }
          >
            <option value="dimensions">Dimensions</option>
            <option value="area">Area</option>
            <option value="volume">Volume</option>
          </SelectField>
          <SelectField
            label="Shape"
            name="area-shape"
            value={input.areaShape}
            leadingIcon={<ShapeIcon shape={input.areaShape} />}
            disabled={input.inputMode !== 'dimensions'}
            onChange={(value) =>
              setInput((current) => ({ ...current, areaShape: value as AreaShape }))
            }
          >
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
          </SelectField>
          <SelectField
            label="Units"
            name="measurement-system"
            value={measurementSystem}
            onChange={(value) => updateSystem(value as MeasurementSystem)}
          >
            <option value="imperial">Imperial (US)</option>
            <option value="metric">Metric</option>
          </SelectField>
        </div>
        <fieldset className="mt-3">
          <legend className="sr-only">Measurements</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {input.inputMode === 'dimensions' && input.areaShape === 'rectangle' && (
              <>
                <NumberField
                  id="length"
                  label="Length"
                  value={input.length.value}
                  unit={input.length.unit}
                  error={errorFor('length')}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      length: { ...current.length, value: numberFromEvent(event) },
                    }))
                  }
                />
                <NumberField
                  id="width"
                  label="Width"
                  value={input.width.value}
                  unit={input.width.unit}
                  error={errorFor('width')}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      width: { ...current.width, value: numberFromEvent(event) },
                    }))
                  }
                />
              </>
            )}
            {input.inputMode === 'dimensions' && input.areaShape === 'circle' && (
              <NumberField
                id="diameter"
                label="Diameter"
                value={input.diameter.value}
                unit={input.diameter.unit}
                error={errorFor('diameter')}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    diameter: { ...current.diameter, value: numberFromEvent(event) },
                  }))
                }
              />
            )}
            {input.inputMode === 'area' && (
              <UnitNumberField
                id="known-area"
                label="Area"
                value={input.knownArea.value}
                unit={input.knownArea.unit}
                units={['ft²', 'yd²', 'm²', 'cm²']}
                error={errorFor('knownArea')}
                onValueChange={(value) =>
                  setInput((current) => ({
                    ...current,
                    knownArea: { ...current.knownArea, value },
                  }))
                }
                onUnitChange={(unit) =>
                  setInput((current) => ({
                    ...current,
                    knownArea: { ...current.knownArea, unit: unit as AreaUnit },
                  }))
                }
              />
            )}
            {input.inputMode === 'volume' && (
              <UnitNumberField
                id="known-volume"
                label="Volume"
                value={input.knownVolume.value}
                unit={input.knownVolume.unit}
                units={['ft³', 'yd³', 'm³']}
                error={errorFor('knownVolume')}
                onValueChange={(value) =>
                  setInput((current) => ({
                    ...current,
                    knownVolume: { ...current.knownVolume, value },
                  }))
                }
                onUnitChange={(unit) =>
                  setInput((current) => ({
                    ...current,
                    knownVolume: { ...current.knownVolume, unit: unit as VolumeUnit },
                  }))
                }
              />
            )}
            {input.inputMode !== 'volume' && (
              <NumberField
                id="depth"
                label="Depth"
                value={input.depth.value}
                unit={input.depth.unit}
                error={errorFor('depth')}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    depth: { ...current.depth, value: numberFromEvent(event) },
                  }))
                }
              />
            )}
          </div>
        </fieldset>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <SelectField
            label="Gravel type"
            name="gravel-type"
            value={input.gravelType}
            helperText={gravelTypeGuidance(input.projectType, input.gravelType)}
            onChange={(value) =>
              setInput((current) => ({ ...current, gravelType: value as GravelType }))
            }
          >
            {gravelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          {input.gravelType === 'custom' && (
            <NumberField
              id="custom-density"
              label="Custom density"
              value={input.customDensityTonsPerYard ?? Number.NaN}
              unit="tons / yd³"
              error={errorFor('customDensityTonsPerYard')}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  customDensityTonsPerYard: optionalNumberFromEvent(event),
                }))
              }
            />
          )}
        </div>
        <div className="mt-3 rounded-control border border-line bg-surface p-1">
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control px-3 text-left text-ink transition-colors hover:bg-panel-muted focus-visible:outline-2 focus-visible:outline-brand/70 focus-visible:outline-offset-2"
            aria-expanded={advancedOptionsExpanded}
            aria-controls="gravel-advanced-options"
            onClick={() => setAdvancedOptionsExpanded((expanded) => !expanded)}
          >
            <span className="min-w-0">
              <span className="block text-sm font-extrabold">Advanced options (optional)</span>
              <span className="mt-0.5 block text-[0.68rem] font-medium leading-4 text-ink-soft">
                Add allowance, pricing, bags, delivery, or truck details when needed.
              </span>
            </span>
            <ChevronDown
              className={`shrink-0 text-ink-soft transition-transform motion-reduce:transition-none ${advancedOptionsExpanded ? 'rotate-180' : ''}`}
              size={17}
              aria-hidden="true"
            />
          </button>

          <div
            id="gravel-advanced-options"
            className="border-t border-line px-2 pb-2 pt-3"
            hidden={!advancedOptionsExpanded}
          >
            <div className="max-w-64">
              <SelectField
                label="Extra allowance"
                name="allowance"
                value={String(input.allowancePercent)}
                helperText="Adds extra material for uneven ground, compaction, and waste."
                onChange={(value) =>
                  setInput((current) => ({ ...current, allowancePercent: Number(value) }))
                }
                invalid={Boolean(errorFor('allowancePercent'))}
              >
                {[0, 5, 10, 15, 20].map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="mt-3 grid items-start gap-2 @xl/calculator:grid-cols-3">
              <OptionalGroup
                title="Material pricing"
                reveal={Boolean(errorFor('pricePerCubicYard') || errorFor('deliveryFee'))}
              >
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                  <select
                    aria-label="Currency"
                    className={controlClass()}
                    value={input.currency}
                    onChange={(event) => {
                      const currency = event.target.value as CurrencyCode;
                      setInput((current) => ({ ...current, currency }));
                      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
                    }}
                  >
                    {currencies.map(([code, symbol]) => (
                      <option key={code} value={code}>
                        {code} ({symbol})
                      </option>
                    ))}
                  </select>
                  <OptionalNumberField
                    id="price"
                    label="Price per cubic yard"
                    hideLabel
                    value={input.pricePerCubicYard}
                    placeholder="e.g. 45"
                    unit="per yd³"
                    error={errorFor('pricePerCubicYard')}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        pricePerCubicYard: optionalNumberFromEvent(event),
                      }))
                    }
                  />
                </div>
                <OptionalNumberField
                  id="delivery-fee"
                  label="Delivery fee"
                  value={input.deliveryFee}
                  placeholder="e.g. 75"
                  unit={input.currency}
                  error={errorFor('deliveryFee')}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      deliveryFee: optionalNumberFromEvent(event),
                    }))
                  }
                />
              </OptionalGroup>
              <OptionalGroup
                title="Buying gravel in bags?"
                reveal={Boolean(errorFor('bagSizeCubicFeet') || errorFor('bagPrice'))}
              >
                <OptionalNumberField
                  id="bag-size"
                  label="Bag volume"
                  value={input.bagSizeCubicFeet}
                  placeholder="e.g. 0.5"
                  unit="ft³ / bag"
                  error={errorFor('bagSizeCubicFeet')}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      bagSizeCubicFeet: optionalNumberFromEvent(event),
                    }))
                  }
                />
                <OptionalNumberField
                  id="bag-price"
                  label="Price per bag"
                  value={input.bagPrice}
                  placeholder="e.g. 6.50"
                  unit={input.currency}
                  error={errorFor('bagPrice')}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      bagPrice: optionalNumberFromEvent(event),
                    }))
                  }
                />
              </OptionalGroup>
              <OptionalGroup
                title="Bulk delivery"
                reveal={Boolean(errorFor('truckCapacityCubicYards'))}
              >
                <OptionalNumberField
                  id="truck-capacity"
                  label="Capacity"
                  value={input.truckCapacityCubicYards}
                  placeholder="e.g. 10"
                  unit="yd³ / truck"
                  error={errorFor('truckCapacityCubicYards')}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      truckCapacityCubicYards: optionalNumberFromEvent(event),
                    }))
                  }
                />
              </OptionalGroup>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.42fr)] gap-2">
          <button
            type="button"
            onClick={calculateEstimate}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-brand px-2 text-xs font-bold text-white transition-colors hover:bg-brand-strong sm:min-h-10 sm:gap-2 sm:px-4 sm:text-sm"
          >
            Calculate Gravel Needed <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={clearInputs}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel px-3 text-sm font-bold text-ink transition-colors hover:bg-panel-muted sm:min-h-10"
          >
            <RotateCcw size={15} aria-hidden="true" /> Clear
          </button>
        </div>
        <p className="mt-2 min-h-4 text-center text-xs text-ink-soft" aria-live="polite">
          {status}
        </p>
      </section>

      {calculation && recommendation && submitted && (
        <ResultPanel
          calculation={calculation}
          recommendation={recommendation}
          input={submitted.input}
          system={submitted.system}
          onCopy={copyEstimate}
          onPrint={printEstimate}
          onDownload={downloadEstimate}
          onShare={shareEstimate}
          isPreparingPdf={isPreparingPdf}
          copied={copied}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  children,
  leadingIcon,
  helperText,
  disabled = false,
  invalid = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  leadingIcon?: ReactNode;
  helperText?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink">
      {label}
      <span className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft">
            {leadingIcon}
          </span>
        )}
        <select
          name={name}
          className={`${controlClass(invalid)} appearance-none pr-7 ${leadingIcon ? 'pl-8' : ''} disabled:cursor-not-allowed disabled:opacity-55`}
          value={value}
          disabled={disabled}
          aria-describedby={helperText ? `${name}-help` : undefined}
          aria-invalid={invalid}
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
      {helperText && (
        <span id={`${name}-help`} className="text-[0.66rem] font-medium leading-4 text-ink-soft">
          {helperText}
        </span>
      )}
    </label>
  );
}

function OptionalGroup({
  title,
  children,
  reveal = false,
}: {
  title: string;
  children: ReactNode;
  reveal?: boolean;
}) {
  return (
    <details className="group self-start rounded-control bg-panel" open={reveal || undefined}>
      <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-control px-3 text-xs font-bold text-ink marker:content-none hover:bg-panel-muted focus-visible:outline-2 focus-visible:outline-brand/70 focus-visible:outline-offset-1">
        {title}
        <ChevronDown
          className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
          size={15}
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-2 border-t border-line/70 p-2.5">{children}</div>
    </details>
  );
}

function NumberField({
  id,
  label,
  value,
  unit,
  error,
  helperText,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  error?: string;
  helperText?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink" htmlFor={id}>
      {label}
      <span className="relative">
        <input
          id={id}
          name={id}
          className={`${controlClass(Boolean(error))} pr-14 tabular-nums`}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min="0"
          step="any"
          value={Number.isFinite(value) ? value : ''}
          onChange={onChange}
          onWheel={preserveNumberInputOnWheel}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [helperText ? `${id}-help` : undefined, error ? `${id}-error` : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.68rem] font-semibold text-ink-soft">
          {unit}
        </span>
      </span>
      {helperText && (
        <span id={`${id}-help`} className="text-[0.66rem] font-medium leading-4 text-ink-soft">
          {helperText}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="text-[0.68rem] font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function OptionalNumberField({
  id,
  label,
  value,
  unit,
  error,
  onChange,
  placeholder = 'Optional',
  hideLabel = false,
}: {
  id: string;
  label: string;
  value?: number;
  unit: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hideLabel?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink" htmlFor={id}>
      <span className={hideLabel ? 'sr-only' : ''}>{label}</span>
      <span className="relative">
        <input
          id={id}
          name={id}
          className={`${controlClass(Boolean(error))} pr-16 tabular-nums`}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min="0"
          step="any"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={onChange}
          onWheel={preserveNumberInputOnWheel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.65rem] font-semibold text-ink-soft">
          {unit}
        </span>
      </span>
      {error && (
        <span id={`${id}-error`} className="text-[0.68rem] font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function UnitNumberField({
  id,
  label,
  value,
  unit,
  units,
  error,
  onValueChange,
  onUnitChange,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  units: readonly string[];
  error?: string;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink" htmlFor={id}>
      {label}
      <span className="grid grid-cols-[minmax(0,1fr)_4rem]">
        <input
          id={id}
          name={id}
          className={`${controlClass(Boolean(error))} rounded-r-none tabular-nums`}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min="0"
          step="any"
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => onValueChange(numberFromEvent(event))}
          onWheel={preserveNumberInputOnWheel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <select
          aria-label={`${label} unit`}
          className="h-11 rounded-r-control border border-l-0 border-line bg-panel px-1.5 text-xs font-semibold text-ink sm:h-9"
          value={unit}
          onChange={(event) => onUnitChange(event.target.value)}
        >
          {units.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </span>
      {error && (
        <span id={`${id}-error`} className="text-[0.68rem] font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function ResultPanel({
  calculation,
  recommendation,
  input,
  system,
  onCopy,
  onPrint,
  onDownload,
  onShare,
  isPreparingPdf,
  copied,
}: {
  calculation: ReturnType<typeof calculateGravel>;
  recommendation: ReturnType<typeof recommendGravel>;
  input: GravelInput;
  system: MeasurementSystem;
  onCopy: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onShare: () => void;
  isPreparingPdf: boolean;
  copied: boolean;
}) {
  const areaApplicable = input.inputMode !== 'volume';
  const gravelLabel = selectLabel(gravelOptions, input.gravelType);
  const adjustedVolume = adjustedVolumeConversions(calculation.adjustedVolumeCubicYards);
  const optionalDetails = [
    calculation.estimatedCost !== undefined
      ? {
          label: 'Cost',
          value: formatMoney(calculation.estimatedCost, input.currency),
        }
      : undefined,
    input.bagSizeCubicFeet !== undefined && calculation.bagCount !== undefined
      ? {
          label: 'Bags',
          value: `${formatNumber(calculation.bagCount, 0)} bags`,
        }
      : undefined,
    input.truckCapacityCubicYards !== undefined && calculation.truckLoads !== undefined
      ? {
          label: 'Truck loads',
          value: `${calculation.truckLoads} load${calculation.truckLoads === 1 ? '' : 's'}`,
        }
      : undefined,
  ].filter((detail): detail is { label: string; value: string } => detail !== undefined);
  const optionalGridClass =
    optionalDetails.length === 1
      ? 'grid-cols-1'
      : optionalDetails.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-3';
  return (
    <section
      className="rounded-card border border-brand/25 bg-brand-soft/55 p-3 shadow-card sm:p-4"
      aria-labelledby="gravel-results-heading"
    >
      <p className="sr-only" aria-live="polite">
        {gravelResultAnnouncement(calculation.recommendedOrderCubicYards)}
      </p>
      <div className="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-brand">
        <CheckCircle2 size={14} aria-hidden="true" /> Your gravel estimate
      </div>
      <h2
        id="gravel-results-heading"
        className="mt-1 text-3xl font-extrabold tracking-[-0.055em] text-ink tabular-nums"
      >
        {formatOrder(calculation.recommendedOrderCubicYards)} <span className="text-xl">yd³</span>
      </h2>
      <p className="text-xs text-ink-soft">Suggested order quantity</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ResultMetric
          icon={<PackageOpen size={17} aria-hidden="true" />}
          label="Calculated need"
          value={`${formatNumber(calculation.volumeCubicYards)} yd³`}
        />
        <ResultMetric
          icon={<Weight size={17} aria-hidden="true" />}
          label="Approximate weight"
          value={`${formatNumber(calculation.estimatedWeightTons)} short tons`}
        />
      </div>
      <p className="mt-2 text-[0.68rem] leading-4 text-ink-soft tabular-nums">
        Measured: {formatNumber(calculation.volumeCubicYards)} yd³ · Extra: +
        {formatNumber(calculation.allowanceVolumeCubicYards)} yd³ ({input.allowancePercent}%)
      </p>
      <p className="mt-2 text-[0.68rem] leading-4 text-ink">
        <strong>Gravel:</strong> {gravelLabel} · <strong>Density:</strong>{' '}
        {formatNumber(calculation.densityTonsPerYard)} tons/yd³ · <strong>Allowance:</strong>{' '}
        {input.allowancePercent}% · <strong>Units:</strong>{' '}
        {system === 'imperial' ? 'Imperial (US)' : 'Metric'}
      </p>
      <p className="mt-1 text-[0.68rem] leading-4 text-ink-soft">
        Estimate only. Actual requirements vary with density, moisture, compaction, site conditions,
        measurements, and supplier specifications.
      </p>
      {optionalDetails.length > 0 && (
        <div className={`mt-2 grid gap-1.5 ${optionalGridClass}`}>
          {optionalDetails.map((detail) => (
            <CompactDetail key={detail.label} {...detail} />
          ))}
        </div>
      )}
      <p className="mt-2 text-[0.7rem] leading-4 text-ink-soft">{recommendation.explanation}</p>
      {recommendation.warnings.map((warning) => (
        <div
          key={warning}
          className="mt-2 flex gap-2 rounded-control border border-warning/35 bg-warning-soft p-2 text-[0.7rem] leading-4 text-ink"
        >
          <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={14} aria-hidden="true" />
          {warning}
        </div>
      ))}
      <div className="mt-2 rounded-control border border-brand/20 bg-panel/70 p-2.5">
        <div className="flex items-center gap-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-brand">
          <Info size={14} aria-hidden="true" /> Planning guidance
        </div>
        <p className="mt-1.5 text-[0.68rem] leading-4 text-ink-soft">
          {recommendation.materialGuidance}
        </p>
        {input.inputMode !== 'volume' && (
          <p className="mt-1 text-[0.68rem] leading-4 text-ink-soft">
            {recommendation.depthGuidance}
          </p>
        )}
      </div>
      <div
        className={`mt-2 grid divide-y divide-line overflow-hidden rounded-control border border-line bg-panel ${areaApplicable ? 'sm:grid-cols-3 sm:divide-x sm:divide-y-0' : 'sm:grid-cols-2 sm:divide-x sm:divide-y-0'}`}
      >
        <ResultColumn
          title="Volume"
          values={[
            `${formatNumber(adjustedVolume.cubicYards)} yd³`,
            `${formatNumber(adjustedVolume.cubicFeet)} ft³`,
            `${formatNumber(adjustedVolume.cubicMeters)} m³`,
            `${formatNumber(adjustedVolume.liters, 0)} L`,
          ]}
        />
        <ResultColumn
          title="Estimated weight"
          values={[
            `${formatNumber(calculation.estimatedWeightTons)} short tons`,
            `${formatNumber(calculation.estimatedWeightTons * 2000, 0)} lb`,
            `${formatNumber(calculation.estimatedWeightKilograms, 0)} kg`,
            `${formatNumber(calculation.estimatedWeightKilograms / 1000)} metric tons`,
          ]}
        />
        {areaApplicable && (
          <ResultColumn
            title="Area"
            values={[
              `${formatNumber(calculation.surfaceAreaSquareFeet)} ft²`,
              `${formatNumber(calculation.surfaceAreaSquareFeet / 9)} yd²`,
              `${formatNumber(calculation.surfaceAreaSquareFeet * 0.09290304)} m²`,
            ]}
          />
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <ActionButton
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
        <ActionButton
          label="Print"
          icon={<Printer size={13} aria-hidden="true" />}
          onClick={onPrint}
        />
        <ActionButton
          label={isPreparingPdf ? 'Preparing…' : 'PDF'}
          icon={<Download size={13} aria-hidden="true" />}
          onClick={onDownload}
          disabled={isPreparingPdf}
        />
        <ActionButton
          label="Share"
          icon={<Share2 size={13} aria-hidden="true" />}
          onClick={onShare}
        />
      </div>
    </section>
  );
}

function ResultMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-control border border-line bg-panel p-2.5">
      <div className="flex items-center gap-1.5 text-brand">
        {icon}
        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.06em] text-ink-soft">
          {label}
        </p>
      </div>
      <p className="mt-1 break-words text-base font-extrabold tracking-tight text-ink tabular-nums sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function ResultColumn({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="min-w-0 p-2">
      <h3 className="text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-ink-soft">
        {title}
      </h3>
      <ul className="mt-1 space-y-0.5">
        {values.map((value) => (
          <li key={value} className="text-[0.7rem] font-semibold text-ink tabular-nums">
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompactDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-control border border-line bg-panel p-2 text-center">
      <p className="text-[0.58rem] font-bold uppercase tracking-[0.06em] text-ink-soft">{label}</p>
      <p className="mt-0.5 break-words text-[0.7rem] font-extrabold text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
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
      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-control border border-line bg-panel px-1.5 text-[0.68rem] font-bold text-ink transition-colors hover:bg-panel-muted disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}
