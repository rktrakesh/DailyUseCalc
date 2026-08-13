import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCalculatorStartedTracker,
  trackCalculatorEvent,
  trackSuccessfulCalculatorCalculation,
} from './calculatorAnalytics';

const originalWindow = globalThis.window;

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
});

function installWindow(gtag: (...args: unknown[]) => void, hostname = 'dailyusecalc.com') {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { hostname }, gtag },
  });
}

describe('calculator analytics', () => {
  it('dispatches a safe standardized GA4 event', () => {
    const gtag = vi.fn();
    installWindow(gtag);
    trackCalculatorEvent('calculator_calculate', {
      calculator_id: 'paint',
      calculator_name: 'Paint Calculator',
      project_type: 'room_walls',
      unit_system: 'imperial',
    });
    expect(gtag).toHaveBeenCalledWith('event', 'calculator_calculate', {
      calculator_id: 'paint',
      calculator_name: 'Paint Calculator',
      project_type: 'room_walls',
      unit_system: 'imperial',
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/length|width|price|cost|gallons|result/);
  });

  it('limits calculator_started to once per tracker instance', () => {
    const gtag = vi.fn();
    installWindow(gtag);
    const started = createCalculatorStartedTracker();
    const parameters = { calculator_id: 'gravel', calculator_name: 'Gravel Calculator' };
    started(parameters);
    started(parameters);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'calculator_started', parameters);
  });

  it('is inert off the canonical hostname and absorbs analytics failures', () => {
    const blocked = vi.fn();
    installWindow(blocked, 'localhost');
    expect(() =>
      trackCalculatorEvent('calculator_clear', {
        calculator_id: 'concrete',
        calculator_name: 'Concrete Calculator',
      }),
    ).not.toThrow();
    expect(blocked).not.toHaveBeenCalled();

    installWindow(() => {
      throw new Error('blocked');
    });
    expect(() =>
      trackCalculatorEvent('calculator_pdf', {
        calculator_id: 'concrete',
        calculator_name: 'Concrete Calculator',
      }),
    ).not.toThrow();
  });

  it('tracks successful calculations, allows recalculation, and skips failed validation', () => {
    const gtag = vi.fn();
    installWindow(gtag);
    const parameters = {
      calculator_id: 'concrete',
      calculator_name: 'Concrete Calculator',
      project_type: 'slab',
      unit_system: 'imperial' as const,
    };
    expect(trackSuccessfulCalculatorCalculation([{}], parameters)).toBe(false);
    expect(trackSuccessfulCalculatorCalculation([], parameters)).toBe(true);
    expect(trackSuccessfulCalculatorCalculation([], parameters)).toBe(true);
    expect(gtag).toHaveBeenCalledTimes(2);
  });
});
