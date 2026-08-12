import type { ConcreteBagWeightUnit, ConcreteBagYieldUnit } from './types';

export const LITERS_PER_CUBIC_FOOT = 28.316846592;
const POUNDS_PER_KILOGRAM = 2.2046226218;

export function convertBagWeight(
  value: number | undefined,
  from: ConcreteBagWeightUnit,
  to: ConcreteBagWeightUnit,
) {
  if (value === undefined || from === to) return value;
  return from === 'lb' ? value / POUNDS_PER_KILOGRAM : value * POUNDS_PER_KILOGRAM;
}

export function bagYieldFromCubicFeet(cubicFeet: number | undefined, unit: ConcreteBagYieldUnit) {
  if (cubicFeet === undefined || unit === 'ft³') return cubicFeet;
  return cubicFeet * LITERS_PER_CUBIC_FOOT;
}

export function bagYieldToCubicFeet(value: number | undefined, unit: ConcreteBagYieldUnit) {
  if (value === undefined || unit === 'ft³') return value;
  return value / LITERS_PER_CUBIC_FOOT;
}

export function formatBagYieldCubicFeet(value: number) {
  return Number(value.toFixed(2)) === value ? value.toFixed(2) : value.toFixed(3);
}

export function presetBagYieldAssumption(cubicFeet: number) {
  const liters = cubicFeet * LITERS_PER_CUBIC_FOOT;
  return `Typical yield: ${formatBagYieldCubicFeet(cubicFeet)} ft³ (${liters.toFixed(1)} L) per bag · Check your product bag for exact yield.`;
}

export function customBagYieldAssumption(
  cubicFeet: number | undefined,
  unit: ConcreteBagYieldUnit,
) {
  if (cubicFeet === undefined || !Number.isFinite(cubicFeet) || cubicFeet <= 0) return;
  const displayValue = bagYieldFromCubicFeet(cubicFeet, unit)!;
  const formatted =
    unit === 'ft³'
      ? formatBagYieldCubicFeet(displayValue)
      : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(displayValue);
  return `Bag count uses your custom yield of ${formatted} ${unit} per bag.`;
}

export function concreteBagSizeLabel({
  presetLabel,
  customWeight,
  customWeightUnit,
}: {
  presetLabel: string;
  customWeight?: number;
  customWeightUnit: ConcreteBagWeightUnit;
}) {
  if (presetLabel !== 'Custom') return presetLabel;
  if (customWeight === undefined || !Number.isFinite(customWeight) || customWeight <= 0) return;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(customWeight)} ${customWeightUnit}`;
}
