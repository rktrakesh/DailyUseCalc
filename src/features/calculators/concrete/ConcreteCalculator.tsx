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
import type { LengthUnit } from '../../../lib/units/measurements';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import { currencies, formatMoney, isCurrencyCode, type CurrencyCode } from '../gravel/currencies';
import {
  adjustedConcreteVolumeConversions,
  calculateConcrete,
  CONCRETE_BAG_PRESETS,
  CONCRETE_LENGTH_UNITS,
  convertConcreteDimension,
  convertConcreteMeasurementSystem,
  createClearedConcreteInput,
  createDefaultConcreteInput,
  recommendConcrete,
  validateConcreteInput,
} from './index';
import { concreteBagPreset } from './bagPresets';
import { createConcreteEstimateReport } from './concreteReport';
import type { ConcreteBagPresetId, ConcreteInput, ConcreteMode, MeasurementSystem } from './types';

const modes: Array<{ value: ConcreteMode; label: string }> = [
  { value: 'slab', label: 'Slab / Rectangle' },
  { value: 'circular-pad', label: 'Circular Pad' },
  { value: 'column', label: 'Column / Pier' },
  { value: 'post-hole', label: 'Post Hole' },
];
const CURRENCY_STORAGE_KEY = 'duc-concrete-currency';
const numberFromEvent = (event: ChangeEvent<HTMLInputElement>) =>
  Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : Number.NaN;
const optionalNumberFromEvent = (event: ChangeEvent<HTMLInputElement>) =>
  event.target.value === '' ? undefined : numberFromEvent(event);
const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const formatOrder = (value: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    value,
  );
const controlClass = (invalid = false) =>
  `h-11 w-full rounded-control border bg-panel px-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/60 focus-visible:outline-offset-1 sm:h-9 ${invalid ? 'border-danger' : 'border-line'}`;
const modeLabel = (mode: ConcreteMode) =>
  modes.find((option) => option.value === mode)?.label ?? mode;

