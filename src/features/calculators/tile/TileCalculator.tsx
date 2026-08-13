import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Calculator, Copy, Download, Printer, RotateCcw, Share2 } from 'lucide-react';
import ShapeIcon from '../../../components/calculators/ShapeIcon';
import {
  createCalculatorStartedTracker,
  trackCalculatorEvent,
  trackSuccessfulCalculatorCalculation,
} from '../../../lib/analytics/calculatorAnalytics';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import { preserveNumberInputOnWheel } from '../../../lib/forms/numberInputWheel';
import { currencies, formatMoney, isCurrencyCode } from '../gravel/currencies';
import {
  calculateTile,
  createClearedTileInput,
  createDefaultTileInput,
  createTileEstimateReport,
  createTileEstimateText,
  projectLabel,
  patternLabel,
  squareFeetToArea,
  validateTileInput,
  type AreaUnit,
  type Dimension,
  type TileInput,
  type TileShape,
} from './index';
const num = (e: ChangeEvent<HTMLInputElement>) =>
    e.target.value === '' ? Number.NaN : e.target.valueAsNumber,
  opt = (e: ChangeEvent<HTMLInputElement>) =>
    e.target.value === '' ? undefined : e.target.valueAsNumber;
const ctl = (bad = false) =>
  `h-11 w-full rounded-control border bg-panel px-2.5 text-sm text-ink outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 sm:h-9 ${bad ? 'border-danger' : 'border-line'}`;
const n = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
const projects = [
  ['floor', 'Floor'],
  ['wall', 'Wall'],
  ['backsplash', 'Backsplash'],
  ['shower-wall', 'Shower Wall'],
  ['shower-floor', 'Shower Floor'],
  ['accent-wall', 'Fireplace / Accent Wall'],
  ['patio', 'Patio / Outdoor'],
  ['other', 'Other'],
] as const;
const shapes = [
  ['rectangle', 'Rectangle'],
  ['square', 'Square'],
  ['circle', 'Circle'],
  ['triangle', 'Triangle'],
  ['trapezoid', 'Trapezoid'],
  ['ring', 'Ring / Donut'],
] as const;
const patterns = [
  ['straight', 'Straight / Grid'],
  ['brick', 'Brick / Offset'],
  ['diagonal', 'Diagonal'],
  ['herringbone', 'Herringbone'],
  ['custom', 'Custom / Other'],
] as const;
const areaUnits = (metric: boolean): AreaUnit[] =>
  metric ? ['sq-cm', 'sq-m'] : ['sq-in', 'sq-ft', 'sq-yd'];
