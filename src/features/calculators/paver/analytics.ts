import type { CalculatorEventParameters } from '../../../lib/analytics/calculatorAnalytics';
import type { PaverInput } from './types';

export function paverAnalyticsParameters(input: PaverInput): CalculatorEventParameters {
  return {
    calculator_id: 'paver',
    calculator_name: 'Paver Calculator',
    project_type: input.projectType,
    unit_system: input.measurementSystem,
  };
}
