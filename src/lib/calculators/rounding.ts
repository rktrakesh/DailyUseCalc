const MAX_INCREMENT_NOISE = Math.sqrt(Number.EPSILON);
export const MAX_PURCHASE_QUOTIENT = 10_000_000;
export const MAX_PURCHASE_DECIMAL_PLACES = 100;

function incrementDecimalPlaces(increment: number): number {
  const [coefficient, exponentText] = Math.abs(increment).toExponential().split('e');
  const coefficientDecimals = coefficient.split('.')[1]?.length ?? 0;
  return Math.max(0, coefficientDecimals - Number(exponentText));
}

export function isSupportedPurchaseUnit(unitYield: number): boolean {
  return (
    Number.isFinite(unitYield) &&
    unitYield > 0 &&
    incrementDecimalPlaces(unitYield) <= MAX_PURCHASE_DECIMAL_PLACES
  );
}

export function isSupportedPurchaseQuotient(requiredAmount: number, unitYield: number): boolean {
  return (
    Number.isFinite(requiredAmount) &&
    requiredAmount >= 0 &&
    isSupportedPurchaseUnit(unitYield) &&
    requiredAmount / unitYield <= MAX_PURCHASE_QUOTIENT
  );
}

function assertSupportedPurchaseQuotient(requiredAmount: number, unitYield: number) {
  if (!Number.isFinite(requiredAmount) || requiredAmount < 0)
    throw new RangeError('Required purchasing amount must be finite and nonnegative.');
  if (!Number.isFinite(unitYield) || unitYield <= 0)
    throw new RangeError('Purchasing unit yield or increment must be finite and positive.');
  if (!isSupportedPurchaseUnit(unitYield))
    throw new RangeError('Purchasing unit yield or increment exceeds supported decimal precision.');
  if (requiredAmount / unitYield > MAX_PURCHASE_QUOTIENT)
    throw new RangeError('Purchasing quantity exceeds the supported numerical domain.');
}

export function roundUpToIncrement(value: number, increment: number): number {
  assertSupportedPurchaseQuotient(value, increment);
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
  assertSupportedPurchaseQuotient(requiredAmount, unitYield);
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

export function normalizeNumericalLeftover(
  purchased: number,
  required: number,
  purchaseResolution = 1,
): number {
  const leftover = purchased - required;
  const tolerance = Math.min(
    numericalTolerance(purchased, required),
    Math.abs(purchaseResolution) * MAX_INCREMENT_NOISE,
  );
  return leftover < 0 && Math.abs(leftover) <= tolerance ? 0 : leftover;
}
