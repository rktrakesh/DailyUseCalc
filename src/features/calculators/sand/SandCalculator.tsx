import { useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Calculator, Copy, Download, Printer, RotateCcw, Share2 } from 'lucide-react';
import ShapeIcon from '../../../components/calculators/ShapeIcon';
import { invalidateSubmittedResultOnValidationFailure } from '../../../lib/forms/calculationSubmission';
import { preserveNumberInputOnWheel } from '../../../lib/forms/numberInputWheel';
import {
  createCalculatorStartedTracker,
  trackCalculatorEvent,
  trackSuccessfulCalculatorCalculation,
} from '../../../lib/analytics/calculatorAnalytics';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import { currencies, formatMoney, isCurrencyCode } from '../gravel/currencies';
import {
  calculateSand,
  convertSandMeasurementSystem,
  createClearedSandInput,
  createDefaultSandInput,
  createSandEstimateReport,
  createSandEstimateText,
  formatSandUnit,
  sandGuidance,
  validateSandInput,
  type Dimension,
  type SandInput,
  type SandShape,
} from './index';

const number = (event: ChangeEvent<HTMLInputElement>) =>
  event.target.value === '' ? Number.NaN : event.target.valueAsNumber;
const optional = (event: ChangeEvent<HTMLInputElement>) =>
  event.target.value === '' ? undefined : event.target.valueAsNumber;
const control = (invalid = false) =>
  `h-11 w-full rounded-control border bg-panel px-2.5 text-sm text-ink outline-none focus:border-brand sm:h-9 ${invalid ? 'border-danger' : 'border-line'}`;
const n = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const projects = [
  ['paver-bedding', 'Paver Bedding'],
  ['sandbox', 'Sandbox / Play Area'],
  ['landscaping', 'Landscaping / Leveling'],
  ['topdressing', 'Lawn Topdressing'],
  ['pool-base', 'Pool Base'],
  ['backfill', 'Backfill / Fill'],
  ['concrete-mortar', 'Concrete / Mortar'],
  ['other', 'Other'],
];
const shapes = [
  ['rectangle', 'Rectangle'],
  ['square', 'Square'],
  ['circle', 'Circle'],
  ['triangle', 'Triangle'],
  ['trapezoid', 'Trapezoid'],
  ['ring', 'Ring / Donut'],
];

