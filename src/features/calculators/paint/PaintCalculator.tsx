import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';
import { Calculator, ChevronDown, Copy, Download, Printer, RotateCcw, Share2 } from 'lucide-react';
import type { LengthUnit } from '../../../lib/units/measurements';
import { downloadReportAsPdf, printReport } from '../../../lib/reports/reportService';
import { currencies, formatMoney, isCurrencyCode, type CurrencyCode } from '../gravel/currencies';
import {
  calculatePaint,
  convertPaintMeasurementSystem,
  createClearedPaintInput,
  createDefaultPaintInput,
  createPaintEstimateText,
  createPaintShareText,
  gallonsToLiters,
  PAINT_CALCULATOR_URL,
  recommendPaint,
  squareFeetToSquareMeters,
  surfaceConditionLabels,
  validatePaintInput,
  type DimensionInput,
  type MeasurementSystem,
  type PaintInput,
  type SurfaceCondition,
} from './index';
import { createPaintEstimateReport } from './paintReport';
const num = (e: ChangeEvent<HTMLInputElement>) =>
  Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : Number.NaN;
const optional = (e: ChangeEvent<HTMLInputElement>) => (e.target.value === '' ? undefined : num(e));
const preserveNumberOnWheel = (event: WheelEvent<HTMLInputElement>) => {
  const field = event.currentTarget;
  const wasReadOnly = field.readOnly;
  field.readOnly = true;
  requestAnimationFrame(() => {
    field.readOnly = wasReadOnly;
  });
};
const fmt = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
const control = (bad = false) =>
  `h-11 w-full rounded-control border bg-panel px-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/60 sm:h-9 ${bad ? 'border-danger' : 'border-line'}`;
const units = (system: MeasurementSystem): LengthUnit[] =>
  system === 'imperial' ? ['ft', 'in'] : ['m', 'cm'];
