import { toFeet } from '../../../lib/units/measurements';
import { PAINT_CONTAINERS, SQUARE_FEET_PER_SQUARE_METER, US_GALLON_LITERS } from './constants';
import type {
  PaintCalculation,
  PaintInput,
  PaintRequirement,
  PurchaseRecommendation,
} from './types';

export function recommendPaintPurchase(requiredGallons: number): PurchaseRecommendation {
  if (requiredGallons <= 0)
    return { containers: [], purchasedGallons: 0, leftoverGallons: 0, display: 'None' };
  let best: { counts: number[]; volume: number; count: number } | undefined;
  const maxFive = Math.ceil(requiredGallons / 5) + 1;
  for (let five = 0; five <= maxFive; five++)
    for (let one = 0; one <= 5; one++)
      for (let quart = 0; quart <= 4; quart++) {
        const counts = [five, one, quart];
        const volume = five * 5 + one + quart * 0.25;
        if (volume + 1e-10 < requiredGallons) continue;
        const count = five + one + quart;
        if (
          !best ||
          volume < best.volume - 1e-10 ||
          (Math.abs(volume - best.volume) < 1e-10 && count < best.count)
        )
          best = { counts, volume, count };
      }
  const containers = PAINT_CONTAINERS.map((item, index) => ({
    ...item,
    count: best!.counts[index],
  })).filter((x) => x.count > 0);
  return {
    containers,
    purchasedGallons: best!.volume,
    leftoverGallons: best!.volume - requiredGallons,
    display: containers.map((x) => `${x.count} x ${x.label}`).join(' + '),
  };
}
function requirement(
  areaSquareFeet: number,
  coats: number,
  coverage: number,
  allowancePercent: number,
): PaintRequirement {
  const baseGallons = (areaSquareFeet * coats) / coverage;
  const allowanceGallons = (baseGallons * allowancePercent) / 100;
  const requiredGallons = baseGallons + allowanceGallons;
  return {
    areaSquareFeet,
    coats,
    baseGallons,
    allowanceGallons,
    requiredGallons,
    purchase: recommendPaintPurchase(requiredGallons),
  };
}
export function calculatePaint(input: PaintInput): PaintCalculation {
  const finishCoverage =
    input.measurementSystem === 'metric'
      ? input.coverageSquareFeetPerGallon * SQUARE_FEET_PER_SQUARE_METER * US_GALLON_LITERS
      : input.coverageSquareFeetPerGallon;
  const primerCoverage =
    input.measurementSystem === 'metric'
      ? input.primerCoverageSquareFeetPerGallon * SQUARE_FEET_PER_SQUARE_METER * US_GALLON_LITERS
      : input.primerCoverageSquareFeetPerGallon;
  const roomLength = toFeet(input.length.value, input.length.unit),
    roomWidth = toFeet(input.width.value, input.width.unit),
    height = toFeet(input.wallHeight.value, input.wallHeight.unit);
  const grossWallAreaSquareFeet = 2 * (roomLength + roomWidth) * height * input.roomQuantity;
  const doorOpeningAreaSquareFeet =
    input.doorOpenings.quantity *
    toFeet(input.doorOpenings.width.value, input.doorOpenings.width.unit) *
    toFeet(input.doorOpenings.height.value, input.doorOpenings.height.unit);
  const windowOpeningAreaSquareFeet =
    input.windowOpenings.quantity *
    toFeet(input.windowOpenings.width.value, input.windowOpenings.width.unit) *
    toFeet(input.windowOpenings.height.value, input.windowOpenings.height.unit);
  const netWallAreaSquareFeet = Math.max(
    0,
    grossWallAreaSquareFeet - doorOpeningAreaSquareFeet - windowOpeningAreaSquareFeet,
  );
  const ceilingAreaSquareFeet = input.includeCeiling
    ? roomLength * roomWidth * input.roomQuantity
    : 0;
  const paintedDoorAreaSquareFeet = input.paintDoors
    ? input.paintedDoorQuantity *
      toFeet(input.paintedDoorWidth.value, input.paintedDoorWidth.unit) *
      toFeet(input.paintedDoorHeight.value, input.paintedDoorHeight.unit) *
      input.paintedDoorSides
    : 0;
  const trimAreaSquareFeet = input.paintTrim
    ? toFeet(input.trimLength.value, input.trimLength.unit) *
      toFeet(input.trimWidth.value, input.trimWidth.unit)
    : 0;
  const wall = requirement(
    netWallAreaSquareFeet,
    input.coats,
    finishCoverage,
    input.allowancePercent,
  );
  const ceiling = input.includeCeiling
    ? requirement(ceilingAreaSquareFeet, input.coats, finishCoverage, input.allowancePercent)
    : undefined;
  const doors = input.paintDoors
    ? requirement(
        paintedDoorAreaSquareFeet,
        input.paintedDoorCoats,
        finishCoverage,
        input.allowancePercent,
      )
    : undefined;
  const trim = input.paintTrim
    ? requirement(trimAreaSquareFeet, input.trimCoats, finishCoverage, input.allowancePercent)
    : undefined;
  const primerArea =
    netWallAreaSquareFeet + ceilingAreaSquareFeet + paintedDoorAreaSquareFeet + trimAreaSquareFeet;
  const primer = input.usePrimer
    ? requirement(primerArea, input.primerCoats, primerCoverage, input.allowancePercent)
    : undefined;
  const finish = [wall, ceiling, doors, trim].filter(Boolean) as PaintRequirement[];
  const totalFinishGallons = finish.reduce((sum, item) => sum + item.requiredGallons, 0);
  const prices = [input.pricePerFiveGallons, input.pricePerGallon, input.pricePerQuart];
  const priced = (req: PaintRequirement) =>
    req.purchase.containers.every(
      (c) =>
        prices[PAINT_CONTAINERS.findIndex((p) => p.sizeGallons === c.sizeGallons)] !== undefined,
    )
      ? req.purchase.containers.reduce(
          (sum, c) =>
            sum +
            c.count * prices[PAINT_CONTAINERS.findIndex((p) => p.sizeGallons === c.sizeGallons)]!,
          0,
        )
      : undefined;
  const finishCosts = finish.map(priced);
  const estimatedFinishCost = finishCosts.every((x) => x !== undefined)
    ? finishCosts.reduce((a, b) => a + b!, 0)
    : undefined;
  const estimatedPrimerCost =
    primer && input.primerPricePerGallon !== undefined
      ? Math.ceil(primer.requiredGallons) * input.primerPricePerGallon
      : undefined;
  return {
    grossWallAreaSquareFeet,
    doorOpeningAreaSquareFeet,
    windowOpeningAreaSquareFeet,
    netWallAreaSquareFeet,
    ceilingAreaSquareFeet,
    paintedDoorAreaSquareFeet,
    trimAreaSquareFeet,
    wall,
    ceiling,
    doors,
    trim,
    primer,
    totalFinishGallons,
    totalFinishLiters: totalFinishGallons * US_GALLON_LITERS,
    estimatedFinishCost,
    estimatedPrimerCost,
    estimatedTotalCost:
      estimatedFinishCost !== undefined
        ? estimatedFinishCost + (estimatedPrimerCost ?? 0)
        : undefined,
  };
}
export const squareFeetToSquareMeters = (value: number) => value / SQUARE_FEET_PER_SQUARE_METER;
export const gallonsToLiters = (value: number) => value * US_GALLON_LITERS;