export default function SandCalculator() {
  const [input, setInput] = useState<SandInput>(() => createDefaultSandInput());
  const [submitted, setSubmitted] = useState<SandInput>();
  const [issues, setIssues] = useState<ReturnType<typeof validateSandInput>>([]);
  const [status, setStatus] = useState('');
  const [pdf, setPdf] = useState(false);
  const started = useRef(createCalculatorStartedTracker());
  const calculation = submitted ? calculateSand(submitted) : undefined;
  const update = <K extends keyof SandInput>(key: K, value: SandInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const error = (field: string) => issues.find((issue) => issue.field === field)?.message;
  const analytics = () => ({
    calculator_id: 'sand',
    calculator_name: 'Sand Calculator',
    project_type: input.projectType,
    unit_system: input.measurementSystem,
  });
  const calculate = () => {
    const next = validateSandInput(input);
    setIssues(next);
    if (invalidateSubmittedResultOnValidationFailure(next, () => setSubmitted(undefined))) {
      setStatus('Fix the highlighted fields, then calculate again.');
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitted(structuredClone(input));
    setStatus('Estimate updated.');
    trackSuccessfulCalculatorCalculation(next, analytics());
  };
  const clear = () => {
    setInput(createClearedSandInput(input.currency));
    setSubmitted(undefined);
    setIssues([]);
    setStatus('Calculator cleared.');
    trackCalculatorEvent('calculator_clear', analytics());
  };
  const copy = async () => {
    if (!calculation || !submitted) return;
    try {
      await navigator.clipboard.writeText(createSandEstimateText(submitted, calculation));
      setStatus('Estimate copied.');
      trackCalculatorEvent('calculator_copy', analytics());
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  };
  const share = async () => {
    if (!calculation || !submitted) return;
    const text = createSandEstimateText(submitted, calculation);
    if (navigator.share)
      try {
        await navigator.share({ title: 'Sand estimate', text });
        setStatus('Estimate shared.');
        trackCalculatorEvent('calculator_share', { ...analytics(), share_method: 'native' });
        return;
      } catch (event) {
        if (event instanceof DOMException && event.name === 'AbortError') return;
      }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Share details copied.');
      trackCalculatorEvent('calculator_share', {
        ...analytics(),
        share_method: 'clipboard_fallback',
      });
    } catch {
      setStatus('Sharing is unavailable.');
    }
  };
  const report = () =>
    submitted && calculation ? createSandEstimateReport(submitted, calculation) : undefined;
  const print = () => {
    const data = report();
    if (!data) return;
    trackCalculatorEvent('calculator_print', analytics());
    setStatus(
      printReport(data) ? 'Choose a print destination.' : 'Allow pop-ups to print your estimate.',
    );
  };
  const download = async () => {
    const data = report();
    if (!data) return;
    setPdf(true);
    try {
      await downloadReportAsPdf(data);
      setStatus('PDF download started.');
      trackCalculatorEvent('calculator_pdf', analytics());
    } catch {
      setStatus('Could not prepare the PDF.');
    } finally {
      setPdf(false);
    }
  };
  return (
    <div className="@container/calculator grid gap-3">
      <section
        className="rounded-card border border-line bg-panel p-3 shadow-card sm:p-4"
        aria-label="Sand calculator inputs"
        onChange={() =>
          started.current({ calculator_id: 'sand', calculator_name: 'Sand Calculator' })
        }
      >
        <div className="grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
          <Select
            label="Project"
            value={input.projectType}
            onChange={(value) => update('projectType', value as SandInput['projectType'])}
          >
            {projects.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Measure by"
            value={input.measureMode}
            onChange={(value) => update('measureMode', value as SandInput['measureMode'])}
          >
            <option value="dimensions">Dimensions</option>
            <option value="area">Known Area</option>
          </Select>
          {input.measureMode === 'dimensions' ? (
            <Select
              label="Shape"
              value={input.shape}
              leadingIcon={<ShapeIcon shape={input.shape} />}
              onChange={(value) => update('shape', value as SandShape)}
            >
              {shapes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          ) : (
            <div />
          )}
          <Select
            label="Units"
            value={input.measurementSystem}
            onChange={(value) =>
              setInput((current) =>
                convertSandMeasurementSystem(current, value as SandInput['measurementSystem']),
              )
            }
          >
            <option value="imperial">Imperial (US)</option>
            <option value="metric">Metric</option>
          </Select>
        </div>
        <fieldset className="mt-3 border-t border-line pt-3">
          <legend className="text-xs font-extrabold uppercase text-brand">Measurements</legend>
          <div className="mt-2 grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
            {input.measureMode === 'area' ? (
              <NumberField
                label="Known area"
                value={input.knownArea}
                unit={
                  {
                    'sq-in': 'sq in',
                    'sq-ft': 'sq ft',
                    'sq-yd': 'sq yd',
                    'sq-cm': 'sq cm',
                    'sq-m': 'sq m',
                  }[input.areaUnit]
                }
                error={error('knownArea')}
                onChange={(event) => update('knownArea', number(event))}
                select={
                  <select
                    aria-label="Known area unit"
                    value={input.areaUnit}
                    onChange={(event) =>
                      update('areaUnit', event.target.value as SandInput['areaUnit'])
                    }
                  >
                    {input.measurementSystem === 'imperial' ? (
                      <>
                        <option value="sq-in">sq in</option>
                        <option value="sq-ft">sq ft</option>
                        <option value="sq-yd">sq yd</option>
                      </>
                    ) : (
                      <>
                        <option value="sq-cm">sq cm</option>
                        <option value="sq-m">sq m</option>
                      </>
                    )}
                  </select>
                }
              />
            ) : (
              <ShapeFields input={input} update={update} error={error} />
            )}
            <DimensionField
              label="Depth"
              value={input.depth}
              system={input.measurementSystem}
              error={error('depth')}
              onChange={(value) => update('depth', value)}
            />
            <NumberField
              label="Quantity (identical areas)"
              value={input.quantity}
              unit="areas"
              error={error('quantity')}
              step="1"
              onChange={(event) => update('quantity', number(event))}
            />
          </div>
          <p className="mt-2 text-[.7rem] text-ink-soft">
            Use quantity for multiple identical areas, such as 4 identical sandboxes.
          </p>
          {error('geometry') && (
            <p className="mt-2 text-xs font-semibold text-danger">{error('geometry')}</p>
          )}
        </fieldset>
        <div className="mt-3 grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-3">
          <Select
            label="Sand type"
            value={input.sandType}
            onChange={(value) => update('sandType', value as SandInput['sandType'])}
          >
            <option value="all-purpose">All-Purpose Sand</option>
            <option value="concrete-sharp">Concrete / Sharp Sand</option>
            <option value="masonry">Masonry Sand</option>
            <option value="play">Play Sand</option>
            <option value="fill">Fill Sand</option>
            <option value="paver-bedding">Paver / Bedding Sand</option>
            <option value="other">Custom / Other</option>
          </Select>
          <Select
            label="Extra for compaction"
            value={String(input.compactionPercent)}
            onChange={(value) => update('compactionPercent', Number(value))}
          >
            {[0, 5, 10, 15, 20].map((value) => (
              <option key={value} value={value}>
                {value === 0 ? '0% / None' : `${value}%`}
              </option>
            ))}
            <option value="-1">Custom</option>
          </Select>
          {![0, 5, 10, 15, 20].includes(input.compactionPercent) && (
            <NumberField
              label="Custom compaction"
              value={input.compactionPercent < 0 ? undefined : input.compactionPercent}
              unit="%"
              error={error('compactionPercent')}
              onChange={(event) => update('compactionPercent', number(event))}
            />
          )}
          <Select
            label="Extra allowance"
            value={String(input.allowancePercent)}
            onChange={(value) => update('allowancePercent', Number(value))}
          >
            {[0, 5, 10, 15].map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
            <option value="-1">Custom</option>
          </Select>
          {![0, 5, 10, 15].includes(input.allowancePercent) && (
            <NumberField
              label="Custom allowance"
              value={input.allowancePercent < 0 ? undefined : input.allowancePercent}
              unit="%"
              error={error('allowancePercent')}
              onChange={(event) => update('allowancePercent', number(event))}
            />
          )}
        </div>
        <div className="mt-3 grid items-start gap-2 @xl/calculator:grid-cols-3">
          <OptionalGroup title="Bagged sand (optional)">
            <Select
              label="Bag measured by"
              value={input.bagBasis}
              onChange={(value) => {
                const basis = value as SandInput['bagBasis'];
                setInput((current) => ({
                  ...current,
                  bagBasis: basis,
                  bagSize: undefined,
                  bagUnit:
                    basis === 'weight'
                      ? current.measurementSystem === 'metric'
                        ? 'kg'
                        : 'lb'
                      : current.measurementSystem === 'metric'
                        ? 'liter'
                        : 'cu-ft',
                }));
              }}
            >
              <option value="weight">Weight</option>
              <option value="volume">Volume</option>
            </Select>
            <NumberField
              label="Bag size"
              value={input.bagSize}
              unit={formatSandUnit(input.bagUnit)}
              error={error('bagSize')}
              onChange={(event) => update('bagSize', optional(event))}
              select={
                <select
                  aria-label="Bag size unit"
                  value={input.bagUnit}
                  onChange={(event) =>
                    update('bagUnit', event.target.value as SandInput['bagUnit'])
                  }
                >
                  {(input.bagBasis === 'weight'
                    ? ['lb', 'kg']
                    : ['cu-ft', 'cu-yd', 'liter', 'cu-m']
                  ).map((unit) => (
                    <option key={unit} value={unit}>
                      {formatSandUnit(unit as SandInput['bagUnit'])}
                    </option>
                  ))}
                </select>
              }
            />
            <NumberField
              label="Price per bag"
              value={input.pricePerBag}
              unit={input.currency}
              error={error('pricePerBag')}
              onChange={(event) => update('pricePerBag', optional(event))}
            />
          </OptionalGroup>
          <OptionalGroup title="Bulk sand (optional)">
            <Select
              label="Order by"
              value={input.bulkBasis}
              onChange={(value) => {
                const basis = value as SandInput['bulkBasis'];
                setInput((current) => ({
                  ...current,
                  bulkBasis: basis,
                  bulkIncrement: undefined,
                  bulkUnit:
                    basis === 'weight'
                      ? current.measurementSystem === 'metric'
                        ? 'metric-tonne'
                        : 'us-ton'
                      : current.measurementSystem === 'metric'
                        ? 'cu-m'
                        : 'cu-yd',
                }));
              }}
            >
              <option value="volume">Volume</option>
              <option value="weight">Weight</option>
            </Select>
            <NumberField
              label="Bulk order increment"
              value={input.bulkIncrement}
              unit={formatSandUnit(input.bulkUnit)}
              error={error('bulkIncrement')}
              onChange={(event) => update('bulkIncrement', optional(event))}
              select={
                <select
                  aria-label="Bulk order unit"
                  value={input.bulkUnit}
                  onChange={(event) =>
                    update('bulkUnit', event.target.value as SandInput['bulkUnit'])
                  }
                >
                  {(input.bulkBasis === 'weight'
                    ? ['lb', 'us-ton', 'kg', 'metric-tonne']
                    : ['cu-yd', 'cu-ft', 'cu-m']
                  ).map((unit) => (
                    <option key={unit} value={unit}>
                      {formatSandUnit(unit as SandInput['bulkUnit'])}
                    </option>
                  ))}
                </select>
              }
            />
            <NumberField
              label="Bulk unit price"
              value={input.bulkUnitPrice}
              unit={`${input.currency}/${formatSandUnit(input.bulkUnit)}`}
              error={error('bulkUnitPrice')}
              onChange={(event) => update('bulkUnitPrice', optional(event))}
            />
          </OptionalGroup>
          <OptionalGroup title="Supplier density (optional)">
            <NumberField
              label="Supplier weight / density"
              value={input.supplierDensity}
              unit={input.densityUnit}
              error={error('supplierDensity')}
              onChange={(event) => update('supplierDensity', optional(event))}
              select={
                <select
                  aria-label="Supplier density unit"
                  value={input.densityUnit}
                  onChange={(event) =>
                    update('densityUnit', event.target.value as SandInput['densityUnit'])
                  }
                >
                  <option value="lb-cu-yd">lb/cu yd</option>
                  <option value="lb-cu-ft">lb/cu ft</option>
                  <option value="kg-cu-m">kg/cu m</option>
                  <option value="tonne-cu-m">metric tonnes/cu m</option>
                </select>
              }
            />
            <Select
              label="Currency"
              value={input.currency}
              onChange={(value) => {
                if (isCurrencyCode(value)) update('currency', value);
              }}
            >
              {currencies.map(([code, symbol]) => (
                <option key={code} value={code}>
                  {code} ({symbol})
                </option>
              ))}
            </Select>
            <p className="text-[.68rem] text-ink-soft">
              Supplier density overrides the estimated planning density used for weight.
            </p>
          </OptionalGroup>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={calculate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand px-4 text-sm font-bold text-white sm:min-h-9"
          >
            <Calculator size={15} aria-hidden="true" />
            Calculate
          </button>
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel px-4 text-sm font-bold text-ink sm:min-h-9"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Clear
          </button>
        </div>
        <p className="mt-2 min-h-4 text-xs text-ink-soft" aria-live="polite">
          {status}
        </p>
      </section>
      {calculation && submitted && (
        <section
          className="rounded-card border border-brand/25 bg-panel p-3 shadow-card sm:p-4"
          aria-label="Sand estimate results"
        >
          <p className="text-xs font-bold uppercase text-brand">Your sand estimate</p>
          <p className="mt-1 text-3xl font-extrabold tracking-[-.04em] text-ink">
            {submitted.measurementSystem === 'metric'
              ? `${n(calculation.requiredCubicMeters)} cu m`
              : `${n(calculation.requiredCubicYards)} cu yd`}
          </p>
          <p className="text-xs text-ink-soft">Required sand</p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-line py-3 text-xs @xl/calculator:grid-cols-4">
            <Metric
              label="Volume"
              value={
                submitted.measurementSystem === 'metric'
                  ? `${n(calculation.requiredLiters, 0)} L`
                  : `${n(calculation.requiredCubicFeet)} cu ft`
              }
            />
            <Metric
              label="Area"
              value={
                submitted.measurementSystem === 'metric'
                  ? `${n(calculation.totalAreaSquareFeet * 0.09290304)} sq m`
                  : `${n(calculation.totalAreaSquareFeet)} sq ft`
              }
            />
            <Metric
              label="Estimated weight"
              value={
                submitted.measurementSystem === 'metric'
                  ? `${n(calculation.requiredWeight.kilograms, 0)} kg`
                  : `${n(calculation.requiredWeight.usTons)} US tons`
              }
            />
            <Metric
              label="Coverage"
              value={
                submitted.measurementSystem === 'metric'
                  ? `${n(calculation.coveragePerCubicMeterSquareMeters)} sq m/cu m`
                  : `${n(calculation.coveragePerCubicYardSquareFeet)} sq ft/cu yd`
              }
            />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Measured:{' '}
            {submitted.measurementSystem === 'metric'
              ? `${n(calculation.baseCubicFeet / 35.3146667215)} cu m`
              : `${n(calculation.baseCubicFeet)} cu ft`}{' '}
            · Allowance: +
            {submitted.measurementSystem === 'metric'
              ? `${n(calculation.allowanceCubicFeet / 35.3146667215)} cu m`
              : `${n(calculation.allowanceCubicFeet)} cu ft`}{' '}
            · Compaction: +
            {submitted.measurementSystem === 'metric'
              ? `${n(calculation.compactionCubicFeet / 35.3146667215)} cu m`
              : `${n(calculation.compactionCubicFeet)} cu ft`}
          </p>
          <div className="mt-3 grid gap-3 @xl/calculator:grid-cols-2">
            {calculation.bagsRequired !== undefined && (
              <ResultGroup title="Bagged sand">
                <p>
                  <strong>{calculation.bagsRequired} bags</strong>
                </p>
                <p>
                  {n(calculation.bagLeftoverAmount!)} {formatSandUnit(submitted.bagUnit)} estimated
                  leftover
                </p>
                {calculation.bagCost !== undefined && (
                  <p>{formatMoney(calculation.bagCost, submitted.currency)} material cost</p>
                )}
              </ResultGroup>
            )}
            <ResultGroup title="Bulk sand">
              <p>
                <strong>
                  {n(calculation.bulkOrderAmount)} {formatSandUnit(submitted.bulkUnit)}
                </strong>
              </p>
              <p>
                {n(calculation.bulkLeftoverAmount)} {formatSandUnit(submitted.bulkUnit)} estimated
                leftover
              </p>
              {calculation.bulkCost !== undefined && (
                <p>{formatMoney(calculation.bulkCost, submitted.currency)} material cost</p>
              )}
            </ResultGroup>
            <ResultGroup
              title={
                calculation.densitySource === 'supplier'
                  ? 'Supplier density weight'
                  : 'Estimated weight'
              }
            >
              <p>
                <strong>
                  {submitted.measurementSystem === 'metric'
                    ? `${n(calculation.requiredWeight.kilograms, 0)} kg`
                    : `${n(calculation.requiredWeight.pounds, 0)} lb`}
                </strong>{' '}
                required
              </p>
              <p>
                {submitted.measurementSystem === 'metric'
                  ? `${n(calculation.requiredWeight.metricTonnes)} metric tonnes`
                  : `${n(calculation.requiredWeight.usTons)} US tons / ${n(calculation.requiredWeight.metricTonnes)} metric tonnes`}
              </p>
              {submitted.bulkIncrement !== undefined && (
                <p>
                  {submitted.measurementSystem === 'metric'
                    ? `${n(calculation.orderedWeight!.kilograms, 0)} kg`
                    : `${n(calculation.orderedWeight!.pounds, 0)} lb`}{' '}
                  estimated ordered weight
                </p>
              )}
              <p>
                {n(calculation.densityPoundsPerCubicYard, 0)} lb/cu yd {calculation.densitySource}{' '}
                density
              </p>
            </ResultGroup>
            {calculation.bagCost !== undefined && calculation.bulkCost !== undefined && (
              <ResultGroup title="Material cost comparison">
                <p>
                  Bagged: <strong>{formatMoney(calculation.bagCost, submitted.currency)}</strong>
                </p>
                <p>
                  Bulk: <strong>{formatMoney(calculation.bulkCost, submitted.currency)}</strong>
                </p>
                <p>
                  Material costs only; delivery, taxes, minimum orders, and supplier fees may not be
                  included.
                </p>
              </ResultGroup>
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-soft">{sandGuidance(submitted)}</p>
          <p className="mt-2 text-xs leading-5 text-ink-soft">
            Actual loaded weight can vary. Confirm the supplier's material density and your vehicle
            or trailer payload rating before hauling.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <ActionButton icon={<Copy size={14} />} label="Copy" onClick={copy} />
            <ActionButton icon={<Printer size={14} />} label="Print" onClick={print} />
            <ActionButton
              icon={<Download size={14} />}
              label={pdf ? 'Preparing...' : 'PDF'}
              onClick={download}
              disabled={pdf}
            />
            <ActionButton icon={<Share2 size={14} />} label="Share" onClick={share} />
          </div>
        </section>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange = () => {},
  children,
  leadingIcon,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  leadingIcon?: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-bold">
      {label}
      <span className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft">
            {leadingIcon}
          </span>
        )}
        <select
          className={`${control()} ${leadingIcon ? 'pl-8' : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {children}
        </select>
      </span>
    </label>
  );
}
function NumberField({
  label,
  value,
  unit,
  error,
  onChange,
  select,
  step = 'any',
}: {
  label: string;
  value?: number;
  unit: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  select?: ReactNode;
  step?: string;
}) {
  const id = useId();
  return (
    <label className="grid min-w-0 gap-1 text-xs font-bold" htmlFor={id}>
      {label}
      <span
        className={`grid overflow-hidden rounded-control border bg-panel ${error ? 'border-danger' : 'border-line'} ${select ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}
      >
        <input
          id={id}
          type="number"
          min="0"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={onChange}
          onWheel={preserveNumberInputOnWheel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 min-w-0 bg-transparent px-2.5 text-sm text-ink outline-none sm:h-9"
        />
        {select ? (
          <span className="[&_select]:h-full [&_select]:border-l [&_select]:border-line [&_select]:bg-panel [&_select]:px-2 [&_select]:text-xs [&_select]:text-ink">
            {select}
          </span>
        ) : (
          <span className="flex items-center px-2 text-[.68rem] font-semibold text-ink-soft">
            {unit}
          </span>
        )}
      </span>
      {error && (
        <span id={`${id}-error`} className="text-[.68rem] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
function DimensionField({
  label,
  value,
  system,
  error,
  onChange,
}: {
  label: string;
  value: Dimension;
  system: SandInput['measurementSystem'];
  error?: string;
  onChange: (value: Dimension) => void;
}) {
  return (
    <NumberField
      label={label}
      value={value.value}
      unit={value.unit}
      error={error}
      onChange={(event) => onChange({ ...value, value: number(event) })}
      select={
        <select
          aria-label={`${label} unit`}
          value={value.unit}
          onChange={(event) =>
            onChange({ ...value, unit: event.target.value as Dimension['unit'] })
          }
        >
          {(system === 'imperial'
            ? label === 'Depth'
              ? ['in', 'ft']
              : ['in', 'ft', 'yd']
            : ['mm', 'cm', 'm']
          ).map((unit) => (
            <option key={unit}>{unit}</option>
          ))}
        </select>
      }
    />
  );
}
function ShapeFields({
  input,
  update,
  error,
}: {
  input: SandInput;
  update: <K extends keyof SandInput>(key: K, value: SandInput[K]) => void;
  error: (field: string) => string | undefined;
}) {
  const field = (
    key: keyof Pick<
      SandInput,
      | 'length'
      | 'width'
      | 'side'
      | 'diameter'
      | 'base'
      | 'perpendicularHeight'
      | 'sideA'
      | 'sideB'
      | 'outerDiameter'
      | 'innerDiameter'
    >,
    label: string,
  ) => (
    <DimensionField
      key={key}
      label={label}
      value={input[key]}
      system={input.measurementSystem}
      error={error(key)}
      onChange={(value) => update(key, value)}
    />
  );
  if (input.shape === 'rectangle')
    return (
      <>
        {field('length', 'Length')}
        {field('width', 'Width')}
      </>
    );
  if (input.shape === 'square') return field('side', 'Side');
  if (input.shape === 'circle') return field('diameter', 'Diameter');
  if (input.shape === 'triangle')
    return (
      <>
        {field('base', 'Base')}
        {field('perpendicularHeight', 'Perpendicular height')}
      </>
    );
  if (input.shape === 'trapezoid')
    return (
      <>
        {field('sideA', 'Parallel side A')}
        {field('sideB', 'Parallel side B')}
        {field('perpendicularHeight', 'Perpendicular height')}
      </>
    );
  return (
    <>
      {field('outerDiameter', 'Outer diameter')}
      {field('innerDiameter', 'Inner diameter')}
    </>
  );
}
function OptionalGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group self-start rounded-control border border-line bg-surface">
      <summary className="flex min-h-10 cursor-pointer items-center px-3 text-xs font-bold marker:content-none">
        {title}
      </summary>
      <div className="grid gap-2 border-t border-line p-2.5">{children}</div>
    </details>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-ink">{label}</p>
      <p className="mt-0.5 text-ink-soft">{value}</p>
    </div>
  );
}
function ResultGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-control border border-line bg-surface p-3 text-xs leading-5 text-ink-soft">
      <h3 className="font-extrabold uppercase text-brand">{title}</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-control border border-line bg-panel text-xs font-bold text-ink"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
