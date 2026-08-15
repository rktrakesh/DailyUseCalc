const MAX_INCREMENT_NOISE = Math.sqrt(Number.EPSILON);

function incrementDecimalPlaces(increment: number): number {
  const [coefficient, exponentText] = Math.abs(increment).toExponential().split('e');
  const coefficientDecimals = coefficient.split('.')[1]?.length ?? 0;
  return Math.max(0, coefficientDecimals - Number(exponentText));
}

export function roundUpToIncrement(value: number, increment: number): number {
  const scaledValue = value / increment;
  // The scale-aware term absorbs ordinary arithmetic noise. Capping it to a
  // tiny fraction of one purchasing unit prevents coarse floating-point
  // spacing at extreme quotients from treating a real excess as a boundary.
  const tolerance = Math.min(
    Number.EPSILON * Math.max(1, Math.abs(scaledValue)) * 10,
    MAX_INCREMENT_NOISE,
  );
  const rounded = Math.ceil(scaledValue - tolerance) * increment;
  const decimalPlaces = incrementDecimalPlaces(increment);
  return Number(rounded.toFixed(decimalPlaces));
}

export function requiredWholeUnits(requiredAmount: number, unitYield: number): number {
  const exactCount = requiredAmount / unitYield;
  const tolerance = Math.min(
    Number.EPSILON * Math.max(1, Math.abs(exactCount)) * 10,
    MAX_INCREMENT_NOISE,
  );
  return Math.ceil(exactCount - tolerance);
}

export function numericalTolerance(...values: number[]): number {
  return Number.EPSILON * Math.max(1, ...values.map(Math.abs)) * 10;
}

export function normalizeNumericalLeftover(purchased: number, required: number): number {
  const leftover = purchased - required;
  return leftover < 0 && Math.abs(leftover) <= numericalTolerance(purchased, required)
    ? 0
    : leftover;
}
