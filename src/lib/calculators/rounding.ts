export function roundUpToIncrement(value: number, increment: number): number {
  const scaledValue = value / increment;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaledValue)) * 10;
  const rounded = Math.ceil(scaledValue - tolerance) * increment;
  const decimalPlaces = increment.toString().split('.')[1]?.length ?? 0;
  return Number(rounded.toFixed(decimalPlaces));
}

export function requiredWholeUnits(requiredAmount: number, unitYield: number): number {
  const exactCount = requiredAmount / unitYield;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(exactCount)) * 10;
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