export default function TileCalculator() {
  const [input, setInput] = useState<TileInput>(() => createDefaultTileInput()),
    [submitted, setSubmitted] = useState<TileInput>(),
    [issues, setIssues] = useState<ReturnType<typeof validateTileInput>>([]),
    [status, setStatus] = useState(''),
    [pdf, setPdf] = useState(false);
  const started = useRef(createCalculatorStartedTracker());
  const result = submitted ? calculateTile(submitted) : undefined;
  const update = <K extends keyof TileInput>(k: K, v: TileInput[K]) =>
    setInput((c) => ({ ...c, [k]: v }));
  const error = (f: string) => issues.find((x) => x.field === f)?.message;
  const analytics = () => ({
    calculator_id: 'tile',
    calculator_name: 'Tile Calculator',
    project_type: input.projectType,
    unit_system: input.measurementSystem,
  });
  const calc = () => {
    const x = validateTileInput(input);
    setIssues(x);
    if (x.length) {
      setStatus('Fix the highlighted fields, then calculate again.');
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitted(structuredClone(input));
    setStatus('Estimate updated.');
    trackSuccessfulCalculatorCalculation(x, analytics());
  };
  const clear = () => {
    setInput(createClearedTileInput(input.currency));
    setSubmitted(undefined);
    setIssues([]);
    setStatus('Calculator cleared.');
    trackCalculatorEvent('calculator_clear', analytics());
  };
  const copy = async () => {
    if (!result || !submitted) return;
    try {
      await navigator.clipboard.writeText(createTileEstimateText(submitted, result));
      setStatus('Estimate copied.');
      trackCalculatorEvent('calculator_copy', analytics());
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  };
  const share = async () => {
    if (!result || !submitted) return;
    const text = createTileEstimateText(submitted, result);
    if (navigator.share)
      try {
        await navigator.share({ title: 'Tile estimate', text });
        trackCalculatorEvent('calculator_share', { ...analytics(), share_method: 'native' });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    await navigator.clipboard.writeText(text);
    setStatus('Share details copied.');
    trackCalculatorEvent('calculator_share', {
      ...analytics(),
      share_method: 'clipboard_fallback',
    });
  };
  const report = () =>
    submitted && result ? createTileEstimateReport(submitted, result) : undefined;
  const print = () => {
    const d = report();
    if (d) {
      trackCalculatorEvent('calculator_print', analytics());
      setStatus(
        printReport(d) ? 'Choose a print destination.' : 'Allow pop-ups to print your estimate.',
      );
    }
  };
  const download = async () => {
    const d = report();
    if (!d) return;
    setPdf(true);
    try {
      await downloadReportAsPdf(d);
      setStatus('PDF download started.');
      trackCalculatorEvent('calculator_pdf', analytics());
    } catch {
      setStatus('PDF download failed.');
    } finally {
      setPdf(false);
    }
  };
  const interact = () => started.current(analytics());
  const metric = input.measurementSystem === 'metric';
  const switchSystem = (next: TileInput['measurementSystem']) => {
    if (next === input.measurementSystem) return;
    const toMetric = next === 'metric';
    const lengthFactor = toMetric ? 0.3048 : 3.280839895;
    const areaFactor = toMetric ? 0.09290304 : 10.7639104167;
    const tileFactor = toMetric ? 25.4 : 1 / 25.4;
    const convertedValue = (value: number, factor: number) =>
      Number.isFinite(value) ? Number((value * factor).toFixed(6)) : value;
    const convertDimension = (d: Dimension): Dimension => ({
      value: convertedValue(d.value, lengthFactor),
      unit: toMetric ? 'm' : 'ft',
    });
    const dimensions = [
      'length',
      'width',
      'side',
      'diameter',
      'base',
      'perpendicularHeight',
      'sideA',
      'sideB',
      'outerDiameter',
      'innerDiameter',
    ] as const;
    setInput((current) => {
      const converted = { ...current };
      for (const field of dimensions) converted[field] = convertDimension(current[field]);
      return {
        ...converted,
        measurementSystem: next,
        knownArea: convertedValue(current.knownArea, areaFactor),
        areaUnit: toMetric ? 'sq-m' : 'sq-ft',
        tileLength: convertedValue(current.tileLength, tileFactor),
        tileWidth: convertedValue(current.tileWidth, tileFactor),
        tileUnit: toMetric ? 'mm' : 'in',
        groutGap: convertedValue(current.groutGap, tileFactor),
        groutUnit: toMetric ? 'mm' : 'in',
        excludedArea:
          current.excludedArea === undefined
            ? undefined
            : convertedValue(current.excludedArea, areaFactor),
        excludedAreaUnit: toMetric ? 'sq-m' : 'sq-ft',
        manufacturerCoverage:
          current.manufacturerCoverage === undefined
            ? undefined
            : convertedValue(current.manufacturerCoverage, areaFactor),
        manufacturerCoverageUnit: toMetric ? 'sq-m' : 'sq-ft',
      };
    });
  };
  const dim = (field: keyof TileInput, label: string, d: Dimension) => (
    <Field label={label} error={error(String(field))}>
      <div className="grid grid-cols-[1fr_4.5rem] gap-1">
        <input
          name={String(field)}
          type="number"
          inputMode="decimal"
          value={Number.isNaN(d.value) ? '' : d.value}
          onChange={(e) => update(field, { ...d, value: num(e) } as never)}
          onWheel={preserveNumberInputOnWheel}
          aria-invalid={!!error(String(field))}
          className={ctl(!!error(String(field)))}
        />
        <select
          aria-label={`${label} unit`}
          value={d.unit}
          onChange={(e) => update(field, { ...d, unit: e.target.value } as never)}
          className={ctl()}
        >
          {(metric ? ['mm', 'cm', 'm'] : ['in', 'ft', 'yd']).map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
    </Field>
  );
  const geometry =
    input.measureMode === 'area' ? (
      <Field label="Known area" error={error('knownArea')}>
        <UnitNumber
          value={input.knownArea}
          onValue={(v) => update('knownArea', v ?? Number.NaN)}
          unit={input.areaUnit}
          onUnit={(v) => update('areaUnit', v as AreaUnit)}
          units={areaUnits(metric)}
          error={!!error('knownArea')}
        />
      </Field>
    ) : input.shape === 'rectangle' ? (
      <>
        {dim('length', 'Length', input.length)}
        {dim('width', 'Width', input.width)}
      </>
    ) : input.shape === 'square' ? (
      dim('side', 'Side', input.side)
    ) : input.shape === 'circle' ? (
      dim('diameter', 'Diameter', input.diameter)
    ) : input.shape === 'triangle' ? (
      <>
        {dim('base', 'Base', input.base)}
        {dim('perpendicularHeight', 'Perpendicular height', input.perpendicularHeight)}
      </>
    ) : input.shape === 'trapezoid' ? (
      <>
        {dim('sideA', 'Parallel side A', input.sideA)}
        {dim('sideB', 'Parallel side B', input.sideB)}
        {dim('perpendicularHeight', 'Perpendicular height', input.perpendicularHeight)}
      </>
    ) : (
      <>
        {dim('outerDiameter', 'Outer diameter', input.outerDiameter)}
        {dim('innerDiameter', 'Inner diameter', input.innerDiameter)}
      </>
    );
  return (
    <div className="@container/calculator grid gap-3" onInput={interact} onChange={interact}>
      <section
        className="rounded-card border border-line bg-panel p-3 shadow-card sm:p-4"
        aria-label="Tile calculator inputs"
      >
        <div className="grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
          <Select
            label="Project"
            value={input.projectType}
            onChange={(v) => update('projectType', v as TileInput['projectType'])}
            options={projects}
          />
          <Select
            label="Measure by"
            value={input.measureMode}
            onChange={(v) => update('measureMode', v as TileInput['measureMode'])}
            options={[
              ['dimensions', 'Dimensions'],
              ['area', 'Known Area'],
            ]}
          />
          {input.measureMode === 'dimensions' && (
            <label className="grid min-w-0 gap-1 text-xs font-bold">
              Surface shape
              <span className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft">
                  <ShapeIcon shape={input.shape} />
                </span>
                <select
                  value={input.shape}
                  onChange={(e) => update('shape', e.target.value as TileShape)}
                  className={`${ctl()} pl-8`}
                >
                  {shapes.map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          )}
          <Select
            label="Units"
            value={input.measurementSystem}
            onChange={(v) => switchSystem(v as TileInput['measurementSystem'])}
            options={[
              ['imperial', 'Imperial (US)'],
              ['metric', 'Metric'],
            ]}
          />
        </div>
        <h2 className="mt-3 text-xs font-extrabold uppercase text-brand">Measurements</h2>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2 @2xl/calculator:grid-cols-3">
          {geometry}
          <Field label="Quantity (identical areas)" error={error('quantity')}>
            <input
              name="quantity"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={input.quantity}
              onChange={(e) => update('quantity', num(e))}
              onWheel={preserveNumberInputOnWheel}
              className={ctl(!!error('quantity'))}
            />
          </Field>
        </div>
        <h2 className="mt-3 text-xs font-extrabold uppercase text-brand">Tile & layout</h2>
        <div className="mt-2 grid grid-cols-2 gap-2.5 @2xl/calculator:grid-cols-4">
          <Field label="Tile length" error={error('tileLength')}>
            <input
              name="tileLength"
              type="number"
              inputMode="decimal"
              value={Number.isNaN(input.tileLength) ? '' : input.tileLength}
              onChange={(e) => update('tileLength', num(e))}
              onWheel={preserveNumberInputOnWheel}
              className={ctl(!!error('tileLength'))}
            />
          </Field>
          <Field label="Tile width" error={error('tileWidth')}>
            <input
              name="tileWidth"
              type="number"
              inputMode="decimal"
              value={Number.isNaN(input.tileWidth) ? '' : input.tileWidth}
              onChange={(e) => update('tileWidth', num(e))}
              onWheel={preserveNumberInputOnWheel}
              className={ctl(!!error('tileWidth'))}
            />
          </Field>
          <Select
            label="Tile unit"
            value={input.tileUnit}
            onChange={(v) => update('tileUnit', v as TileInput['tileUnit'])}
            options={
              (metric
                ? [
                    ['mm', 'mm'],
                    ['cm', 'cm'],
                  ]
                : [
                    ['in', 'in'],
                    ['ft', 'ft'],
                  ]) as readonly (readonly [string, string])[]
            }
          />
          <Field label="Grout gap">
            <div className="grid grid-cols-[1fr_4.5rem] gap-1">
              <input
                name="groutGap"
                type="number"
                min="0"
                inputMode="decimal"
                value={input.groutGap}
                onChange={(e) => update('groutGap', num(e))}
                onWheel={preserveNumberInputOnWheel}
                className={ctl(!!error('groutGap'))}
              />
              <span className="grid place-items-center rounded-control border border-line bg-panel-muted text-xs">
                {input.groutUnit}
              </span>
            </div>
          </Field>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Tile size presets">
          {(metric
            ? [
                [300, 300],
                [300, 600],
                [600, 600],
                [600, 1200],
              ]
            : [
                [12, 12],
                [12, 24],
                [24, 24],
                [24, 48],
              ]
          ).map(([a, b]) => (
            <button
              type="button"
              key={`${a}-${b}`}
              onClick={() => {
                interact();
                setInput((c) => ({
                  ...c,
                  tileLength: a,
                  tileWidth: b,
                  tileUnit: metric ? 'mm' : 'in',
                }));
              }}
              className="min-h-9 rounded-control border border-line px-2.5 text-xs font-semibold hover:border-brand"
            >
              {a} x {b}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          Grout gap is used for spacing estimates only. Exact edge cuts and layout are not
          simulated.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Grout gap presets">
          {(metric ? [0, 1.5, 2, 3, 5, 6] : [0, 0.0625, 0.125, 0.1875, 0.25]).map((gap) => (
            <button
              type="button"
              key={gap}
              onClick={() => {
                interact();
                update('groutGap', gap);
              }}
              className="min-h-9 rounded-control border border-line px-2.5 text-xs font-semibold hover:border-brand"
            >
              {gap === 0 ? '0' : n(gap, 4)} {input.groutUnit}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <Select
            label="Layout pattern"
            value={input.pattern}
            onChange={(v) => update('pattern', v as TileInput['pattern'])}
            options={patterns}
          />
          <Field label="Waste allowance (%)" error={error('wastePercent')}>
            <input
              name="wastePercent"
              type="number"
              min="0"
              max="100"
              inputMode="decimal"
              value={input.wastePercent}
              onChange={(e) => update('wastePercent', num(e))}
              onWheel={preserveNumberInputOnWheel}
              className={ctl(!!error('wastePercent'))}
            />
          </Field>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {input.pattern === 'straight'
            ? 'Straight/Grid layouts commonly use 5–10% waste.'
            : input.pattern === 'brick'
              ? 'Brick/Offset layouts often use around 10% or more depending on cuts.'
              : input.pattern === 'diagonal'
                ? 'Diagonal layouts commonly use a 10–15% planning range.'
                : input.pattern === 'herringbone'
                  ? 'Herringbone layouts may need 15–20% or more.'
                  : 'Choose waste for the actual layout and cutting plan.'}
        </p>
        <div className="mt-3 grid items-start gap-2 @xl/calculator:grid-cols-3">
          <Optional title="Excluded area (optional)">
            <Field label="Total excluded area" error={error('excludedArea')}>
              <UnitNumber
                value={input.excludedArea}
                onValue={(v) => update('excludedArea', v)}
                unit={input.excludedAreaUnit}
                onUnit={(v) => update('excludedAreaUnit', v as AreaUnit)}
                units={areaUnits(metric)}
                error={!!error('excludedArea')}
              />
            </Field>
            <p className="text-xs text-ink-soft">
              Windows, doors, cabinets, fixtures, or other areas that will not be tiled.
            </p>
          </Optional>
          <Optional title="Box / purchasing (optional)">
            <Select
              label="Purchasing mode"
              value={input.boxMode}
              onChange={(v) => update('boxMode', v as TileInput['boxMode'])}
              options={[
                ['tiles', 'Tiles per box'],
                ['coverage', 'Manufacturer coverage per box'],
              ]}
            />
            {input.boxMode === 'tiles' ? (
              <Field label="Tiles per box" error={error('tilesPerBox')}>
                <input
                  name="tilesPerBox"
                  type="number"
                  inputMode="numeric"
                  value={input.tilesPerBox ?? ''}
                  onChange={(e) => update('tilesPerBox', opt(e))}
                  onWheel={preserveNumberInputOnWheel}
                  className={ctl(!!error('tilesPerBox'))}
                />
              </Field>
            ) : (
              <>
                <Field label="Manufacturer box coverage" error={error('manufacturerCoverage')}>
                  <UnitNumber
                    value={input.manufacturerCoverage}
                    onValue={(v) => update('manufacturerCoverage', v)}
                    unit={input.manufacturerCoverageUnit}
                    onUnit={(v) => update('manufacturerCoverageUnit', v as AreaUnit)}
                    units={areaUnits(metric)}
                    error={!!error('manufacturerCoverage')}
                  />
                </Field>
                <p className="text-xs font-semibold text-brand">
                  Manufacturer coverage overrides calculated box coverage for purchasing.
                </p>
              </>
            )}
          </Optional>
          <Optional title="Pricing (optional)">
            <Select
              label="Price basis"
              value={input.priceBasis}
              onChange={(v) => update('priceBasis', v as TileInput['priceBasis'])}
              options={
                [
                  ['tile', 'Per tile'],
                  ...(input.tilesPerBox !== undefined || input.manufacturerCoverage !== undefined
                    ? [['box', 'Per box']]
                    : []),
                  ['sq-ft', 'Per sq ft'],
                  ['sq-m', 'Per sq m'],
                ] as [string, string][]
              }
            />
            <Field label="Price" error={error('price')}>
              <input
                name="price"
                type="number"
                inputMode="decimal"
                value={input.price ?? ''}
                onChange={(e) => update('price', opt(e))}
                onWheel={preserveNumberInputOnWheel}
                className={ctl(!!error('price'))}
              />
            </Field>
            <Select
              label="Currency"
              value={input.currency}
              onChange={(v) => isCurrencyCode(v) && update('currency', v)}
              options={currencies.map(
                ([code, symbol]) => [code, `${code} (${symbol})`] as [string, string],
              )}
            />
          </Optional>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={calc}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand text-sm font-bold text-white hover:bg-brand-strong"
          >
            <Calculator size={16} />
            Calculate
          </button>
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line text-sm font-bold hover:bg-panel-muted"
          >
            <RotateCcw size={16} />
            Clear
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-soft" aria-live="polite">
          {status}
        </p>
      </section>
      {result && submitted && (
        <Result
          input={submitted}
          result={result}
          copy={copy}
          share={share}
          print={print}
          download={download}
          pdf={pdf}
        />
      )}
    </div>
  );
}
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-bold">
      {label}
      {children}
      {error && <span className="font-medium text-danger">{error}</span>}
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-bold">
      {label}
      <select
        name={label.toLowerCase().replaceAll(' ', '-')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={ctl()}
      >
        {options.map(([v, l]) => (
          <option value={v} key={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function UnitNumber({
  value,
  onValue,
  unit,
  onUnit,
  units,
  error,
}: {
  value: number | undefined;
  onValue: (v: number | undefined) => void;
  unit: string;
  onUnit: (v: string) => void;
  units: string[];
  error: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_5rem] gap-1">
      <input
        type="number"
        inputMode="decimal"
        value={value === undefined || Number.isNaN(value) ? '' : value}
        onChange={(e) => onValue(opt(e))}
        onWheel={preserveNumberInputOnWheel}
        className={ctl(error)}
        aria-invalid={error}
      />
      <select
        aria-label="Area unit"
        value={unit}
        onChange={(e) => onUnit(e.target.value)}
        className={ctl()}
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u.replace('-', ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
function Optional({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group self-start rounded-control border border-line bg-panel">
      <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold">{title}</summary>
      <div className="grid gap-2 border-t border-line p-3">{children}</div>
    </details>
  );
}
function Result({
  input,
  result,
  copy,
  share,
  print,
  download,
  pdf,
}: {
  input: TileInput;
  result: ReturnType<typeof calculateTile>;
  copy: () => void;
  share: () => void;
  print: () => void;
  download: () => void;
  pdf: boolean;
}) {
  const metric = input.measurementSystem === 'metric';
  return (
    <section
      className="rounded-card border border-brand/30 bg-brand-soft p-3 shadow-card sm:p-4"
      aria-label="Tile estimate results"
    >
      <p className="text-xs font-extrabold uppercase text-brand">Your tile estimate</p>
      <p className="mt-1 text-3xl font-extrabold text-brand-strong">{result.requiredTiles} tiles</p>
      <p className="text-xs text-ink-soft">Estimated tiles required</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Metric
          label="Net tiled area"
          value={`${n(metric ? squareFeetToArea(result.netAreaSquareFeet, 'sq-m') : result.netAreaSquareFeet)} ${metric ? 'sq m' : 'sq ft'}`}
        />
        <Metric
          label="Tile size"
          value={`${n(input.tileLength)} x ${n(input.tileWidth)} ${input.tileUnit}`}
        />
        <Metric label="Base estimate" value={`${n(result.rawTiles)} tiles`} />
        <Metric label="Waste allowance" value={`${input.wastePercent}%`} />
        {result.boxesRequired !== undefined && (
          <Metric label="Boxes required" value={String(result.boxesRequired)} />
        )}{' '}
        {result.estimatedCost !== undefined && (
          <Metric
            label="Estimated material cost"
            value={formatMoney(result.estimatedCost, input.currency)}
          />
        )}
      </div>
      {input.boxMode === 'coverage' && input.manufacturerCoverage !== undefined && (
        <p className="mt-2 text-xs font-semibold text-brand">
          Manufacturer coverage overrides calculated box coverage for purchasing.
        </p>
      )}
      <p className="mt-2 text-xs text-ink-soft">
        {projectLabel(input.projectType)} · {patternLabel(input.pattern)}. Material cost excludes
        labor and installation materials.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { Icon: Copy, fn: copy, label: 'Copy' },
          { Icon: Share2, fn: share, label: 'Share' },
          { Icon: Printer, fn: print, label: 'Print' },
          { Icon: Download, fn: download, label: pdf ? 'Preparing…' : 'PDF' },
        ].map(({ Icon, fn, label }) => (
          <button
            key={String(label)}
            type="button"
            onClick={fn}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-control border border-line bg-panel text-xs font-bold hover:bg-panel-muted"
          >
            <Icon size={14} />
            {String(label)}
          </button>
        ))}
      </div>
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-brand/15 bg-panel p-2">
      <span className="block font-bold text-ink-soft">{label}</span>
      <strong className="mt-0.5 block text-sm text-ink">{value}</strong>
    </div>
  );
}
