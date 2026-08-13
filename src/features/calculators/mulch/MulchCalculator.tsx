import { useId, useRef, useState, type ChangeEvent, type ReactNode, type WheelEvent } from 'react';
import { Calculator, Copy, Download, Printer, RotateCcw, Share2 } from 'lucide-react';
import ShapeIcon from '../../../components/calculators/ShapeIcon';
import {
  createCalculatorStartedTracker,
  trackCalculatorEvent,
  trackSuccessfulCalculatorCalculation,
} from '../../../lib/analytics/calculatorAnalytics';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import { currencies, formatMoney, isCurrencyCode } from '../gravel/currencies';
import {
  calculateMulch,
  convertMulchMeasurementSystem,
  createClearedMulchInput,
  createDefaultMulchInput,
  createMulchEstimateReport,
  createMulchEstimateText,
  mulchGuidance,
  validateMulchInput,
  type Dimension,
  type MulchInput,
  type MulchShape,
} from './index';

const number = (e: ChangeEvent<HTMLInputElement>) =>
  e.target.value === '' ? Number.NaN : e.target.valueAsNumber;
const optional = (e: ChangeEvent<HTMLInputElement>) =>
  e.target.value === '' ? undefined : e.target.valueAsNumber;
const wheel = (e: WheelEvent<HTMLInputElement>) => {
  const x = e.currentTarget,
    r = x.readOnly;
  x.readOnly = true;
  requestAnimationFrame(() => {
    x.readOnly = r;
  });
};
const control = (bad = false) =>
  `h-11 w-full rounded-control border bg-panel px-2.5 text-sm text-ink outline-none focus:border-brand sm:h-9 ${bad ? 'border-danger' : 'border-line'}`;
const fmt = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
const projectOptions = [
  ['garden-bed', 'Landscape / Garden Bed'],
  ['trees-shrubs', 'Around Trees / Shrubs'],
  ['walkway', 'Path / Walkway'],
  ['play-area', 'Play Area'],
  ['landscaping', 'General Landscaping'],
  ['other', 'Custom / Other'],
];
const shapeOptions = [
  ['rectangle', 'Rectangle'],
  ['square', 'Square'],
  ['circle', 'Circle'],
  ['triangle', 'Triangle'],
  ['trapezoid', 'Trapezoid'],
  ['ring', 'Ring / Donut'],
];

