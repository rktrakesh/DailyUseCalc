import { useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  Printer,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { convertLength } from '../../../lib/units/measurements';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import { calculateGravel, recommendGravel, validateGravelInput } from './index';
import { createGravelEstimateReport } from './gravelReport';
import type { GravelInput, GravelType, MeasurementSystem, ProjectType } from './types';

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

type GravelFormInput = Omit<GravelInput, 'allowancePercent' | 'gravelType' | 'projectType'> & {
  allowancePercent?: number;
  gravelType: GravelType | '';
  projectType: ProjectType | '';
};

function createEmptyInput(): GravelFormInput {
  return {
    projectType: '',
    gravelType: '',
    length: { value: Number.NaN, unit: 'ft' },
    width: { value: Number.NaN, unit: 'ft' },
    depth: { value: Number.NaN, unit: 'in' },
  };
}

function toCalculationInput(input: GravelFormInput): GravelInput | undefined {
  if (!input.projectType || !input.gravelType) return undefined;
  return {
    ...input,
    projectType: input.projectType,
    gravelType: input.gravelType,
    allowancePercent: input.allowancePercent ?? 0,
  };
}

function numberFromEvent(event: ChangeEvent<HTMLInputElement>) {
  return Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : Number.NaN;
}

function optionalNumberFromEvent(event: ChangeEvent<HTMLInputElement>) {
  return event.target.value === '' ? undefined : numberFromEvent(event);
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function formatRecommendedOrder(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value?: number) {
  return value === undefined
    ? 'Add pricing'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
}

function inputClass(invalid = false) {
  return `h-11 w-full rounded-control border bg-panel px-3 text-base text-ink outline-none transition-colors placeholder:text-ink focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/60 focus-visible:outline-offset-2 sm:text-sm ${invalid ? 'border-danger' : 'border-line'}`;
}

export default function GravelCalculator() {
  const [input, setInput] = useState<GravelFormInput>(createEmptyInput);
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('imperial');
  const [copyStatus, setCopyStatus] = useState('');
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const calculationInput = useMemo(() => toCalculationInput(input), [input]);
  const validationIssues = useMemo(
    () => (calculationInput ? validateGravelInput(calculationInput) : []),
    [calculationInput],
  );
  const calculation = useMemo(
    () =>
      calculationInput && validationIssues.length === 0
        ? calculateGravel(calculationInput)
        : undefined,
    [calculationInput, validationIssues.length],
  );
  const recommendation = useMemo(
    () =>
      calculation && calculationInput ? recommendGravel(calculationInput, calculation) : undefined,
    [calculation, calculationInput],
  );
  const displayedValidationIssues = hasInteracted ? validationIssues : [];

  const errorFor = (field: string) =>
    displayedValidationIssues.find((issue) => issue.field === field)?.message;

  function updateSystem(nextSystem: MeasurementSystem) {
    if (nextSystem === measurementSystem) return;
    if (nextSystem === 'metric') {
      setInput((current) => ({
        ...current,
        length: {
          value: Number(convertLength(current.length.value, current.length.unit, 'm').toFixed(3)),
          unit: 'm',
        },
        width: {
          value: Number(convertLength(current.width.value, current.width.unit, 'm').toFixed(3)),
          unit: 'm',
        },
        depth: {
          value: Number(convertLength(current.depth.value, current.depth.unit, 'cm').toFixed(2)),
          unit: 'cm',
        },
      }));
    } else {
      setInput((current) => ({
        ...current,
        length: {
          value: Number(convertLength(current.length.value, current.length.unit, 'ft').toFixed(2)),
          unit: 'ft',
        },
        width: {
          value: Number(convertLength(current.width.value, current.width.unit, 'ft').toFixed(2)),
          unit: 'ft',
        },
        depth: {
          value: Number(convertLength(current.depth.value, current.depth.unit, 'in').toFixed(2)),
          unit: 'in',
        },
      }));
    }
    setMeasurementSystem(nextSystem);
  }

  function estimateLines() {
    if (!calculation || !recommendation)
      return ['Complete the length, width, and depth fields to calculate your estimate.'];
    return [
      `Project: ${projectOptions.find((option) => option.value === calculationInput?.projectType)?.label}`,
      `Recommended order: ${formatRecommendedOrder(calculation.recommendedOrderCubicYards)} cubic yards`,
      `Calculated need: ${calculation.volumeCubicYards.toFixed(2)} cubic yards`,
      `Allowance: ${calculationInput?.allowancePercent}%`,
      `Estimated weight: ${calculation.estimatedWeightTons.toFixed(2)} tons`,
      recommendation.explanation,
    ];
  }

  function estimateText() {
    return estimateLines().join('\n');
  }

  function clearInputs() {
    setInput(createEmptyInput());
    setMeasurementSystem('imperial');
    setHasInteracted(false);
    setCopyStatus('All calculator fields were cleared.');
  }

  async function copyEstimate() {
    try {
      await navigator.clipboard.writeText(estimateText());
      setCopyStatus('Estimate copied.');
    } catch {
      setCopyStatus('Copy is unavailable in this browser.');
    }
  }

  async function shareEstimate() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gravel estimate', text: estimateText() });
        setCopyStatus('Estimate shared.');
        return;
      } catch {
        return;
      }
    }
    await copyEstimate();
  }

  function printEstimate() {
    if (!calculation || !recommendation || !calculationInput) return;
    if (
      !printReport(
        createGravelEstimateReport({
          calculation,
          input: calculationInput,
          recommendation,
          measurementSystem,
        }),
      )
    ) {
      setCopyStatus('Allow pop-ups to print your estimate.');
      return;
    }
    setCopyStatus('Choose a printer or another destination in the print dialog.');
  }

  async function downloadEstimate() {
    if (!calculation || !recommendation || !calculationInput) return;
    setIsPreparingPdf(true);
    try {
      await downloadReportAsPdf(
        createGravelEstimateReport({
          calculation,
          input: calculationInput,
          recommendation,
          measurementSystem,
        }),
      );
      setCopyStatus('PDF download started.');
    } catch (error) {
      console.error('PDF download failed:', error);
      setCopyStatus('Could not prepare the PDF. Please try again.');
    } finally {
      setIsPreparingPdf(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section
        className="rounded-card border border-line bg-panel p-5 shadow-card sm:p-6"
        aria-labelledby="project-details-heading"
        onChangeCapture={() => setHasInteracted(true)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-brand">Start with the essentials</p>
            <h2
              id="project-details-heading"
              className="mt-1 text-xl font-extrabold tracking-[-0.035em] text-ink"
            >
              Project details
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand">
              <Check size={14} aria-hidden="true" /> Updates instantly
            </span>
            <button
              type="button"
              onClick={clearInputs}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-panel-muted"
            >
              <RotateCcw size={13} aria-hidden="true" /> Clear
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-ink">
            What are you building?
            <span className="relative">
              <select
                name="project-type"
                className={`${inputClass()} appearance-none pr-10`}
                value={input.projectType}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    projectType: event.target.value as ProjectType,
                  }))
                }
              >
                <option value="" disabled>
                  Select a project type
                </option>
                {projectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                size={16}
                aria-hidden="true"
              />
            </span>
            <span className="text-xs font-normal text-ink-soft">
              This shapes practical depth guidance.
            </span>
          </label>
          <fieldset>
            <legend className="text-sm font-bold text-ink">Measurement system</legend>
            <div
              className="mt-2 grid grid-cols-2 rounded-control border border-line bg-surface p-1"
              role="radiogroup"
              aria-label="Measurement system"
            >
              {(['imperial', 'metric'] as const).map((system) => (
                <label
                  key={system}
                  className={`cursor-pointer rounded-md px-3 py-2.5 text-center text-sm font-bold transition-colors ${measurementSystem === system ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="measurement-system"
                    value={system}
                    checked={measurementSystem === system}
                    onChange={() => updateSystem(system)}
                  />
                  {system === 'imperial' ? 'Imperial (US)' : 'Metric'}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-bold text-ink">Measurements</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
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
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            {measurementSystem === 'imperial'
              ? 'Measure at the widest points. Driveways often need a compacted gravel depth of 4–6 inches.'
              : 'Metric measurements · US ordering units (cubic yards and tons).'}
          </p>
        </fieldset>

        <label className="mt-6 grid gap-2 text-sm font-bold text-ink">
          Gravel type
          <span className="relative">
            <select
              name="gravel-type"
              className={`${inputClass()} appearance-none pr-10`}
              value={input.gravelType}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  gravelType: event.target.value as GravelType,
                }))
              }
            >
              <option value="" disabled>
                Select a gravel type
              </option>
              {gravelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
              size={16}
              aria-hidden="true"
            />
          </span>
          <span className="text-xs font-normal text-ink-soft">
            {recommendation?.materialGuidance || 'Choose the material you plan to use.'}
          </span>
        </label>

        <details className="mt-6 rounded-control border border-line bg-surface">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-bold text-ink marker:content-none">
            Advanced options{' '}
            <ChevronDown
              className="transition-transform [[open]_&]:rotate-180"
              size={17}
              aria-hidden="true"
            />
          </summary>
          <div className="grid gap-5 border-t border-line p-4 sm:grid-cols-2">
            <NumberField
              id="allowance"
              label="Allowance / waste"
              value={input.allowancePercent ?? Number.NaN}
              unit="%"
              error={errorFor('allowancePercent')}
              min={0}
              max={50}
              onChange={(event) =>
                setInput((current) => ({ ...current, allowancePercent: numberFromEvent(event) }))
              }
            />
            <NumberField
              id="truck-capacity"
              label="Truck capacity"
              value={input.truckCapacityCubicYards ?? Number.NaN}
              unit="yd³"
              error={errorFor('truckCapacityCubicYards')}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  truckCapacityCubicYards: optionalNumberFromEvent(event),
                }))
              }
            />
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
            <OptionalNumberField
              id="price"
              label="Price per cubic yard"
              value={input.pricePerCubicYard}
              unit="USD"
              error={errorFor('pricePerCubicYard')}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  pricePerCubicYard: optionalNumberFromEvent(event),
                }))
              }
            />
            <OptionalNumberField
              id="delivery-fee"
              label="Delivery fee"
              value={input.deliveryFee}
              unit="USD"
              error={errorFor('deliveryFee')}
              onChange={(event) =>
                setInput((current) => ({ ...current, deliveryFee: optionalNumberFromEvent(event) }))
              }
            />
            <OptionalNumberField
              id="bag-size"
              label="Bag size"
              value={input.bagSizeCubicFeet}
              unit="ft³"
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
              label="Bag price"
              value={input.bagPrice}
              unit="USD"
              error={errorFor('bagPrice')}
              onChange={(event) =>
                setInput((current) => ({ ...current, bagPrice: optionalNumberFromEvent(event) }))
              }
            />
          </div>
        </details>
      </section>

      <section aria-labelledby="results-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-brand">Your estimate</p>
            <h2
              id="results-heading"
              className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-ink"
            >
              Results
            </h2>
          </div>
          <span className="text-xs text-ink-soft" aria-live="polite">
            {hasInteracted && validationIssues.length
              ? 'Fix the highlighted field to update.'
              : calculation
                ? 'Calculated locally in your browser.'
                : 'Enter your measurements to calculate.'}
          </span>
        </div>
        {calculation && recommendation && calculationInput ? (
          <Results
            calculation={calculation}
            recommendation={recommendation}
            measurementSystem={measurementSystem}
            input={calculationInput}
          />
        ) : (
          <div className="rounded-card border border-dashed border-line bg-panel p-8 text-center text-sm text-ink-soft">
            Enter a project type, gravel type, length, width, and depth to see your estimate.
          </div>
        )}
      </section>

      {calculation && recommendation && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={copyEstimate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel px-4 text-sm font-bold text-ink transition-colors hover:bg-panel-muted"
            >
              <Copy size={16} aria-hidden="true" /> Copy estimate
            </button>
            <button
              type="button"
              onClick={printEstimate}
              title="Open the browser print dialog."
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel px-4 text-sm font-bold text-ink transition-colors hover:bg-panel-muted"
            >
              <Printer size={16} aria-hidden="true" /> Print
            </button>
            <button
              type="button"
              onClick={downloadEstimate}
              disabled={isPreparingPdf}
              title="Download a PDF estimate."
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel px-4 text-sm font-bold text-ink transition-colors hover:bg-panel-muted"
            >
              <Download size={16} aria-hidden="true" />{' '}
              {isPreparingPdf ? 'Preparing PDF…' : 'Save as PDF'}
            </button>
            <button
              type="button"
              onClick={shareEstimate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel px-4 text-sm font-bold text-ink transition-colors hover:bg-panel-muted"
            >
              <Share2 size={16} aria-hidden="true" /> Share
            </button>
          </div>
          <p className="text-center text-xs text-ink-soft" aria-live="polite">
            {copyStatus}
          </p>
        </>
      )}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  unit,
  error,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink" htmlFor={id}>
      {label}
      <span className="relative">
        <input
          id={id}
          name={id}
          className={`${inputClass(Boolean(error))} pr-16`}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min={min ?? 0}
          max={max}
          step="any"
          value={Number.isFinite(value) ? value : ''}
          onChange={onChange}
          onWheel={(event) => event.currentTarget.blur()}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft">
          {unit}
        </span>
      </span>
      {error && (
        <span id={`${id}-error`} className="text-xs font-medium text-danger">
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
}: {
  id: string;
  label: string;
  value?: number;
  unit: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink" htmlFor={id}>
      {label}
      <span className="relative">
        <input
          id={id}
          name={id}
          className={`${inputClass(Boolean(error))} pr-16`}
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
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft">
          {unit}
        </span>
      </span>
      {error && (
        <span id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function Results({
  calculation,
  recommendation,
  measurementSystem,
  input,
}: {
  calculation: ReturnType<typeof calculateGravel>;
  recommendation: ReturnType<typeof recommendGravel>;
  measurementSystem: MeasurementSystem;
  input: GravelInput;
}) {
  const cards = [
    {
      label: 'Calculated need',
      value: `${formatNumber(calculation.volumeCubicYards)} yd³`,
      detail:
        measurementSystem === 'metric'
          ? `${formatNumber(calculation.volumeCubicMeters)} m³`
          : 'Before allowance',
    },
    {
      label: 'After allowance',
      value: `${formatNumber(calculation.adjustedVolumeCubicYards)} yd³`,
      detail: `Includes ${input.allowancePercent}% allowance`,
    },
    {
      label: 'Estimated weight',
      value: `${formatNumber(calculation.estimatedWeightTons)} tons`,
      detail: `${formatNumber(calculation.estimatedWeightKilograms, 0)} kg`,
    },
    {
      label: 'Density used',
      value: `${formatNumber(calculation.densityTonsPerYard)} tons / yd³`,
      detail:
        input.gravelType === 'custom'
          ? 'Custom density'
          : 'Typical estimate — confirm with your supplier',
    },
    {
      label: 'Estimated cost',
      value: formatCurrency(calculation.estimatedCost),
      detail:
        calculation.estimatedCost === undefined
          ? 'Add optional pricing'
          : input.pricePerCubicYard !== undefined
            ? 'Bulk pricing used; includes delivery fee'
            : 'Bag pricing used; includes delivery fee',
    },
    {
      label: 'Truck loads',
      value: calculation.truckLoads ? String(calculation.truckLoads) : 'Add capacity',
      detail: calculation.truckLoads ? 'Based on your capacity' : 'Optional setting',
    },
    {
      label: 'Bags (by volume)',
      value: calculation.bagCount ? formatNumber(calculation.bagCount, 0) : 'Add bag size',
      detail: input.bagSizeCubicFeet ? `${input.bagSizeCubicFeet} ft³ bags` : 'Optional setting',
    },
  ];
  return (
    <div className="grid gap-4" aria-live="polite">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-card bg-brand p-5 text-white shadow-card lg:row-span-2">
          <p className="text-sm font-bold text-white/85">Recommended order</p>
          <p className="mt-3 text-4xl font-extrabold tracking-[-0.055em]">
            {formatRecommendedOrder(calculation.recommendedOrderCubicYards)}{' '}
            <span className="text-2xl">yd³</span>
          </p>
          <p className="mt-3 text-sm leading-5 text-white/85">
            Includes your selected {input.allowancePercent}% allowance and minimal upward rounding.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
            <Check size={14} aria-hidden="true" /> Ready to order
          </span>
          <p className="mt-3 text-xs text-white/75">Supplier order increments may vary.</p>
        </article>
        {cards.slice(0, 2).map((card) => (
          <ResultCard key={card.label} {...card} />
        ))}
        {cards.slice(2).map((card) => (
          <ResultCard key={card.label} {...card} />
        ))}
      </div>
      <article className="rounded-card border border-brand/30 bg-brand-soft p-5">
        <h3 className="text-base font-extrabold tracking-[-0.025em] text-ink">
          Why order {formatRecommendedOrder(calculation.recommendedOrderCubicYards)} yd³?
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{recommendation.explanation}</p>
        <p className="mt-3 text-sm font-semibold text-ink">
          Depth guidance:{' '}
          <span className="font-normal text-ink-soft">{recommendation.depthGuidance}</span>
        </p>
      </article>
      {recommendation.warnings.map((warning) => (
        <div
          key={warning}
          className="flex gap-3 rounded-card border border-warning/35 bg-warning-soft p-4 text-sm text-ink"
        >
          <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} aria-hidden="true" />
          <p>
            <strong>Consider this:</strong> {warning}
          </p>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-card border border-line bg-panel p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-sm text-ink-soft">{detail}</p>
    </article>
  );
}
