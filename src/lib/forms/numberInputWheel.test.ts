import { afterEach, describe, expect, it, vi } from 'vitest';
import { preserveNumberInputOnWheel } from './numberInputWheel';

describe('preserveNumberInputOnWheel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('cancels numeric stepping and forwards the wheel delta without changing the input', () => {
    const scrollBy = vi.fn();
    vi.stubGlobal('window', { scrollBy });
    const preventDefault = vi.fn();
    const input = { blur: vi.fn(), readOnly: false, value: '12' };

    preserveNumberInputOnWheel({
      currentTarget: input,
      deltaX: 0,
      deltaY: 120,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(scrollBy).toHaveBeenCalledWith({ left: 0, top: 120, behavior: 'auto' });
    expect(input.blur).not.toHaveBeenCalled();
    expect(input.readOnly).toBe(false);
    expect(input.value).toBe('12');

    input.value = '15';
    expect(input.value).toBe('15');
  });
});