export default function MulchCalculator() {
  const [input, setInput] = useState<MulchInput>(() => createDefaultMulchInput());
  const [submitted, setSubmitted] = useState<MulchInput>();
  const [issues, setIssues] = useState<ReturnType<typeof validateMulchInput>>([]);
  const [status, setStatus] = useState('');
  const [pdf, setPdf] = useState(false);
  const started = useRef(createCalculatorStartedTracker());
  const calc = submitted ? calculateMulch(submitted) : undefined;
  const error = (field: string) => issues.find((x) => x.field === field)?.message;
  const update = <K extends keyof MulchInput>(key: K, value: MulchInput[K]) =>
    setInput((x) => ({ ...x, [key]: value }));
  const params = () => ({
    calculator_id: 'mulch',
    calculator_name: 'Mulch Calculator',
    project_type: input.projectType,
    unit_system: input.measurementSystem,
  });
  const calculate = () => {
    const next = validateMulchInput(input);
    setIssues(next);
    if (next.length) {
      setStatus('Fix the highlighted fields, then calculate again.');
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitted(structuredClone(input));
    setStatus('Estimate updated.');
    trackSuccessfulCalculatorCalculation(next, params());
  };
  const clear = () => {
    setInput(createClearedMulchInput(input.currency));
    setSubmitted(undefined);
    setIssues([]);
    setStatus('Calculator cleared.');
    trackCalculatorEvent('calculator_clear', params());
  };
  const copy = async () => {
    if (!calc || !submitted) return;
    try {
      await navigator.clipboard.writeText(createMulchEstimateText(submitted, calc));
      setStatus('Estimate copied.');
      trackCalculatorEvent('calculator_copy', params());
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  };
  const share = async () => {
    if (!calc || !submitted) return;
    const text = createMulchEstimateText(submitted, calc);
    if (navigator.share)
      try {
        await navigator.share({ title: 'Mulch estimate', text });
        setStatus('Estimate shared.');
        trackCalculatorEvent('calculator_share', { ...params(), share_method: 'native' });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Share details copied.');
      trackCalculatorEvent('calculator_share', { ...params(), share_method: 'clipboard_fallback' });
    } catch {
      setStatus('Sharing is unavailable.');
    }
  };
  const report = () => (submitted && calc ? createMulchEstimateReport(submitted, calc) : undefined);
  const print = () => {
    const r = report();
    if (!r) return;
    trackCalculatorEvent('calculator_print', params());
    setStatus(
      printReport(r) ? 'Choose a print destination.' : 'Allow pop-ups to print your estimate.',
    );
  };
  const download = async () => {
    const r = report();
    if (!r) return;
    setPdf(true);
    try {
      await downloadReportAsPdf(r);
      setStatus('PDF download started.');
      trackCalculatorEvent('calculator_pdf', params());
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
        aria-label="Mulch calculator inputs"
        onChange={() =>
          started.current({ calculator_id: 'mulch', calculator_name: 'Mulch Calculator' })
        }
      >
        <div className="grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
          <Select
            label="Project type"
            value={input.projectType}
            onChange={(v) => update('projectType', v as MulchInput['projectType'])}
          >
            {projectOptions.map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select
            label="Measure by"
            value={input.measureMode}
            onChange={(v) => update('measureMode', v as MulchInput['measureMode'])}
          >
            <option value="dimensions">Dimensions</option>
            <option value="area">Known Area</option>
          </Select>
          {input.measureMode === 'dimensions' && (
            <Select
              label="Shape"
              value={input.shape}
              leadingIcon={<ShapeIcon shape={input.shape} />}
              onChange={(v) => update('shape', v as MulchShape)}
            >
              {shapeOptions.map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
          <Select
            label="Units"
            value={input.measurementSystem}
            onChange={(v) =>
              setInput((x) =>
                convertMulchMeasurementSystem(x, v as MulchInput['measurementSystem']),
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
                unit={input.areaUnit}
                error={error('knownArea')}
                onChange={(e) => update('knownArea', number(e))}
                select={
                  <select
                    aria-label="Known area unit"
                    value={input.areaUnit}
                    onChange={(e) => update('areaUnit', e.target.value as MulchInput['areaUnit'])}
                  >
                    {input.measurementSystem === 'imperial' ? (
                      <>
                        <option value="sq-ft">sq ft</option>
                        <option value="sq-yd">sq yd</option>
                      </>
                    ) : (
                      <option value="sq-m">sq m</option>
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
              onChange={(v) => update('depth', v)}
            />
          </div>
        </fieldset>
        <div className="mt-3 grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
          <Select
            label="Mulch type"
            value={input.mulchType}
            onChange={(v) => update('mulchType', v as MulchInput['mulchType'])}
          >
            {[
              ['hardwood', 'Shredded Hardwood'],
              ['bark', 'Bark Mulch'],
              ['wood-chips', 'Wood Chips'],
              ['cedar', 'Cedar Mulch'],
              ['pine-bark', 'Pine Bark'],
              ['rubber', 'Rubber Mulch'],
              ['compost', 'Compost / Organic Mulch'],
              ['other', 'Other / Custom'],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select
            label="Extra allowance"
            value={String(input.allowancePercent)}
            onChange={(v) => update('allowancePercent', Number(v))}
          >
            {[0, 5, 10, 15, 20].map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </Select>
          <NumberField
            label="Bag size (optional)"
            value={input.bagVolume}
            unit={input.bagVolumeUnit === 'liter' ? 'L' : 'cu ft'}
            error={error('bagVolume')}
            onChange={(e) => update('bagVolume', optional(e))}
          />
          <NumberField
            label="Bulk increment (optional)"
            value={input.bulkIncrementCubicYards}
            unit="cu yd"
            error={error('bulkIncrementCubicYards')}
            onChange={(e) => update('bulkIncrementCubicYards', optional(e))}
          />
        </div>
        <details className="mt-3 rounded-control border border-line">
          <summary className="cursor-pointer p-3 text-xs font-bold">Pricing (optional)</summary>
          <div className="grid grid-cols-2 gap-2 border-t border-line p-3 @2xl/calculator:grid-cols-3">
            <Select
              label="Currency"
              value={input.currency}
              onChange={(v) => {
                if (isCurrencyCode(v)) update('currency', v);
              }}
            >
              {currencies.map(([code, symbol]) => (
                <option key={code} value={code}>
                  {code} ({symbol})
                </option>
              ))}
            </Select>
            <NumberField
              label="Price per bag"
              value={input.pricePerBag}
              unit={input.currency}
              error={error('pricePerBag')}
              onChange={(e) => update('pricePerBag', optional(e))}
            />
            <NumberField
              label="Bulk price / cu yd"
              value={input.bulkPricePerCubicYard}
              unit={input.currency}
              error={error('bulkPricePerCubicYard')}
              onChange={(e) => update('bulkPricePerCubicYard', optional(e))}
            />
          </div>
        </details>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={calculate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand text-sm font-bold text-white"
          >
            <Calculator size={15} />
            Calculate
          </button>
          <button
            onClick={clear}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line text-sm font-bold"
          >
            <RotateCcw size={15} />
            Clear
          </button>
        </div>
        <p className="mt-2 min-h-4 text-xs text-ink-soft" aria-live="polite">
          {status}
        </p>
      </section>
      {calc && submitted && (
        <section
          className="rounded-card border border-brand/25 bg-brand-soft p-4 shadow-card"
          aria-label="Mulch estimate results"
        >
          <p className="text-xs font-bold uppercase text-brand">Your mulch estimate</p>
          <p className="mt-1 text-3xl font-extrabold text-brand">
            {submitted.measurementSystem === 'metric'
              ? `${fmt(calc.requiredCubicMeters)} cu m`
              : `${fmt(calc.requiredCubicYards)} cu yd`}
          </p>
          <p className="text-xs text-ink-soft">Required mulch</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Metric label="Cubic feet" value={`${fmt(calc.requiredCubicFeet)} cu ft`} />
            <Metric label="Cubic meters" value={`${fmt(calc.requiredCubicMeters)} cu m`} />
            <Metric label="Liters" value={`${fmt(calc.requiredLiters, 0)} L`} />
            <Metric label="Area" value={`${fmt(calc.areaSquareFeet)} sq ft`} />
            <Metric label="Base volume" value={`${fmt(calc.baseCubicFeet)} cu ft`} />
            <Metric
              label={`Allowance (${submitted.allowancePercent}%)`}
              value={`${fmt(calc.allowanceCubicFeet)} cu ft`}
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {calc.bagsRequired !== undefined && (
              <Result
                title="Bagged mulch"
                rows={[
                  `${calc.bagsRequired} x ${fmt(submitted.bagVolume!)} ${submitted.bagVolumeUnit === 'liter' ? 'L' : 'cu ft'} bags`,
                  `Leftover: ${fmt(calc.bagLeftoverCubicFeet!)} cu ft`,
                  ...(calc.bagCost === undefined
                    ? []
                    : [`Material cost: ${formatMoney(calc.bagCost, submitted.currency)}`]),
                ]}
              />
            )}
            <Result
              title="Bulk mulch"
              rows={[
                `${fmt(calc.bulkOrderCubicYards)} cu yd ${submitted.bulkIncrementCubicYards ? 'suggested order' : 'required'}`,
                `Leftover: ${fmt(calc.bulkLeftoverCubicYards)} cu yd`,
                ...(calc.bulkCost === undefined
                  ? []
                  : [`Material cost: ${formatMoney(calc.bulkCost, submitted.currency)}`]),
              ]}
            />
          </div>
          {calc.bagCost !== undefined && calc.bulkCost !== undefined && (
            <div className="mt-2 rounded-control border border-line bg-panel p-3 text-xs">
              <strong>Material cost comparison</strong>
              <p className="mt-1">
                Bagged: {formatMoney(calc.bagCost, submitted.currency)} &nbsp; Bulk:{' '}
                {formatMoney(calc.bulkCost, submitted.currency)}
              </p>
              <p className="mt-1 text-ink-soft">
                Material costs only. Delivery, minimum orders, taxes, and supplier charges may
                change the actual total.
              </p>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-ink-soft">{mulchGuidance(submitted)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Action icon={<Copy size={14} />} label="Copy" onClick={copy} />
            <Action icon={<Printer size={14} />} label="Print" onClick={print} />
            <Action
              icon={<Download size={14} />}
              label={pdf ? 'Preparing...' : 'PDF'}
              onClick={download}
              disabled={pdf}
            />
            <Action icon={<Share2 size={14} />} label="Share" onClick={share} />
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
  onChange?: (v: string) => void;
  children: ReactNode;
  leadingIcon?: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold">
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
          onChange={(e) => onChange(e.target.value)}
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
}: {
  label: string;
  value?: number;
  unit: string;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  select?: ReactNode;
}) {
  const errorId = useId();
  return (
    <label className="grid gap-1 text-xs font-bold">
      {label}
      <span className="flex">
        <input
          type="number"
          step="any"
          value={Number.isFinite(value) ? value : ''}
          onChange={onChange}
          onWheel={wheel}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${control(!!error)} rounded-r-none`}
        />
        <span className="grid min-w-14 place-items-center rounded-r-control border border-l-0 border-line bg-panel-muted px-2 font-normal">
          {select ?? unit}
        </span>
      </span>
      {error && (
        <span id={errorId} className="font-normal text-danger">
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
  system: MulchInput['measurementSystem'];
  error?: string;
  onChange: (v: Dimension) => void;
}) {
  return (
    <NumberField
      label={label}
      value={value.value}
      unit={value.unit}
      error={error}
      onChange={(e) => onChange({ ...value, value: number(e) })}
      select={
        <select
          aria-label={`${label} unit`}
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value as Dimension['unit'] })}
        >
          {(system === 'imperial' ? ['ft', 'in'] : ['m', 'cm']).map((u) => (
            <option key={u}>{u}</option>
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
  input: MulchInput;
  update: <K extends keyof MulchInput>(k: K, v: MulchInput[K]) => void;
  error: (x: string) => string | undefined;
}) {
  const field = (
    key: keyof Pick<
      MulchInput,
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
      onChange={(v) => update(key, v)}
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
      <DimensionField
        label="Outer diameter"
        value={input.outerDiameter}
        system={input.measurementSystem}
        error={error('outerDiameter') ?? error('geometry')}
        onChange={(v) => update('outerDiameter', v)}
      />
      {field('innerDiameter', 'Inner diameter')}
    </>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-line bg-panel p-2">
      <span className="text-ink-soft">{label}</span>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}
function Result({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-control border border-line bg-panel p-3 text-xs">
      <strong className="uppercase text-brand">{title}</strong>
      {rows.map((x) => (
        <p className="mt-1" key={x}>
          {x}
        </p>
      ))}
    </div>
  );
}
function Action({
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
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-panel text-xs font-bold"
    >
      {icon}
      {label}
    </button>
  );
}
