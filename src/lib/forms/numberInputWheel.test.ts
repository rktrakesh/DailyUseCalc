import { afterEach, describe, expect, it, vi } from 'vitest';
import { preserveNumberInputOnWheel } from './numberInputWheel';

describe('preserveNumberInputOnWheel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('cancels numeric stepping and forwards the wheel delta without changing the input', () => {
    const scrollBy = vi.fn();
    vi.stubGlobal('window', { scrollBy });
    const preventDefault = vi.fn();
    const input = { readOnly: false, value: '12' };

    preserveNumberInputOnWheel({ deltaX: 0, deltaY: 120, preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(scrollBy).toHaveBeenCalledWith({ left: 0, top: 120, behavior: 'auto' });
    expect(input).toEqual({ readOnly: false, value: '12' });
  });
});