export default function PaintCalculator() {
  const [input, setInput] = useState<PaintInput>(createDefaultPaintInput);
  const [system, setSystem] = useState<MeasurementSystem>('imperial');
  const [submitted, setSubmitted] = useState<{ input: PaintInput; system: MeasurementSystem }>();
  const [issues, setIssues] = useState<ReturnType<typeof validatePaintInput>>([]);
  const [status, setStatus] = useState('');
  const [pdf, setPdf] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('duc-paint-currency');
    if (isCurrencyCode(saved)) setInput((x) => ({ ...x, currency: saved }));
  }, []);
  const calc = useMemo(
    () => (submitted ? calculatePaint(submitted.input) : undefined),
    [submitted],
  );
  const rec = useMemo(
    () => (calc && submitted ? recommendPaint(submitted.input, calc) : undefined),
    [calc, submitted],
  );
  const err = (field: string) => issues.find((x) => x.field === field)?.message;
  const changeSystem = (next: MeasurementSystem) => {
    if (next === system) return;
    setInput((x) => convertPaintMeasurementSystem(x, next));
    setSystem(next);
    setIssues([]);
  };
  const calculate = () => {
    const next = validatePaintInput(input);
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
  };
  const clear = () => {
    setInput(createClearedPaintInput(input.currency));
    setSubmitted(undefined);
    setIssues([]);
    setSystem('imperial');
    setStatus('Calculator cleared.');
  };
  const report = () =>
    calc && rec && submitted
      ? createPaintEstimateReport({
          calculation: calc,
          input: submitted.input,
          recommendation: rec,
          measurementSystem: submitted.system,
        })
      : undefined;
  const print = () => {
    const data = report();
    if (data)
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
    } catch (error) {
      console.error('Paint PDF download failed:', error);
      setStatus('Could not prepare the PDF.');
    } finally {
      setPdf(false);
    }
  };
  const copyText = async (text: string) => {
    if (!navigator.clipboard?.writeText) throw new Error('Copy is unavailable.');
    await navigator.clipboard.writeText(text);
  };
  const copy = async () => {
    if (!calc || !submitted) return;
    try {
      await copyText(createPaintEstimateText(submitted.input, calc));
      setStatus('Estimate copied.');
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  };
  const share = async () => {
    if (!calc || !submitted) return;
    const shareText = createPaintShareText(calc);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DailyUseCalc Paint Calculator',
          text: shareText,
          url: PAINT_CALCULATOR_URL,
        });
        setStatus('Estimate shared.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await copyText(`${shareText}\n${PAINT_CALCULATOR_URL}`);
      setStatus('Share details copied.');
    } catch {
      setStatus('Sharing is unavailable in this browser.');
    }
  };
  const update = <K extends keyof PaintInput>(key: K, value: PaintInput[K]) =>
    setInput((x) => ({ ...x, [key]: value }));
  return (
    <div className="@container/paint grid items-start gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.85fr)]">
      <section
        className="rounded-card border border-line bg-panel p-3 shadow-card sm:p-4"
        aria-label="Paint calculator inputs"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Select label="Paint area" value="room">
            <option value="room">Room / Walls</option>
          </Select>
          <Select
            label="Units"
            value={system}
            onChange={(v) => changeSystem(v as MeasurementSystem)}
          >
            <option value="imperial">Imperial (US)</option>
            <option value="metric">Metric</option>
          </Select>
        </div>
        <Group title="Measurements">
          <div className="grid grid-cols-2 gap-2.5 @2xl/paint:grid-cols-4">
            <Dimension
              label="Room length"
              value={input.length}
              system={system}
              error={err('length')}
              onChange={(v) => update('length', v)}
            />
            <Dimension
              label="Room width"
              value={input.width}
              system={system}
              error={err('width')}
              onChange={(v) => update('width', v)}
            />
            <Dimension
              label="Wall height"
              value={input.wallHeight}
              system={system}
              error={err('wallHeight')}
              onChange={(v) => update('wallHeight', v)}
            />
            <NumberField
              label="Quantity"
              value={input.roomQuantity}
              unit="room(s)"
              min={1}
              step={1}
              error={err('roomQuantity')}
              onChange={(e) => update('roomQuantity', num(e))}
            />
          </div>
          <p className="mt-1.5 text-[.68rem] leading-4 text-ink-soft">
            Room dimensions repeat for the selected quantity. Enter total doors and windows for the
            entire project.
          </p>
          <Toggle
            label="Include ceiling"
            checked={input.includeCeiling}
            onChange={(v) => update('includeCeiling', v)}
          />
        </Group>
        <Group title="Openings">
          <Opening
            itemLabel="Door opening"
            quantityLabel="Total doors"
            value={input.doorOpenings}
            system={system}
            error={err('doorOpenings') || err('openings')}
            onChange={(v) => update('doorOpenings', v)}
          />
          <Opening
            itemLabel="Window opening"
            quantityLabel="Total windows"
            value={input.windowOpenings}
            system={system}
            error={err('windowOpenings')}
            onChange={(v) => update('windowOpenings', v)}
          />
        </Group>
        <Group title="Wall paint">
          <div className="grid grid-cols-2 gap-2.5 @2xl/paint:grid-cols-3">
            <NumberField
              label="Coats"
              value={input.coats}
              unit="coat(s)"
              min={1}
              max={10}
              step={1}
              error={err('coats')}
              onChange={(e) => update('coats', num(e))}
            />
            <NumberField
              label="Coverage"
              value={input.coverageSquareFeetPerGallon}
              unit={system === 'imperial' ? 'sq ft/gal' : 'sq m/L'}
              error={err('coverageSquareFeetPerGallon')}
              onChange={(e) => update('coverageSquareFeetPerGallon', num(e))}
            />
            <Select
              label="Surface condition"
              value={input.surfaceCondition}
              onChange={(v) => update('surfaceCondition', v as SurfaceCondition)}
            >
              {Object.entries(surfaceConditionLabels).map(([v, l]) => (
                <option key={v} value={v}>
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
            <Select
              label="Currency"
              value={input.currency}
              onChange={(v) => {
                update('currency', v as CurrencyCode);
                localStorage.setItem('duc-paint-currency', v);
              }}
            >
              {currencies.map(([c, s]) => (
                <option key={c} value={c}>
                  {c} ({s})
                </option>
              ))}
            </Select>
          </div>
        </Group>
        <Group title="Optional surfaces & materials">
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle
              label="Paint doors"
              checked={input.paintDoors}
              onChange={(v) => update('paintDoors', v)}
            />
            <Toggle
              label="Trim / baseboards"
              checked={input.paintTrim}
              onChange={(v) => update('paintTrim', v)}
            />
            <Toggle
              label="Primer"
              checked={input.usePrimer}
              onChange={(v) => update('usePrimer', v)}
            />
          </div>
          {input.paintDoors && (
            <div className="mt-2 grid grid-cols-2 gap-2 @2xl/paint:grid-cols-5">
              <NumberField
                label="Door quantity"
                value={input.paintedDoorQuantity}
                min={1}
                step={1}
                error={err('paintedDoorQuantity')}
                onChange={(e) => update('paintedDoorQuantity', num(e))}
              />
              <Dimension
                label="Door width"
                value={input.paintedDoorWidth}
                system={system}
                error={err('paintedDoorWidth')}
                onChange={(v) => update('paintedDoorWidth', v)}
              />
              <Dimension
                label="Door height"
                value={input.paintedDoorHeight}
                system={system}
                error={err('paintedDoorHeight')}
                onChange={(v) => update('paintedDoorHeight', v)}
              />
              <Select
                label="Sides painted"
                value={String(input.paintedDoorSides)}
                onChange={(v) => update('paintedDoorSides', Number(v) as 1 | 2)}
              >
                <option value="1">One side</option>
                <option value="2">Both sides</option>
              </Select>
              <NumberField
                label="Door coats"
                value={input.paintedDoorCoats}
                min={1}
                max={10}
                step={1}
                error={err('paintedDoorCoats')}
                onChange={(e) => update('paintedDoorCoats', num(e))}
              />
            </div>
          )}
          {input.paintTrim && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Dimension
                label="Trim length"
                value={input.trimLength}
                system={system}
                error={err('trimLength')}
                onChange={(v) => update('trimLength', v)}
              />
              <Dimension
                label="Trim width"
                value={input.trimWidth}
                system={system}
                error={err('trimWidth')}
                onChange={(v) => update('trimWidth', v)}
              />
              <NumberField
                label="Trim coats"
                value={input.trimCoats}
                min={1}
                max={10}
                step={1}
                error={err('trimCoats')}
                onChange={(e) => update('trimCoats', num(e))}
              />
            </div>
          )}
          {input.usePrimer && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumberField
                label="Primer coats"
                value={input.primerCoats}
                min={1}
                max={5}
                step={1}
                error={err('primerCoats')}
                onChange={(e) => update('primerCoats', num(e))}
              />
              <NumberField
                label="Primer coverage"
                value={input.primerCoverageSquareFeetPerGallon}
                unit={system === 'imperial' ? 'sq ft/gal' : 'sq m/L'}
                error={err('primerCoverageSquareFeetPerGallon')}
                onChange={(e) => update('primerCoverageSquareFeetPerGallon', num(e))}
              />
            </div>
          )}
        </Group>
        <details className="group self-start rounded-control border border-line bg-surface">
          <summary className="flex min-h-10 cursor-pointer items-center justify-between px-3 text-xs font-bold marker:content-none">
            Paint pricing (optional)
            <ChevronDown className="group-open:rotate-180" size={15} />
          </summary>
          <div className="grid grid-cols-2 gap-2 border-t border-line p-2.5 @2xl/paint:grid-cols-4">
            <OptionalNumber
              label="Quart price"
              value={input.pricePerQuart}
              error={err('pricePerQuart')}
              onChange={(e) => update('pricePerQuart', optional(e))}
            />
            <OptionalNumber
              label="1 gal price"
              value={input.pricePerGallon}
              error={err('pricePerGallon')}
              onChange={(e) => update('pricePerGallon', optional(e))}
            />
            <OptionalNumber
              label="5 gal price"
              value={input.pricePerFiveGallons}
              error={err('pricePerFiveGallons')}
              onChange={(e) => update('pricePerFiveGallons', optional(e))}
            />
            <OptionalNumber
              label="Primer / gal"
              value={input.primerPricePerGallon}
              error={err('primerPricePerGallon')}
              onChange={(e) => update('primerPricePerGallon', optional(e))}
            />
          </div>
        </details>
        <div className="mt-3 grid grid-cols-[1fr_minmax(7rem,.42fr)] gap-2">
          <button
            onClick={calculate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand px-4 text-sm font-bold text-on-brand hover:bg-brand-strong"
          >
            Calculate <Calculator size={16} />
          </button>
          <button
            onClick={clear}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-panel text-sm font-bold hover:bg-panel-muted"
          >
            <RotateCcw size={15} /> Clear
          </button>
        </div>
        <p className="mt-2 min-h-4 text-center text-xs text-ink-soft" aria-live="polite">
          {status}
        </p>
      </section>
      {calc && rec && submitted && (
        <section
          className="rounded-card border border-line bg-panel p-3 shadow-card sm:p-4 xl:sticky xl:top-20"
          aria-label="Paint estimate results"
        >
          <p className="text-[.68rem] font-bold uppercase text-brand">Your paint estimate</p>
          <div className="mt-2 rounded-control border border-brand/35 bg-brand-soft p-4 text-center">
            <p className="text-2xl font-extrabold text-brand">{calc.wall.purchase.display}</p>
            <p className="mt-1 text-xs text-ink-soft">Suggested wall-paint purchase</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric
              label="Required"
              value={`${fmt(calc.wall.requiredGallons)} gal`}
              detail={`${fmt(gallonsToLiters(calc.wall.requiredGallons))} L`}
            />
            <Metric
              label="Net wall area"
              value={`${fmt(calc.netWallAreaSquareFeet)} sq ft`}
              detail={`${fmt(squareFeetToSquareMeters(calc.netWallAreaSquareFeet))} sq m`}
            />
          </div>
          <ResultDetails title="Area breakdown">
            <Row label="Gross wall area" value={`${fmt(calc.grossWallAreaSquareFeet)} sq ft`} />
            <Row label="Door openings" value={`- ${fmt(calc.doorOpeningAreaSquareFeet)} sq ft`} />
            <Row
              label="Window openings"
              value={`- ${fmt(calc.windowOpeningAreaSquareFeet)} sq ft`}
            />
            <Row label="Net wall area" value={`${fmt(calc.netWallAreaSquareFeet)} sq ft`} />
          </ResultDetails>
          <ResultDetails title="Wall paint">
            <Row label="Base requirement" value={`${fmt(calc.wall.baseGallons)} gal`} />
            <Row
              label={`Allowance (${submitted.input.allowancePercent}%)`}
              value={`+ ${fmt(calc.wall.allowanceGallons)} gal`}
            />
            <Row
              label="Purchased volume"
              value={`${fmt(calc.wall.purchase.purchasedGallons)} gal`}
            />
            <Row
              label="Estimated leftover"
              value={`${fmt(calc.wall.purchase.leftoverGallons)} gal`}
            />
          </ResultDetails>
          {calc.ceiling && <RequirementDetails title="Ceiling" item={calc.ceiling} />}{' '}
          {calc.doors && <RequirementDetails title="Painted doors" item={calc.doors} />}{' '}
          {calc.trim && <RequirementDetails title="Trim / baseboards" item={calc.trim} />}{' '}
          {calc.primer && <RequirementDetails title="Primer" item={calc.primer} />}{' '}
          {calc.estimatedTotalCost !== undefined && (
            <div className="mt-2 flex justify-between rounded-control bg-panel-muted p-3 text-sm font-bold">
              <span>Estimated cost</span>
              <span className="text-brand">
                {formatMoney(calc.estimatedTotalCost, submitted.input.currency, undefined, 2)}
              </span>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              onClick={copy}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line text-xs font-bold hover:bg-panel-muted"
            >
              <Copy size={14} aria-hidden="true" /> Copy
            </button>
            <button
              onClick={share}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line text-xs font-bold hover:bg-panel-muted"
            >
              <Share2 size={14} aria-hidden="true" /> Share
            </button>
            <button
              onClick={print}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line text-xs font-bold hover:bg-panel-muted"
            >
              <Printer size={14} aria-hidden="true" /> Print
            </button>
            <button
              onClick={download}
              disabled={pdf}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line text-xs font-bold hover:bg-panel-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={14} aria-hidden="true" /> {pdf ? 'Preparing...' : 'PDF'}
            </button>
          </div>
          {rec.warnings.map((w) => (
            <p key={w} className="mt-2 text-xs leading-4 text-ink-soft">
              {w}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-3 border-t border-line pt-3">
      <legend className="mb-2 text-[.68rem] font-extrabold uppercase tracking-wide text-brand">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
function Select({
  label,
  value,
  onChange = () => {},
  children,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[.7rem] font-bold">
      {label}
      <span className="relative">
        <select
          className={`${control()} appearance-none pr-7`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft"
          size={14}
        />
      </span>
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  error,
  unit,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
}) {
  const errorId = useId();
  return (
    <label className="grid min-w-0 gap-1 text-[.7rem] font-bold">
      {label}
      <span className="relative">
        <input
          type="number"
          inputMode="decimal"
          onWheel={preserveNumberOnWheel}
          min={min}
          max={max}
          step={step ?? 'any'}
          value={Number.isFinite(value) ? value : ''}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${control(!!error)} ${unit ? 'pr-16' : ''}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[.65rem] text-ink-soft">
            {unit}
          </span>
        )}
      </span>
      {error && (
        <span id={errorId} className="text-[.65rem] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
function OptionalNumber(p: Omit<Parameters<typeof NumberField>[0], 'value'> & { value?: number }) {
  return <NumberField {...p} value={p.value ?? Number.NaN} />;
}
function Dimension({
  label,
  value,
  system,
  onChange,
  error,
  accessibleLabel,
}: {
  label: string;
  value: DimensionInput;
  system: MeasurementSystem;
  onChange: (v: DimensionInput) => void;
  error?: string;
  accessibleLabel?: string;
}) {
  const errorId = useId();
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-[.7rem] font-bold">{label}</span>
      <div className="grid grid-cols-[1fr_3.7rem] gap-1">
        <input
          aria-label={accessibleLabel ?? label}
          type="number"
          inputMode="decimal"
          step="any"
          onWheel={preserveNumberOnWheel}
          value={Number.isFinite(value.value) ? value.value : ''}
          onChange={(event) => onChange({ ...value, value: num(event) })}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={control(Boolean(error))}
        />
        <select
          aria-label={`${accessibleLabel ?? label} unit`}
          className={control()}
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value as LengthUnit })}
        >
          {units(system).map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      {error && (
        <span id={errorId} className="text-[.65rem] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
function Opening({
  itemLabel,
  quantityLabel,
  value,
  system,
  onChange,
  error,
}: {
  itemLabel: string;
  quantityLabel: string;
  value: PaintInput['doorOpenings'];
  system: MeasurementSystem;
  onChange: (v: PaintInput['doorOpenings']) => void;
  error?: string;
}) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-2 @2xl/paint:grid-cols-3">
      <div className="col-span-2 @2xl/paint:col-span-1">
        <NumberField
          label={quantityLabel}
          value={value.quantity}
          min={0}
          step={1}
          error={error}
          onChange={(e) => onChange({ ...value, quantity: num(e) })}
        />
      </div>
      <Dimension
        label="Width"
        accessibleLabel={`${itemLabel} width`}
        value={value.width}
        system={system}
        onChange={(width) => onChange({ ...value, width })}
      />
      <Dimension
        label="Height"
        accessibleLabel={`${itemLabel} height`}
        value={value.height}
        system={system}
        onChange={(height) => onChange({ ...value, height })}
      />
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 text-xs font-bold">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-brand"
      />
    </label>
  );
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-control border border-line p-3">
      <span className="text-[.65rem] text-ink-soft">{label}</span>
      <strong className="block text-lg text-brand">{value}</strong>
      <span className="text-[.65rem] text-ink-soft">{detail}</span>
    </div>
  );
}
function ResultDetails({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="mt-2 rounded-control border border-line" open>
      <summary className="cursor-pointer px-3 py-2 text-xs font-bold">{title}</summary>
      <div className="border-t border-line px-3">{children}</div>
    </details>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-line py-2 text-xs first:border-0">
      <span className="text-ink-soft">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function RequirementDetails({
  title,
  item,
}: {
  title: string;
  item: { requiredGallons: number; purchase: { display: string } };
}) {
  return (
    <ResultDetails title={title}>
      <Row label="Required" value={`${fmt(item.requiredGallons)} gal`} />
      <Row label="Suggested purchase" value={item.purchase.display} />
    </ResultDetails>
  );
}
