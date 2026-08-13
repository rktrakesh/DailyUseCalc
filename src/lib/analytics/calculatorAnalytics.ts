export type CalculatorEventName =
  | 'calculator_started'
  | 'calculator_calculate'
  | 'calculator_clear'
  | 'calculator_copy'
  | 'calculator_share'
  | 'calculator_print'
  | 'calculator_pdf'
  | 'calculator_guide';

export interface CalculatorEventParameters {
  calculator_id: string;
  calculator_name: string;
  project_type?: string;
  unit_system?: 'imperial' | 'metric';
  share_method?: 'native' | 'clipboard_fallback';
}

type Gtag = (
  command: 'event',
  eventName: CalculatorEventName,
  parameters: CalculatorEventParameters,
) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export function trackCalculatorEvent(
  eventName: CalculatorEventName,
  parameters: CalculatorEventParameters,
) {
  try {
    if (typeof window === 'undefined' || window.location.hostname !== 'dailyusecalc.com') return;
    window.gtag?.('event', eventName, parameters);
  } catch {
    // Analytics must never interrupt a calculator action.
  }
}

export function createCalculatorStartedTracker() {
  let started = false;
  return (parameters: CalculatorEventParameters) => {
    if (started) return;
    started = true;
    trackCalculatorEvent('calculator_started', parameters);
  };
}

export function trackSuccessfulCalculatorCalculation(
  validationIssues: readonly unknown[],
  parameters: CalculatorEventParameters,
) {
  if (validationIssues.length > 0) return false;
  trackCalculatorEvent('calculator_calculate', parameters);
  return true;
}