export default function ConcreteCalculator() {
  const [input, setInput] = useState<ConcreteInput>(createDefaultConcreteInput);
  const [system, setSystem] = useState<MeasurementSystem>('imperial');
  const [submitted, setSubmitted] = useState<{ input: ConcreteInput; system: MeasurementSystem }>();
  const [issues, setIssues] = useState<ReturnType<typeof validateConcreteInput>>([]);
  const [status, setStatus] = useState('');
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (isCurrencyCode(saved)) setInput((current) => ({ ...current, currency: saved }));
  }, []);
  const calculation = useMemo(
    () => (submitted ? calculateConcrete(submitted.input) : undefined),
    [submitted],
  );
  const recommendation = useMemo(
    () => (calculation && submitted ? recommendConcrete(submitted.input, calculation) : undefined),
    [calculation, submitted],
  );
  const errorFor = (field: string) => issues.find((issue) => issue.field === field)?.message;
  const selectedBagPreset = concreteBagPreset(input.bagPreset);
  const bagAssumptionReminder =
    input.bagPreset === 'custom'
      ? 'Bag estimate uses your custom bag yield. You can edit it in “Bagged concrete.”'
      : `Bag estimate uses the ${selectedBagPreset.label} preset${input.bagPreset === '80-lb' ? ' by default' : ''}. You can change it in “Bagged concrete.”`;

  function updateSystem(next: MeasurementSystem) {
    if (next === system) return;
    setInput((current) => convertConcreteMeasurementSystem(current, next));
    setSystem(next);
    setIssues([]);
  }
  function calculateEstimate() {
    const next = validateConcreteInput(input);
    setIssues(next);
    if (next.length) {
      setStatus('Fix the highlighted fields, then calculate again.');
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitted({ input: structuredClone(input), system });
    setStatus('Estimate updated.');
  }
  function clearInputs() {
    setInput(createClearedConcreteInput(input.currency));
    setSubmitted(undefined);
    setIssues([]);
    setSystem('imperial');
    setStatus('Calculator cleared.');
  }
  function estimateText() {
    if (!calculation || !recommendation || !submitted) return '';
    return [
      `Concrete type: ${modeLabel(submitted.input.concreteMode)}`,
      `Recommended order: ${formatOrder(calculation.recommendedOrderCubicYards)} cubic yards`,
      `Measured volume: ${calculation.volumeCubicYards.toFixed(2)} cubic yards`,
      `Allowance: ${submitted.input.allowancePercent}%`,
      `Bags: ${calculation.bagCount}`,
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
        await navigator.share({ title: 'Concrete estimate', text: estimateText() });
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
    return createConcreteEstimateReport({
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
        aria-label="Concrete calculator inputs"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <SelectField
            label="Concrete type"
            name="concrete-mode"
            value={input.concreteMode}
            onChange={(value) => {
              setInput((current) => ({ ...current, concreteMode: value as ConcreteMode }));
              setIssues([]);
            }}
          >
            {modes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Units"
            name="measurement-system"
            value={system}
            onChange={(value) => updateSystem(value as MeasurementSystem)}
          >
            <option value="imperial">Imperial (US)</option>
            <option value="metric">Metric</option>
          </SelectField>
        </div>
        <fieldset className="mt-3">
          <legend className="sr-only">Measurements</legend>
          <div className="grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
            {input.concreteMode === 'slab' && (
              <>
                <DimensionField
                  id="length"
                  label="Length"
                  input={input.length}
                  error={errorFor('length')}
                  onChange={(length) => setInput((current) => ({ ...current, length }))}
                />
                <DimensionField
                  id="width"
                  label="Width"
                  input={input.width}
                  error={errorFor('width')}
                  onChange={(width) => setInput((current) => ({ ...current, width }))}
                />
              </>
            )}
            {(input.concreteMode === 'circular-pad' || input.concreteMode === 'column') && (
              <DimensionField
                id="diameter"
                label="Diameter"
                input={input.diameter}
                error={errorFor('diameter')}
                onChange={(diameter) => setInput((current) => ({ ...current, diameter }))}
              />
            )}
            {(input.concreteMode === 'slab' || input.concreteMode === 'circular-pad') && (
              <DimensionField
                id="thickness"
                label="Thickness"
                input={input.thickness}
                error={errorFor('thickness')}
                onChange={(thickness) => setInput((current) => ({ ...current, thickness }))}
              />
            )}
            {input.concreteMode === 'column' && (
              <DimensionField
                id="height"
                label="Height"
                input={input.height}
                error={errorFor('height')}
                onChange={(height) => setInput((current) => ({ ...current, height }))}
              />
            )}
            {input.concreteMode === 'post-hole' && (
              <>
                <DimensionField
                  id="hole-diameter"
                  label="Hole diameter"
                  input={input.holeDiameter}
                  error={errorFor('holeDiameter')}
                  onChange={(holeDiameter) => setInput((current) => ({ ...current, holeDiameter }))}
                />
                <DimensionField
                  id="hole-depth"
                  label="Hole depth"
                  input={input.holeDepth}
                  error={errorFor('holeDepth')}
                  onChange={(holeDepth) => setInput((current) => ({ ...current, holeDepth }))}
                />
              </>
            )}
            <NumberField
              id="quantity"
              label="Quantity"
              value={input.quantity}
              unit="items"
              error={errorFor('quantity')}
              step="1"
              onChange={(event) =>
                setInput((current) => ({ ...current, quantity: numberFromEvent(event) }))
              }
            />
          </div>
        </fieldset>
        <div className="mt-3 grid max-w-[20.5rem] grid-cols-2 gap-2.5">
          <SelectField
            label="Extra allowance"
            name="allowance"
            value={String(input.allowancePercent)}
            invalid={Boolean(errorFor('allowancePercent'))}
            onChange={(value) =>
              setInput((current) => ({ ...current, allowancePercent: Number(value) }))
            }
          >
            {[0, 5, 10, 15, 20, 25].map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Currency"
            name="currency"
            value={input.currency}
            onChange={(value) => {
              const currency = value as CurrencyCode;
              setInput((current) => ({ ...current, currency }));
              localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
            }}
          >
            {currencies.map(([code, symbol]) => (
              <option key={code} value={code}>
                {code} ({symbol})
              </option>
            ))}
          </SelectField>
        </div>
        <div className="mt-3 grid gap-2 @xl/calculator:grid-cols-2">
          <OptionalGroup title="Ready-mix price (optional)">
            <OptionalNumberField
              id="ready-mix-price"
              label="Ready-mix price"
              value={input.readyMixPricePerCubicYard}
              unit="per yd³"
              error={errorFor('readyMixPricePerCubicYard')}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  readyMixPricePerCubicYard: optionalNumberFromEvent(event),
                }))
              }
            />
            <OptionalNumberField
              id="delivery-fee"
              label="Delivery fee"
              value={input.readyMixDeliveryFee}
              unit={input.currency}
              error={errorFor('readyMixDeliveryFee')}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  readyMixDeliveryFee: optionalNumberFromEvent(event),
                }))
              }
            />
          </OptionalGroup>
          <OptionalGroup title="Bagged concrete">
            <SelectField
              label="Bag size"
              name="bag-preset"
              value={input.bagPreset}
              onChange={(value) =>
                setInput((current) => ({ ...current, bagPreset: value as ConcreteBagPresetId }))
              }
            >
              {CONCRETE_BAG_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </SelectField>
            {input.bagPreset === 'custom' && (
              <OptionalNumberField
                id="custom-bag-yield"
                label="Yield per bag"
                value={input.customBagYieldCubicFeet}
                unit="ft³ / bag"
                error={errorFor('customBagYieldCubicFeet')}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    customBagYieldCubicFeet: optionalNumberFromEvent(event),
                  }))
                }
              />
            )}
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
            <p className="text-[0.68rem] leading-4 text-ink-soft">
              Typical yield — check your product bag for exact yield.
            </p>
          </OptionalGroup>
        </div>
        <p className="mt-1.5 text-[0.68rem] leading-4 text-ink-soft">{bagAssumptionReminder}</p>
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
  invalid = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  invalid?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink">
      {label}
      <span className="relative">
        <select
          name={name}
          className={`${controlClass(invalid)} appearance-none pr-7`}
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
    </label>
  );
}
function OptionalGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-control border border-line bg-surface">
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
  step = 'any',
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  step?: string;
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
          step={step}
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
function DimensionField({
  id,
  label,
  input,
  error,
  onChange,
}: {
  id: string;
  label: string;
  input: ConcreteInput['length'];
  error?: string;
  onChange: (dimension: ConcreteInput['length']) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink" htmlFor={id}>
      {label}
      <span className="grid grid-cols-[minmax(0,1fr)_3.75rem]">
        <input
          id={id}
          name={id}
          className={`${controlClass(Boolean(error))} rounded-r-none tabular-nums`}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min="0"
          step="any"
          value={Number.isFinite(input.value) ? input.value : ''}
          onChange={(event) => onChange({ ...input, value: numberFromEvent(event) })}
          onWheel={(event) => event.currentTarget.blur()}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <select
          aria-label={`${label} unit`}
          className="h-11 rounded-r-control border border-l-0 border-line bg-panel px-1.5 text-xs font-semibold text-ink outline-none focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/60 focus-visible:outline-offset-1 sm:h-9"
          value={input.unit}
          onChange={(event) =>
            onChange(convertConcreteDimension(input, event.target.value as LengthUnit))
          }
        >
          {CONCRETE_LENGTH_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
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
    <label className="grid min-w-0 gap-1 text-[0.7rem] font-bold text-ink" htmlFor={id}>
      <span>{label}</span>
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
  calculation: ReturnType<typeof calculateConcrete>;
  recommendation: ReturnType<typeof recommendConcrete>;
  input: ConcreteInput;
  system: MeasurementSystem;
  onCopy: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onShare: () => void;
  isPreparingPdf: boolean;
}) {
  const adjusted = adjustedConcreteVolumeConversions(calculation.adjustedVolumeCubicYards);
  const preset = concreteBagPreset(input.bagPreset);
  const area = calculation.surfaceAreaSquareFeet;
  const details = [
    calculation.estimatedReadyMixCost === undefined
      ? undefined
      : {
          label: 'Ready-mix cost',
          value: formatMoney(calculation.estimatedReadyMixCost, input.currency),
        },
    {
      label: 'Bags',
      value:
        input.bagPreset === 'custom'
          ? `${formatNumber(calculation.bagCount, 0)} bags`
          : `${formatNumber(calculation.bagCount, 0)} × ${preset.label} bags`,
    },
    calculation.estimatedBagCost === undefined
      ? undefined
      : { label: 'Bag cost', value: formatMoney(calculation.estimatedBagCost, input.currency) },
  ].filter((value): value is { label: string; value: string } => Boolean(value));
  return (
    <section
      className="rounded-card border border-brand/25 bg-brand-soft/55 p-3 shadow-card sm:p-4"
      aria-labelledby="concrete-results-heading"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-brand">
        <CheckCircle2 size={14} aria-hidden="true" /> Your concrete estimate
      </div>
      <h2
        id="concrete-results-heading"
        className="mt-1 text-3xl font-extrabold tracking-[-0.055em] text-ink tabular-nums"
      >
        {formatOrder(calculation.recommendedOrderCubicYards)} <span className="text-xl">yd³</span>
      </h2>
      <p className="text-xs text-ink-soft">Suggested order quantity</p>
      <div
        className={`mt-3 grid divide-y divide-line overflow-hidden rounded-control border border-line bg-panel ${area === undefined ? 'sm:grid-cols-2 sm:divide-x sm:divide-y-0' : 'sm:grid-cols-3 sm:divide-x sm:divide-y-0'}`}
      >
        <ResultColumn
          title="Volume"
          values={[
            `${formatNumber(adjusted.cubicYards)} yd³`,
            `${formatNumber(adjusted.cubicFeet)} ft³`,
            `${formatNumber(adjusted.cubicMeters)} m³`,
            `${formatNumber(adjusted.liters, 0)} L`,
          ]}
        />
        <ResultColumn
          title="Estimated weight"
          values={[
            `${formatNumber(calculation.estimatedWeightPounds / 2000)} short tons`,
            `${formatNumber(calculation.estimatedWeightPounds, 0)} lb`,
            `${formatNumber(calculation.estimatedWeightKilograms, 0)} kg`,
            `${formatNumber(calculation.estimatedWeightKilograms / 1000)} metric tons`,
          ]}
        />
        {area !== undefined && (
          <ResultColumn
            title="Area"
            values={[
              `${formatNumber(area)} ft²`,
              `${formatNumber(area / 9)} yd²`,
              `${formatNumber(area * 0.09290304)} m²`,
            ]}
          />
        )}
      </div>
      <p className="mt-2 text-[0.68rem] leading-4 text-ink-soft tabular-nums">
        Measured: {formatNumber(calculation.volumeCubicYards)} yd³ · Extra: +
        {formatNumber(calculation.allowanceVolumeCubicYards)} yd³ ({input.allowancePercent}%)
      </p>
      <p className="mt-2 text-[0.68rem] leading-4 text-ink">
        <strong>Concrete:</strong> Normal-weight concrete · <strong>Density:</strong> 145 lb/ft³ ·{' '}
        <strong>Allowance:</strong> {input.allowancePercent}% · <strong>Units:</strong>{' '}
        {system === 'imperial' ? 'Imperial (US)' : 'Metric'} · <strong>Quantity:</strong>{' '}
        {input.quantity}
      </p>
      <p className="mt-1 text-[0.68rem] leading-4 text-ink-soft">
        Estimate only. Actual requirements can vary with forms, subgrade, placement, spillage,
        product yield, and supplier specifications. This is not structural engineering advice.
      </p>
      <div
        className={`mt-2 grid gap-1.5 ${details.length === 1 ? 'grid-cols-1' : details.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
      >
        {details.map((detail) => (
          <CompactDetail key={detail.label} {...detail} />
        ))}
      </div>
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
