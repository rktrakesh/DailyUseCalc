import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateGravel, recommendGravel } from '.';
import { gravelSubmittedAnalyticsParameters } from './analytics';
import {
  COPY_FEEDBACK_DURATION_MS,
  copyTextToClipboard,
  restartCopyFeedbackTimer,
} from './copyFeedback';
import { createDefaultGravelInput } from './formDefaults';
import { convertGravelMeasurementSystem } from './unitSystem';
import { gravelResultAnnouncement } from './resultAnnouncement';
import type { GravelInput } from './types';

function boundaryInput() {
  return {
    ...createDefaultGravelInput(),
    length: { value: 1, unit: 'ft' as const },
    width: { value: 1.5, unit: 'ft' as const },
    depth: { value: 21.6, unit: 'in' as const },
  };
}

describe('Gravel unit-system regression coverage', () => {
  it('preserves the 0.1 yd³ order boundary from Imperial to Metric', () => {
    const imperial = boundaryInput();
    const metric = { ...imperial, ...convertGravelMeasurementSystem(imperial, 'metric') };

    expect(metric.length.value).toBe(0.3048);
    expect(metric.width.value).toBe(0.4572);
    expect(metric.depth.value).toBe(54.864);
    expect(calculateGravel(imperial).recommendedOrderCubicYards).toBe(0.1);
    expect(calculateGravel(metric).recommendedOrderCubicYards).toBe(0.1);
  });

  it('preserves the equivalent boundary from Metric to Imperial', () => {
    const metric = {
      ...boundaryInput(),
      length: { value: 0.3048, unit: 'm' as const },
      width: { value: 0.4572, unit: 'm' as const },
      depth: { value: 54.864, unit: 'cm' as const },
    };
    const imperial = { ...metric, ...convertGravelMeasurementSystem(metric, 'imperial') };

    expect(calculateGravel(metric).recommendedOrderCubicYards).toBe(0.1);
    expect(calculateGravel(imperial).recommendedOrderCubicYards).toBe(0.1);
  });

  it('does not drift after repeated system round trips', () => {
    const original = boundaryInput();
    let current: GravelInput = original;
    for (let index = 0; index < 10; index += 1) {
      current = { ...current, ...convertGravelMeasurementSystem(current, 'metric') };
      current = { ...current, ...convertGravelMeasurementSystem(current, 'imperial') };
    }

    expect(current.length.value).toBeCloseTo(original.length.value, 12);
    expect(current.width.value).toBeCloseTo(original.width.value, 12);
    expect(current.depth.value).toBeCloseTo(original.depth.value, 12);
    expect(calculateGravel(current).recommendedOrderCubicYards).toBe(0.1);
  });

  it('does not add a shallow warning to an exact four-inch Metric equivalent', () => {
    const imperial = createDefaultGravelInput();
    const metric = { ...imperial, ...convertGravelMeasurementSystem(imperial, 'metric') };
    const warnings = recommendGravel(metric, calculateGravel(metric)).warnings;

    expect(metric.depth).toEqual({ value: 10.16, unit: 'cm' });
    expect(warnings.join(' ')).not.toContain('shallow for a driveway');
  });
});

describe('Gravel Copy feedback regressions', () => {
  afterEach(() => vi.useRealTimers());

  it('restarts the Copied timeout after each successful Copy', () => {
    vi.useFakeTimers();
    const elapsed = vi.fn();
    const timer = restartCopyFeedbackTimer(undefined, elapsed);
    vi.advanceTimersByTime(1_000);
    const restartedTimer = restartCopyFeedbackTimer(timer, elapsed);
    vi.advanceTimersByTime(1_000);
    expect(elapsed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(COPY_FEEDBACK_DURATION_MS - 1_000);
    expect(elapsed).toHaveBeenCalledTimes(1);
    expect(restartedTimer).toBeDefined();
  });

  it('does not report Copy success when clipboard writing rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard unavailable'));
    await expect(copyTextToClipboard(writeText, 'estimate')).resolves.toBe(false);
  });

  it('keeps the result live announcement concise and independent from Copy feedback', () => {
    const announcement = gravelResultAnnouncement(3.8);
    expect(announcement).toBe('Gravel estimate updated. Recommended order 3.8 cubic yards.');
    expect(announcement).not.toContain('Copy');
    expect(announcement).not.toContain('Copied');
  });
});

it('builds result-action analytics from submitted project and unit metadata', () => {
  const submitted = createDefaultGravelInput();
  const live = { ...submitted, projectType: 'walkway' as const };

  expect(
    gravelSubmittedAnalyticsParameters({ input: submitted, system: 'imperial' }),
  ).toMatchObject({
    project_type: 'driveway',
    unit_system: 'imperial',
  });
  expect(gravelSubmittedAnalyticsParameters({ input: live, system: 'metric' })).toMatchObject({
    project_type: 'walkway',
    unit_system: 'metric',
  });
});
