import type { CalculatorEventParameters } from '../../../lib/analytics/calculatorAnalytics';
import type { GravelInput, MeasurementSystem } from './types';

export function gravelAnalyticsParameters(
  input: GravelInput,
  system: MeasurementSystem,
): CalculatorEventParameters {
  return {
    calculator_id: 'gravel',
    calculator_name: 'Gravel Calculator',
    project_type: input.projectType,
    unit_system: system,
  };
}

export function gravelSubmittedAnalyticsParameters(submitted: {
  input: GravelInput;
  system: MeasurementSystem;
}): CalculatorEventParameters {
  return gravelAnalyticsParameters(submitted.input, submitted.system);
}
