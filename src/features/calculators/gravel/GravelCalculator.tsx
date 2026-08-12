import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Printer,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { convertLength } from '../../../lib/units/measurements';
import type { AreaUnit, VolumeUnit } from '../../../lib/units/measurements';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import {
  adjustedVolumeConversions,
  calculateGravel,
  recommendGravel,
  validateGravelInput,
} from './index';
import { createGravelEstimateReport } from './gravelReport';
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

  useEffect(() => {
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (isCurrencyCode(savedCurrency)) {
      setInput((current) => ({ ...current, currency: savedCurrency }));
    }
  }, []);

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
      const metric = nextSystem === 'metric';
      return {
        ...current,
        length: converted(current.length.value, current.length.unit, metric ? 'm' : 'ft', 3),
        width: converted(current.width.value, current.width.unit, metric ? 'm' : 'ft', 3),
        diameter: converted(current.diameter.value, current.diameter.unit, metric ? 'm' : 'ft', 3),
        depth: converted(current.depth.value, current.depth.unit, metric ? 'cm' : 'in', 2),
      };
    });
    setMeasurementSystem(nextSystem);
    setValidationIssues([]);
  }

  function converted(
    value: number,
    from: GravelInput['length']['unit'],
    to: 'm' | 'ft' | 'cm' | 'in',
    digits: number,
  ) {
    return {
      value: Number.isFinite(value)
        ? Number(convertLength(value, from, to).toFixed(digits))
        : value,
      unit: to,
    };
  }

  function calculateEstimate() {
    const issues = validateGravelInput(input);
    setValidationIssues(issues);
    if (issues.length) {
      setStatus('Fix the highlighted fields, then calculate again.');
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitted({ input: structuredClone(input), system: measurementSystem });
    setStatus('Estimate updated.');
  }

  function clearInputs() {
    setInput(createClearedGravelInput(input.currency));
    setSubmitted(undefined);
    setValidationIssues([]);
    setMeasurementSystem('imperial');
    setStatus('Calculator cleared.');
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
    try {
      await navigator.clipboard.writeText(estimateText());
      setStatus('Estimate copied.');
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  }

  async function shareEstimate() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gravel estimate', text: estimateText() });
        setStatus('Estimate shared.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyEstimate();
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

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_8rem] gap-2.5">
          <SelectField
            label="Gravel type"
            name="gravel-type"
            value={input.gravelType}
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
          <SelectField
            label="Extra allowance"
            name="allowance"
            value={String(input.allowancePercent)}
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

        {input.gravelType === 'custom' && (
          <div className="mt-3 max-w-64">
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
          </div>
        )}

        <div className="mt-3 grid items-start gap-2 @xl/calculator:grid-cols-3">
          <OptionalGroup title="Price (optional)">
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
              unit={input.currency}
              error={errorFor('deliveryFee')}
              onChange={(event) =>
                setInput((current) => ({ ...current, deliveryFee: optionalNumberFromEvent(event) }))
              }
            />
          </OptionalGroup>
          <OptionalGroup title="Bag size (optional)">
            <OptionalNumberField
              id="bag-size"
              label="Bag volume"
              value={input.bagSizeCubicFeet}
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
              unit={input.currency}
              error={errorFor('bagPrice')}
              onChange={(event) =>
                setInput((current) => ({ ...current, bagPrice: optionalNumberFromEvent(event) }))
              }
            />
          </OptionalGroup>
          <OptionalGroup title="Truck capacity (optional)">
            <OptionalNumberField
              id="truck-capacity"
              label="Capacity"
              value={input.truckCapacityCubicYards}
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

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.42fr)] gap-2">
          <button
            type="button"
            onClick={calculateEstimate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-strong sm:min-h-10"
          >
            Calculate <Calculator size={16} aria-hidden="true" />
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
  disabled = false,
  invalid = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink">
      {label}
      <span className="relative">
        <select
          name={name}
          className={`${controlClass(invalid)} appearance-none pr-7 disabled:cursor-not-allowed disabled:opacity-55`}
          value={value}
          disabled={disabled}
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
    </label>
  );
}

function OptionalGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group self-start rounded-control border border-line bg-surface">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-2 px-3 text-xs font-bold text-ink marker:content-none">
        {title}
        <ChevronDown
          className="transition-transform group-open:rotate-180"
          size={15}
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-2 border-t border-line p-2.5">{children}</div>
    </details>
  );
}

function NumberField({
  id,
  label,
  value,
  unit,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  error?: string;
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
          onWheel={(event) => event.currentTarget.blur()}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.68rem] font-semibold text-ink-soft">
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

function OptionalNumberField({
  id,
  label,
  value,
  unit,
  error,
  onChange,
  hideLabel = false,
}: {
  id: string;
  label: string;
  value?: number;
  unit: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
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
          placeholder="Optional"
          onChange={onChange}
          onWheel={(event) => event.currentTarget.blur()}
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
          onWheel={(event) => event.currentTarget.blur()}
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
      aria-live="polite"
    >
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
      <div
        className={`mt-3 grid divide-y divide-line overflow-hidden rounded-control border border-line bg-panel ${areaApplicable ? 'sm:grid-cols-3 sm:divide-x sm:divide-y-0' : 'sm:grid-cols-2 sm:divide-x sm:divide-y-0'}`}
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
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <ActionButton label="Copy" icon={<Copy size={13} aria-hidden="true" />} onClick={onCopy} />
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
